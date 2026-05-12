# 2026-05-12 内网离线升级实操：升级到 2026-05-07 镜像

## 适用场景

这份 runbook 适用于下面这个明确场景：

- 服务器是内网离线环境，不能访问外网
- 你已经把 `2026-05-07` 的应用镜像 tar 拷到了项目根目录，或者项目目录下某个可访问位置
- 你已经手动修改了 `docker-compose.yml`，让 `app.image` 指向新镜像标签
- 旧版本大概率是 `2026-04-15 planning` 版，数据库里已经有正式数据

如果你现在说的“0505”其实是想表达“0507”，那后面都以 `2026-05-07` 为准。

## 推荐路线

推荐优先走这条：

1. 备份数据库
2. `docker load` 导入 2026-05-07 镜像
3. 只启动或保留 `postgres`
4. 用新镜像执行 `prisma migrate deploy`
5. 启动新 `app`
6. 手动触发一次法定节假日接口，让节假日数据自动写入
7. 做功能验证

这是最省心的一条线，因为：

- 不需要外网
- 不需要重建整库
- 不需要自己手工一条条执行 Prisma 迁移 SQL

## 先确认两件事

### 1. `docker-compose.yml` 里的镜像标签

确认 `app` 服务的 `image:` 已经改成你实际导入的标签，例如：

```yaml
services:
  app:
    image: calendar-task-manager:company-2026-05-07
```

不要写成旧标签，比如：

- `calendar-task-manager:personal-2026-1-1`
- `calendar-task-manager:company-2026-04-15`

否则 `docker compose run app ...` 还是会去找旧镜像。

### 2. 本机是否已经有镜像

执行：

```bash
docker image ls | grep calendar-task-manager
docker image ls | grep postgres
```

如果没有看到目标镜像，就先导入。

## 一、导入镜像

假设你已经把文件放在项目根目录：

- `calendar-task-manager_company-2026-05-07.tar`

执行：

```bash
docker load -i ./calendar-task-manager_company-2026-05-07.tar
```

如果内网机上没有 PostgreSQL 基础镜像，而且当前数据库容器还没创建过，再额外导入：

```bash
docker load -i ./postgres_16-alpine.tar
```

导入后再检查：

```bash
docker image ls | grep calendar-task-manager
docker image ls | grep postgres
```

## 二、备份数据库

在真正升级前，先导出一份备份：

```bash
docker exec -t calendar-postgres pg_dump -U postgres -d calendar_tasks > calendar_tasks_backup_2026-05-12.sql
```

如果这条命令报容器不存在，先执行：

```bash
docker compose up -d postgres
```

## 三、确认数据库容器正常

```bash
docker compose up -d postgres
docker compose ps
docker compose logs --tail=50 postgres
```

确保：

- `calendar-postgres` 正常运行
- 没有启动失败

## 四、进入维护窗口并停掉旧应用

如果内网现在还在跑 `2026-04-15` 版本，而且已经有真实生产数据，建议在迁移前先进入维护窗口，只保留数据库，先停掉旧 `app`：

```bash
docker compose stop app
```

原因很简单：

- 避免旧版本应用在迁移期间继续写库
- 避免你一边改结构，一边还有在线请求进来
- 迁移成功后再启动新镜像，状态最干净

只要 `postgres` 保持运行即可，不需要先停数据库。

## 五、执行数据库迁移

### 推荐方式：直接跑 Prisma 迁移

这里不要先启动整个 `app`，先只用它来跑迁移：

```bash
docker compose run --rm --no-deps app npx prisma migrate deploy
```

这里用 `--no-deps` 的目的，是避免 Compose 因为处理依赖服务而额外做一些你不想要的动作。

正常情况下，这一步会：

- 启动一个临时的 `app` 容器
- 使用新镜像里的 `prisma/migrations/*/migration.sql`
- 按 `_prisma_migrations` 状态执行尚未应用的迁移
- 执行完后删掉这个临时容器

### 如果报 `P3018` / `TaskType already exists`

像下面这种错误：

```text
Applying migration `20251114212844_init`
ERROR: type "TaskType" already exists
```

基本可以直接判断为：

- 你的生产库里，历史表结构其实早就已经存在
- 但是 `_prisma_migrations` 记录不完整，或者和现在镜像里的迁移目录对不上
- Prisma 误以为最早那批迁移还没执行，于是尝试重新跑 `init`

这不是要你删库重来，而是要先把历史迁移状态补齐。

### 先检查 `_prisma_migrations`

先看当前库里已经记录了哪些迁移：

```bash
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c 'SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY migration_name;'
```

如果你看到：

- 表里记录很少
- 或者缺了早期初始化迁移
- 或者根本没有你当前镜像里大部分历史迁移

那就不要继续硬跑 `migrate deploy`，先补状态。

### 生产库常见修复方式：把历史迁移标记为已应用

对从 `2026-04-15` 一路演进上来的生产库，通常应该先把下面这些历史迁移补记到 `_prisma_migrations`：

