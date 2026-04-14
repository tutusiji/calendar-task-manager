# 2026-04-15 计划功能更新部署说明

## 文档用途

这份文档用于说明 `2026-04-15` 这一版计划功能更新的部署流程。

包含内容：

- 如何在本地构建公司版镜像
- 如何将镜像导出为 `tar` 文件
- 如何把部署包带到公司内网
- 如何在内网服务器上完成部署
- 如何同步本次新增的数据库表和字段

## 先说明当前场景下最重要的结论

如果公司内网服务器上的项目已经跑了一段时间，并且数据库里已经有正式数据，那么：

- 不需要把你本地数据库里的数据迁移到公司内网
- 不建议直接整体替换公司内网数据库
- 本次最合适的做法是：保留内网现有数据，只补齐缺失的表、字段、索引和约束

也就是说，这次真正要同步的是“数据库结构”，不是“数据库数据”。

## 本次更新涉及的数据库变更

本次更新新增了两条 Prisma 迁移：

- `20260414103000_add_planning_feature`
- `20260415093000_add_planning_bucket_width`

这两条迁移会引入以下结构：

- 枚举 `PlanningScopeType`
- 表 `PlanningBoard`
- 表 `PlanningBucket`
- 表 `PlanningCard`
- 表 `PlanningCardItem`
- 表 `PlanningCardAssignee`
- 字段 `PlanningBucket.width`

## 关于你之前做过的“项目归档”功能

项目归档功能对应的数据库结构是：

- `Project.isArchived`
- `Project.archivedAt`
- 索引 `Project_isArchived_idx`

仓库里对应文件在这里：

- [prisma/schema.prisma](d:/CodeLab/calendar-task-manager/prisma/schema.prisma)
- [prisma/migrations/add_project_archive/migration.sql](d:/CodeLab/calendar-task-manager/prisma/migrations/add_project_archive/migration.sql)
- [database-add-project-archive.sql](d:/CodeLab/calendar-task-manager/database-add-project-archive.sql)

如果你看到我前面文档里只提到了 planning 的两条 SQL，那是因为那部分是在说明“本次计划功能新增的结构变更”，并不是在列出“历史上所有可能遗漏的数据库结构”。

如果你生成的是“当前公司数据库”到“当前仓库 schema”的差异 SQL，而里面没有看到归档字段，通常只有这几种可能：

- 公司数据库里其实已经有 `isArchived` 和 `archivedAt` 了，所以 diff 不会重复输出
- 你生成 diff 时连接的不是公司那套数据库
- 你生成 diff 时使用的不是当前这份最新 `prisma/schema.prisma`

你可以先在公司数据库里执行这段检查：

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Project'
  AND column_name IN ('isArchived', 'archivedAt')
ORDER BY column_name;
```

如果结果为空，说明归档字段确实还没同步过去。

再检查一下 Prisma 迁移记录里是否已经登记过归档迁移：

```sql
SELECT migration_name
FROM "_prisma_migrations"
WHERE migration_name = 'add_project_archive';
```

这里要注意一个很关键的情况：

- 如果归档字段已经在数据库里了
- 但是 `_prisma_migrations` 里没有 `add_project_archive`

那么后续直接执行 `prisma migrate deploy`，有可能会因为重复添加字段或索引而失败。

这种情况应该先把这条迁移标记为已应用：

```bash
pnpm exec prisma migrate resolve --applied add_project_archive
```

如果是在 Docker 容器里执行：

```bash
docker compose run --rm app npx prisma migrate resolve --applied add_project_archive
```

## 如果你希望只执行一个 SQL 文件

可以，已经给你合并好了：

- [database-sync-archive-and-planning.sql](d:/CodeLab/calendar-task-manager/database-sync-archive-and-planning.sql)

这份脚本已经合并了：

- 项目归档字段 `isArchived`、`archivedAt`
- 归档索引 `Project_isArchived_idx`
- planning 功能的全部表
- `PlanningBucket.width`

这份脚本适合你的当前场景：

- 公司内网数据库已经有历史数据
- 只补结构，不迁移数据
- 一次把归档功能和计划功能的结构补进去

执行方式：

```bash
docker cp /opt/calendar-task-manager/update-2026-04-15/database-sync-archive-and-planning.sql calendar-postgres:/tmp/database-sync-archive-and-planning.sql
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -f /tmp/database-sync-archive-and-planning.sql
```

但这里还有一个非常重要的后续动作：

如果你是手动执行这份 SQL，而不是用 `prisma migrate deploy`，建议把对应迁移同步标记为已应用，避免后续升级时 Prisma 再次尝试执行这些迁移：

```bash
docker compose run --rm app npx prisma migrate resolve --applied add_project_archive
docker compose run --rm app npx prisma migrate resolve --applied 20260414103000_add_planning_feature
docker compose run --rm app npx prisma migrate resolve --applied 20260415093000_add_planning_bucket_width
```

## 推荐镜像版本号

建议本次发布使用清晰的镜像标签，例如：

```text
calendar-task-manager:company-2026-04-15
```

## 一、本地构建并导出镜像

### 1.1 构建公司版镜像

在本地 Windows 机器执行：

```powershell
cd d:\CodeLab\calendar-task-manager

$Version = "company-2026-04-15"
$ReleaseDir = ".\release\2026-04-15-planning"

New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null

docker build --build-arg ENV_TYPE=company -t calendar-task-manager:$Version .
```

说明：

- `ENV_TYPE=company` 很重要，因为 `Dockerfile` 会在构建时读取 `.env.company`
- 如果你要打个人版镜像，把 `company` 改成 `personal` 即可

### 1.2 导出应用镜像

```powershell
docker save -o "$ReleaseDir\calendar-task-manager_company-2026-04-15.tar" calendar-task-manager:$Version
```

### 1.3 导出 PostgreSQL 镜像

如果公司内网服务器无法访问外网，建议连 PostgreSQL 镜像也一起导出：

```powershell
docker pull postgres:16-alpine
docker save -o "$ReleaseDir\postgres_16-alpine.tar" postgres:16-alpine
```

说明：

- 这个 PostgreSQL 镜像文件只是“数据库容器运行环境”
- 它不是数据库数据文件
- 它不包含你本地的业务数据
- 如果公司内网服务器已经有可用的 `postgres:16-alpine` 镜像，或者数据库容器本来就在跑，那么这个文件可以不带

### 1.4 准备随包带走的部署文件

把部署所需文件一并复制到发布目录：

```powershell
Copy-Item ".\docker-compose.yml" "$ReleaseDir\" -Force
Copy-Item ".\.env.example" "$ReleaseDir\" -Force

New-Item -ItemType Directory -Force -Path "$ReleaseDir\migrations" | Out-Null
Copy-Item ".\prisma\migrations\20260414103000_add_planning_feature\migration.sql" "$ReleaseDir\migrations\20260414103000_add_planning_feature.sql" -Force
Copy-Item ".\prisma\migrations\20260415093000_add_planning_bucket_width\migration.sql" "$ReleaseDir\migrations\20260415093000_add_planning_bucket_width.sql" -Force
```

建议最终部署包至少包含：

- `calendar-task-manager_company-2026-04-15.tar`
- `docker-compose.yml`
- `.env.example`
- `migrations/20260414103000_add_planning_feature.sql`
- `migrations/20260415093000_add_planning_bucket_width.sql`

如果内网服务器上还没有 PostgreSQL 镜像，再额外带上：

- `postgres_16-alpine.tar`

如需压缩：

```powershell
Compress-Archive -Path "$ReleaseDir\*" -DestinationPath ".\release\2026-04-15-planning.zip" -Force
```

注意：

- `tar` 镜像文件不需要手动解压
- 到服务器后直接执行 `docker load -i xxx.tar` 即可

## 二、将部署包带入公司内网

可以使用以下任一方式：

- U 盘
- 内网共享目录
- 通过跳板机使用 WinSCP 或 SCP

建议将部署包放到服务器目录：

```bash
/opt/calendar-task-manager/update-2026-04-15
```

## 三、在内网服务器上部署

下面默认服务器为 Linux，项目部署目录为：

```bash
/opt/calendar-task-manager
```

### 3.1 上传并解压部署包

如果你带过去的是 zip 包：

```bash
mkdir -p /opt/calendar-task-manager/update-2026-04-15
cd /opt/calendar-task-manager/update-2026-04-15
unzip 2026-04-15-planning.zip
```

如果你是直接复制原始文件，则只需要放到这个目录：

```bash
/opt/calendar-task-manager/update-2026-04-15
```

### 3.2 导入 Docker 镜像

```bash
cd /opt/calendar-task-manager/update-2026-04-15

docker load -i calendar-task-manager_company-2026-04-15.tar
```

如果服务器上没有 PostgreSQL 镜像，再额外执行：

```bash
docker load -i postgres_16-alpine.tar
```

导入后可检查镜像是否存在：

```bash
docker images | grep -E "calendar-task-manager|postgres"
```

### 3.3 先备份当前数据库

在执行任何迁移之前，先备份当前数据库：

```bash
mkdir -p /opt/calendar-task-manager/backups

docker exec calendar-postgres pg_dump -U postgres -d calendar_tasks > /opt/calendar-task-manager/backups/calendar_tasks_before_2026-04-15_planning.sql
```

### 3.4 更新 docker-compose.yml

当前仓库里的 `docker-compose.yml` 使用的是写死的镜像标签。
部署前要把镜像版本改成这次发布的新标签。

如果服务器上已经有一份定制过的 `docker-compose.yml`，不要整份覆盖。
只修改其中的镜像标签即可。

至少确认这两处改成：

```yaml
app:
  image: calendar-task-manager:company-2026-04-15