```bash
for m in \
20251114212844_init \
20251114220612_add_username_field \
20251115035418_add_password_field \
20251115071949_add_creator_and_gender \
20251115074925_add_role_to_user \
20251115094036_add_isadmin_to_user \
20251115133624_add_task_permission \
20251115201512_add_organization_model \
20251115212303_add_notification_system \
20251118140218_add_task_creator_and_multiple_assignees \
20251118190313_add_invite_code_and_inviter \
20251118192501_add_invite_code_to_organization_member \
20251119131625_add_organization_invite \
20251119132818_add_deletion_notifications \
20251119142805_add_points_system \
20251125165512_add_task_color_and_progress \
20260414103000_add_planning_feature \
20260415093000_add_planning_bucket_width \
add_project_archive \
add_task_creator_and_multiple_assignees
do
  echo "== resolving $m =="
  docker compose run --rm --no-deps app npx prisma migrate resolve --applied "$m"
done
```

或者
```
docker compose run --rm --no-deps app npx prisma migrate resolve --applied 20251114212844_init
docker compose run --rm --no-deps app npx prisma migrate resolve --applied 20251114220612_add_username_field
docker compose run --rm --no-deps app npx prisma migrate resolve --applied 20251115035418_add_password_field
docker compose run --rm --no-deps app npx prisma migrate resolve --applied 20251115071949_add_creator_and_gender
docker compose run --rm --no-deps app npx prisma migrate resolve --applied 20251115074925_add_role_to_user
docker compose run --rm --no-deps app npx prisma migrate resolve --applied 20251115094036_add_isadmin_to_user
docker compose run --rm --no-deps app npx prisma migrate resolve --applied 20251115133624_add_task_permission
docker compose run --rm --no-deps app npx prisma migrate resolve --applied 20251115201512_add_organization_model
docker compose run --rm --no-deps app npx prisma migrate resolve --applied 20251115212303_add_notification_system
docker compose run --rm --no-deps app npx prisma migrate resolve --applied 20251118140218_add_task_creator_and_multiple_assignees
docker compose run --rm --no-deps app npx prisma migrate resolve --applied 20251118190313_add_invite_code_and_inviter
docker compose run --rm --no-deps app npx prisma migrate resolve --applied 20251118192501_add_invite_code_to_organization_member
docker compose run --rm --no-deps app npx prisma migrate resolve --applied 20251119131625_add_organization_invite
docker compose run --rm --no-deps app npx prisma migrate resolve --applied 20251119132818_add_deletion_notifications
docker compose run --rm --no-deps app npx prisma migrate resolve --applied 20251119142805_add_points_system
docker compose run --rm --no-deps app npx prisma migrate resolve --applied 20251125165512_add_task_color_and_progress
docker compose run --rm --no-deps app npx prisma migrate resolve --applied 20260414103000_add_planning_feature
docker compose run --rm --no-deps app npx prisma migrate resolve --applied 20260415093000_add_planning_bucket_width
docker compose run --rm --no-deps app npx prisma migrate resolve --applied add_project_archive
docker compose run --rm --no-deps app npx prisma migrate resolve --applied add_task_creator_and_multiple_assignees
```

说明：

- 这一步不会重新执行 SQL
- 它只是把这些迁移补记到 `_prisma_migrations`
- 如果某一条已经存在，按实际提示处理，继续补剩下的即可

### 补齐历史状态后，再重新执行 deploy

```bash
docker compose run --rm --no-deps app npx prisma migrate deploy
```

对于你这次 `2026-05-07` 升级，正常情况下，真正需要在数据库里新增执行的应该主要是下面 4 条：

- `20260426090000_add_team_project_sort_order`
- `20260426100000_project_member_archive_flags`
- `20260426123000_add_recurring_task_series`
- `20260426153000_add_public_holidays`

执行完后，再检查一次迁移表：

```bash
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c 'SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY migration_name;'
```

### 如果这一步仍然想去拉镜像

说明通常是下面几种情况之一：

1. `docker-compose.yml` 里的 `app.image` 标签，和你 `docker load` 进去的标签不一致
2. 本地根本没有这个标签的镜像
3. `postgres:16-alpine` 镜像在本机不存在，而你又没有提前导入

这时先检查：

```bash
docker image inspect calendar-task-manager:company-2026-05-07 >/dev/null && echo ok || echo missing
docker image inspect postgres:16-alpine >/dev/null && echo ok || echo missing
```

只要输出 `missing`，就先补 `docker load`。

## 六、启动新版本应用

迁移成功后，启动应用：

```bash
docker compose up -d app
```

再看日志：

```bash
docker compose logs --tail=100 app
```

确认没有明显报错，比如：

- Prisma 连接失败
- 缺字段
- 缺表
- 端口占用

## 七、触发法定节假日自动写入

这次版本里，`PublicHoliday` 表只是建表，节假日记录不是靠迁移 SQL 静态插入，而是应用第一次访问节假日接口时自动 `upsert`。

部署完成后执行一次：

```bash
curl "http://127.0.0.1:7049/api/public-holidays?startDate=2026-01-01&endDate=2026-12-31"
```

如果你服务器没有 `curl`，也可以直接在浏览器打开对应页面，让前端周视图或月视图自己去请求。

然后检查库里是否已经有节假日数据：

```bash
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c 'SELECT COUNT(*) FROM "PublicHoliday";'
```

## 八、升级后检查

### 结构检查

```bash
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c 'SELECT column_name FROM information_schema.columns WHERE table_name = '\''Team'\'' AND column_name = '\''sortOrder'\'';'

docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c 'SELECT column_name FROM information_schema.columns WHERE table_name = '\''ProjectMember'\'' AND column_name IN ('\''isArchived'\'','\''archivedAt'\'') ORDER BY column_name;'

docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c 'SELECT table_name FROM information_schema.tables WHERE table_schema = '\''public'\'' AND table_name IN ('\''RecurringTaskSeries'\'','\''PublicHoliday'\'') ORDER BY table_name;'

docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c 'SELECT column_name FROM information_schema.columns WHERE table_name = '\''Task'\'' AND column_name IN ('\''recurringSeriesId'\'','\''recurrenceDate'\'') ORDER BY column_name;'
```

### 功能检查

- [ ] 团队列表可拖拽排序，刷新后顺序保留
- [ ] 项目列表可拖拽排序，刷新后顺序保留
- [ ] 项目成员可归档/取消归档自己的项目视图
- [ ] 新建任务可以设置定时任务
- [ ] 可以终止已有定时任务的未来事项
- [ ] 周视图或月视图能看到法定节假日
- [ ] 计划面板里事项可以拖拽排序

## 如果 `prisma migrate deploy` 失败

如果你在第五步失败，不要硬顶着重复跑很多次。

这时改走手工 SQL 路线更稳：

1. 执行合并 SQL：

```bash
docker cp ./release/2026-05-07-post-2026-04-15/database-sync-post-2026-04-15.sql calendar-postgres:/tmp/database-sync-post-2026-04-15.sql
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -f /tmp/database-sync-post-2026-04-15.sql
```

2. 然后把历史迁移状态和本次发布的 4 条迁移都补齐：

```bash
for m in \
20251114212844_init \
20251114220612_add_username_field \
20251115035418_add_password_field \
20251115071949_add_creator_and_gender \
20251115074925_add_role_to_user \
20251115094036_add_isadmin_to_user \
20251115133624_add_task_permission \
20251115201512_add_organization_model \
20251115212303_add_notification_system \
20251118140218_add_task_creator_and_multiple_assignees \
20251118190313_add_invite_code_and_inviter \
20251118192501_add_invite_code_to_organization_member \
20251119131625_add_organization_invite \
20251119132818_add_deletion_notifications \
20251119142805_add_points_system \
20251125165512_add_task_color_and_progress \
20260414103000_add_planning_feature \
20260415093000_add_planning_bucket_width \
add_project_archive \
add_task_creator_and_multiple_assignees \
20260426090000_add_team_project_sort_order \
20260426100000_project_member_archive_flags \
20260426123000_add_recurring_task_series \
20260426153000_add_public_holidays
do
  echo "== resolving $m =="
  docker compose run --rm --no-deps app npx prisma migrate resolve --applied "$m"
done
```

3. 最后启动应用：

```bash
docker compose up -d app
```

如果你已经手工执行了 SQL，又把这些迁移都标记成 applied，那么后续再跑：

```bash
docker compose run --rm --no-deps app npx prisma migrate deploy
```

理论上应该只会显示“没有待执行迁移”或者直接成功结束，不应该再去重复建旧枚举、旧表、旧字段。

## 最短执行版

如果你现在只想要最短命令顺序，可以直接照这个跑：

```bash
docker load -i ./calendar-task-manager_company-2026-05-07.tar
docker compose up -d postgres
docker exec -t calendar-postgres pg_dump -U postgres -d calendar_tasks > calendar_tasks_backup_2026-05-12.sql
docker compose stop app
docker compose run --rm --no-deps app npx prisma migrate deploy
docker compose up -d app
curl "http://127.0.0.1:7049/api/public-holidays?startDate=2026-01-01&endDate=2026-12-31"
docker compose logs --tail=100 app
```

如果这里在 `migrate deploy` 时报 `TaskType already exists`，不要继续重复跑，直接回到上面的“先检查 `_prisma_migrations` 并补状态”那一节处理。

## 文档关系

更完整的变更说明见：

- [2026-05-07-post-2026-04-15-update.md](d:/CodeLab/calendar-task-manager/docs/deployment/2026-05-07-post-2026-04-15-update.md)

如果你现在的目标是“在内网机上把版本完整升上去”，优先看当前这份 runbook。