prisma-studio:
  image: calendar-task-manager:company-2026-04-15
```

说明：

- `prisma-studio` 在 `dev` profile 下，生产环境可选
- 如果你在内网服务器上不用 Prisma Studio，也可以保留同样的镜像标签，后续需要时再启用

### 3.5 准备运行环境的 .env 文件

如果服务器上已经有可用的 `.env`，直接保留，只检查关键配置是否正确。

如果还没有，则从模板创建：

```bash
cd /opt/calendar-task-manager
cp /opt/calendar-task-manager/update-2026-04-15/.env.example /opt/calendar-task-manager/.env.example
cp .env.example .env
```

至少确认这些值：

```dotenv
POSTGRES_PASSWORD=替换为真实数据库密码
DATABASE_URL=postgresql://postgres:替换为真实数据库密码@postgres:5432/calendar_tasks?schema=public
JWT_SECRET=替换为真实密钥
NODE_ENV=production
AVATAR_API_URL=http://你的内网头像服务地址
```

### 3.6 先启动 PostgreSQL

```bash
cd /opt/calendar-task-manager
docker compose up -d postgres
```

等待 PostgreSQL 就绪：

```bash
docker compose ps
docker logs calendar-postgres --tail 50
```

## 四、同步新增的数据库表和字段

### 4.1 优先推荐：直接执行 Prisma 正式迁移

等 PostgreSQL 启动后，执行：

```bash
cd /opt/calendar-task-manager
docker compose run --rm app npx prisma migrate deploy
```

这是最推荐的方式，因为它会自动执行：

- `20260414103000_add_planning_feature`
- `20260415093000_add_planning_bucket_width`

执行完成后，启动或刷新应用容器：

```bash
docker compose up -d app
```

如果 `app` 已经在运行，也可以执行：

```bash
docker compose up -d --no-deps app
```

适用前提：

- 服务器数据库中的 `_prisma_migrations` 记录基本可信
- 之前的结构更新大多是按 Prisma 迁移体系走的

如果满足这个前提，这个命令不只会补本次 planning 的两条迁移，也会补上所有“尚未执行”的历史迁移。

### 4.2 验证迁移结果

查看迁移记录：

```bash
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c "SELECT migration_name, finished_at FROM \"_prisma_migrations\" WHERE migration_name IN ('20260414103000_add_planning_feature', '20260415093000_add_planning_bucket_width') ORDER BY finished_at DESC;"
```

查看新表是否已存在：

```bash
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('PlanningBoard', 'PlanningBucket', 'PlanningCard', 'PlanningCardItem', 'PlanningCardAssignee') ORDER BY table_name;"
```

查看 `width` 字段是否已加入：

```bash
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'PlanningBucket' AND column_name = 'width';"
```

### 4.3 更适合你当前情况的方案：生成一份“只补结构”的差异 SQL

如果你怀疑公司内网数据库以前有些字段是手工加的，有些没加，或者 `_prisma_migrations` 记录已经不完全可信，那么最稳妥的方式不是直接整库替换，而是：

- 读取“公司内网当前数据库结构”
- 对比“当前仓库里的最新 Prisma schema”
- 自动生成一份只修改结构的 SQL
- 在内网数据库上执行这份 SQL

这样做的优点：

- 不迁移数据
- 不覆盖原有业务数据
- 只补缺失的表、字段、索引、约束
- 非常适合“系统已经在跑，但结构没完全跟上”的场景

在能连到内网数据库的机器上执行：

```bash
cd /opt/calendar-task-manager

export DATABASE_URL="postgresql://postgres:你的密码@127.0.0.1:5432/calendar_tasks?schema=public"

pnpm exec prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /opt/calendar-task-manager/update-2026-04-15/schema-sync-latest.sql
```

这条命令的意思是：

- `--from-url`：以当前线上数据库结构为起点
- `--to-schema-datamodel prisma/schema.prisma`：以当前仓库的最新 schema 为目标
- `--script`：输出一份可执行 SQL

生成后，先人工看一遍 SQL，再执行：

```bash
docker cp /opt/calendar-task-manager/update-2026-04-15/schema-sync-latest.sql calendar-postgres:/tmp/schema-sync-latest.sql
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -f /tmp/schema-sync-latest.sql
```

这个方案非常适合你现在说的场景：

- 公司服务器数据库已经有历史数据
- 数据不要迁移
- 但是以前缺的一些字段和表，这次想一并补齐

### 4.4 兜底方式：只手动执行本次 planning 的两条 SQL

只有在 `prisma migrate deploy` 无法正常执行时，才使用这个方式。

把 SQL 文件复制进 PostgreSQL 容器，并按顺序执行：

```bash
docker cp /opt/calendar-task-manager/update-2026-04-15/migrations/20260414103000_add_planning_feature.sql calendar-postgres:/tmp/20260414103000_add_planning_feature.sql
docker cp /opt/calendar-task-manager/update-2026-04-15/migrations/20260415093000_add_planning_bucket_width.sql calendar-postgres:/tmp/20260415093000_add_planning_bucket_width.sql

docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -f /tmp/20260414103000_add_planning_feature.sql
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -f /tmp/20260415093000_add_planning_bucket_width.sql
```

执行后，仍然要用上面的 SQL 检查表和字段是否已存在。

注意：

- 手动执行 SQL 只能完成结构变更，不能完全替代 Prisma 迁移记录
- 如果你使用了手动方式，建议在部署说明里额外记一笔，方便后续版本继续升级时排查
- 这两个 SQL 只覆盖本次 planning 功能的结构变更，不会自动补齐更早版本遗漏的所有历史字段

## 五、最终验证

应用启动后，执行以下检查：

```bash
docker compose ps
docker compose logs --tail 100 app
curl http://127.0.0.1:7049
```

然后在页面里验证计划功能：

- 进入顶部导航中的 `计划`
- 新建一个计划板
- 新建一个分类列
- 新建一个卡片
- 新建并编辑卡片事项
- 拉伸分类列宽度后刷新页面，看宽度是否保留
- 拖拽卡片和分类列，确认排序是否正常

## 六、回滚方案

如果上线后发现问题，可以按下面方式回滚：

### 6.1 回滚应用镜像

- 把 `docker-compose.yml` 中的镜像标签改回上一个版本
- 重新启动应用容器

### 6.2 恢复数据库备份

只有在必须整体撤回本次数据库变更时再执行：

```bash
cat /opt/calendar-task-manager/backups/calendar_tasks_before_2026-04-15_planning.sql | docker exec -i calendar-postgres psql -U postgres -d calendar_tasks
```

注意：

- 恢复前先停止应用
- 恢复数据库会覆盖备份之后产生的数据

## 快速检查清单

- [ ] 已在本地构建 `calendar-task-manager:company-2026-04-15`
- [ ] 已导出应用镜像 tar 包
- [ ] 如果内网无法联网且服务器没有现成 PostgreSQL 镜像，已导出 `postgres:16-alpine` 镜像 tar 包
- [ ] 已复制 `docker-compose.yml` 和 `.env.example`
- [ ] 已复制两条 planning 迁移 SQL 文件
- [ ] 已在内网服务器导入镜像
- [ ] 已备份当前 PostgreSQL 数据库
- [ ] 已更新 `docker-compose.yml` 中的镜像版本
- [ ] 已执行 `docker compose run --rm app npx prisma migrate deploy`
- [ ] 如果历史结构不确定，已改为生成并执行 `schema-sync-latest.sql`
- [ ] 已验证 planning 相关表和 `PlanningBucket.width`
- [ ] 已成功启动新版本应用

## 七、公司内网已有数据时的最简 5 步升级命令

适用前提：

- 公司服务器上的数据库已经有正式数据
- 本次不迁移数据，只补数据库结构
- 使用合并后的 SQL 文件：
  [database-sync-archive-and-planning.sql](d:/CodeLab/calendar-task-manager/database-sync-archive-and-planning.sql)

### 第 1 步：备份数据库

```bash
mkdir -p /opt/calendar-task-manager/backups
docker exec calendar-postgres pg_dump -U postgres -d calendar_tasks > /opt/calendar-task-manager/backups/calendar_tasks_before_2026-04-15_planning.sql
```

### 第 2 步：导入新应用镜像

```bash
docker load -i /opt/calendar-task-manager/update-2026-04-15/calendar-task-manager_company-2026-04-15.tar
```

### 第 3 步：执行合并后的结构同步 SQL

```bash
docker cp /opt/calendar-task-manager/update-2026-04-15/database-sync-archive-and-planning.sql calendar-postgres:/tmp/database-sync-archive-and-planning.sql
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -f /tmp/database-sync-archive-and-planning.sql
```

### 第 4 步：把相关迁移标记为已应用

```bash
cd /opt/calendar-task-manager
docker compose run --rm app npx prisma migrate resolve --applied add_project_archive
docker compose run --rm app npx prisma migrate resolve --applied 20260414103000_add_planning_feature
docker compose run --rm app npx prisma migrate resolve --applied 20260415093000_add_planning_bucket_width
```

### 第 5 步：启动或刷新应用

```bash
cd /opt/calendar-task-manager
docker compose up -d app
docker compose logs --tail 100 app
```

如果你只想要一句话版本，那就是：

- 备份数据库
- 导入新镜像
- 执行合并 SQL
- `resolve` 三条迁移
- 重启 `app`
