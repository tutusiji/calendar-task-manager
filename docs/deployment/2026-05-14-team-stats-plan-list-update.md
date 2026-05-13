# 2026-05-14 团队口径、计划面板与统计视图升级手册

## 文档用途

这份手册用于把日历任务系统升级到 `2026-05-14` 这批改动，对应当前代码定位为：

- 分支：`feat/team-stats-plan-list-20260514`
- 提交：`c5acc3d`
- 推荐应用镜像标签：`calendar-task-manager:company-2026-05-14`

如果你当前线上或内网环境不是从 `2026-05-07` 一路升级过来的，建议先对照一下你正在运行的镜像标签、数据库迁移记录和 `docker-compose.yml`，确认实际基线后再执行。

## 一句话结论

这次升级是：

- 纯代码和交互逻辑升级
- 不包含新的 Prisma migration
- 不需要新增数据库表或字段
- 可以按“换代码 / 换镜像 / 重启应用”的方式完成升级

也就是说，这一版通常不需要执行额外 SQL，也不需要手工补数据库结构。

## 本次升级内容总览

### 1. 团队视图与团队统计口径调整

- 创建事项时去掉了团队选择
- 团队视图不再依赖 `task.teamId === 当前团队`
- 团队数据改为按“当前团队成员参与的事项”聚合
- 统计视图下，团队统计会排除“个人事务”项目，避免把个人事项算进团队报表

相关代码：

- [app/api/tasks/route.ts](d:/CodeLab/calendar-task-manager/app/api/tasks/route.ts)
- [app/api/tasks/[id]/route.ts](d:/CodeLab/calendar-task-manager/app/api/tasks/%5Bid%5D/route.ts)
- [components/task/task-form-panel.tsx](d:/CodeLab/calendar-task-manager/components/task/task-form-panel.tsx)
- [components/views/stats-view.tsx](d:/CodeLab/calendar-task-manager/components/views/stats-view.tsx)
- [lib/store/calendar-store.ts](d:/CodeLab/calendar-task-manager/lib/store/calendar-store.ts)

### 2. 计划面板事项拖拽排序优化

- 卡片内事项拖拽时的卡顿感下降
- 从“整卡所有事项逐条提交”改成“只提交必要排序变更”
- 排序保存逻辑改为更贴近拖拽结果的单次提交

相关代码：

- [components/views/plan-view.tsx](d:/CodeLab/calendar-task-manager/components/views/plan-view.tsx)
- [app/api/plans/items/[id]/route.ts](d:/CodeLab/calendar-task-manager/app/api/plans/items/%5Bid%5D/route.ts)
- [app/api/plans/items/route.ts](d:/CodeLab/calendar-task-manager/app/api/plans/items/route.ts)
- [lib/api/planning.ts](d:/CodeLab/calendar-task-manager/lib/api/planning.ts)
- [lib/planning.ts](d:/CodeLab/calendar-task-manager/lib/planning.ts)

### 3. My Days 默认项目体验优化

- My Days 中创建事项时，优先记住上一次选择的项目
- 不再每次强行先回到“个人事务”再手动切换
- 在项目侧边栏进入某个项目后创建事项，仍然可以默认落到该项目

相关代码：

- [lib/store/calendar-store.ts](d:/CodeLab/calendar-task-manager/lib/store/calendar-store.ts)

### 4. 统计视图升级为管理报表导向

- “任务总览”改为“统计总览”
- 增加当前团队/项目名称、人数、周期信息
- 增加“人力投入占比”
- 增加“成员人力分布（按项目）”
- 团队统计不再把个人事务卷入报表
- 上方卡片布局重新压缩，信息更紧凑

相关代码：

- [components/views/stats-view.tsx](d:/CodeLab/calendar-task-manager/components/views/stats-view.tsx)

### 5. 清单视图复制能力增强

- 卡片原有复制按钮保留
- 新增一个只复制事项名的 icon 按钮
- 复制结果为每行一个 `• 事项名`

相关代码：

- [components/views/list-view.tsx](d:/CodeLab/calendar-task-manager/components/views/list-view.tsx)

### 6. Panorama / 管理视角同步对齐

- 管理端团队、组织、任务统计口径同步按“成员参与事项”处理
- 避免前台和 Panorama 看到的团队数据语义不一致

相关代码：

- [app/api/admin/panorama/tasks/route.ts](d:/CodeLab/calendar-task-manager/app/api/admin/panorama/tasks/route.ts)
- [app/api/admin/panorama/organizations/route.ts](d:/CodeLab/calendar-task-manager/app/api/admin/panorama/organizations/route.ts)
- [app/api/admin/panorama/organizations/[id]/route.ts](d:/CodeLab/calendar-task-manager/app/api/admin/panorama/organizations/%5Bid%5D/route.ts)
- [app/api/admin/panorama/organizations/[id]/teams/route.ts](d:/CodeLab/calendar-task-manager/app/api/admin/panorama/organizations/%5Bid%5D/teams/route.ts)
- [app/api/admin/panorama/organizations/[id]/members/route.ts](d:/CodeLab/calendar-task-manager/app/api/admin/panorama/organizations/%5Bid%5D/members/route.ts)

## 是否需要数据库迁移

本次升级结论：

- 不需要新增 Prisma migration
- 不需要手工执行 SQL
- 不需要删库或导库

建议你仍然在升级前做一次数据库备份，因为这次虽然不改结构，但会替换运行中的应用逻辑。

## 升级前检查

执行升级前，先确认以下 5 项：

1. 当前数据库容器正常运行。
2. 当前应用版本对应的镜像 tag 已记录。
3. `docker-compose.yml` 中 `app.image` 最终会指向新版本 tag。
4. 你已经备份数据库，或者至少确认可以快速回滚到旧镜像。
5. 如果是离线环境，目标镜像 tar 已经准备好。

## 升级路线 A：代码仓库直接升级并本地重打镜像

适用于：

- 服务器或部署机可以直接访问这份代码仓库
- 你准备从代码重新构建镜像

### 第 1 步：备份数据库

```bash
docker exec -t calendar-postgres pg_dump -U postgres -d calendar_tasks > calendar_tasks_backup_2026-05-14.sql
```

### 第 2 步：切到目标版本

如果你按提交号部署：

```bash
git fetch --all
git checkout c5acc3d
```

如果你按分支部署：

```bash
git fetch --all
git checkout feat/team-stats-plan-list-20260514
git pull
```

### 第 3 步：确认 compose 中的镜像标签

当前仓库里的 [docker-compose.yml](d:/CodeLab/calendar-task-manager/docker-compose.yml) 已经把 `app.image` 指向：

```yaml
image: calendar-task-manager:company-2026-05-14
```

如果你部署的是个人版，请把它改成你自己的目标 tag，例如：

```yaml
image: calendar-task-manager:personal-2026-05-14
```

### 第 4 步：构建镜像

公司版：

```bash
docker build --build-arg ENV_TYPE=company -t calendar-task-manager:company-2026-05-14 .
```

个人版：

```bash
docker build --build-arg ENV_TYPE=personal -t calendar-task-manager:personal-2026-05-14 .
```

### 第 5 步：重启应用

```bash
docker compose stop app
docker compose up -d app
```

如果你希望连依赖一起校验，也可以：

```bash
docker compose up -d
```

### 第 6 步：看日志确认启动成功

```bash
docker compose ps
docker compose logs --tail=200 app
```

确认点：

- `calendar-app` 为 `Up`
- 没有 Prisma 启动报错
- 没有 `server.js` 启动失败

## 升级路线 B：内网 / 离线环境只替换镜像

适用于：

- 服务器无法联网
- 你已经在别处构建好了镜像 tar
- 这次只需要导入镜像并切换 `docker-compose.yml`

### 第 1 步：准备镜像文件

建议文件命名示例：

- `calendar-task-manager_company-2026-05-14.tar`

### 第 2 步：导入镜像

```bash
docker load -i ./calendar-task-manager_company-2026-05-14.tar
```

导入后确认：

```bash
docker image ls | grep calendar-task-manager
```

### 第 3 步：修改 compose 标签

把 [docker-compose.yml](d:/CodeLab/calendar-task-manager/docker-compose.yml) 中的：

```yaml
image: calendar-task-manager:company-2026-05-14
```

改成你实际导入后的 tag。两边必须完全一致。

### 第 4 步：停旧应用，启动新应用

```bash
docker compose stop app
docker compose up -d app
```

### 第 5 步：验证

```bash
docker compose ps
docker compose logs --tail=200 app
```

## 升级后重点验证清单

这次升级建议至少人工验证下面这些点。

### 1. 团队视图 / 团队统计

- 打开某个团队
- 确认团队中能看到团队成员参与的事项
- 确认统计页里不再把“某某的个人事务”算进团队项目投入

### 2. 创建事项

- 创建事项面板里不再显示团队选择
- My Days 中创建事项时，默认项目更接近上次使用项目
- 从某个项目进入后创建事项，默认项目仍然正确

### 3. 计划面板

- 拖拽卡片内事项排序
- 确认拖拽不再明显卡顿
- 确认排序后保存成功
- 确认不会再出现“整个卡片里所有事项都一起重复提交”的异常现象

### 4. 统计视图

- 左上角显示“统计总览”
- 团队模式下显示当前团队名称、人数、投入数据
- “团队项目投入占比”和“成员人力分布（按项目）”能正常出图
- 团队视角下不会把个人事务项目算进去

### 5. 清单视图

- 每张卡片右上角除了原复制按钮外，还有一个只复制事项名的 icon 按钮
- 点击后剪贴板内容应为：

```text
• 事项A
• 事项B
• 事项C
```

## 回滚方案

如果新版本启动后发现行为不符合预期，推荐按下面方式回滚。

### 回滚方式 1：切回旧镜像

1. 把 `docker-compose.yml` 中 `app.image` 改回旧 tag
2. 执行：

```bash
docker compose stop app
docker compose up -d app
```

### 回滚方式 2：切回旧代码并重打镜像

如果你走的是代码构建路线：

```bash
git checkout <旧提交或旧分支>
docker build --build-arg ENV_TYPE=company -t <旧镜像tag> .
docker compose stop app
docker compose up -d app
```

### 数据回滚说明

由于这次升级不包含数据库结构变更，通常不需要回滚数据库结构。

如果你只是替换了应用镜像，理论上恢复旧应用版本即可。

只有在升级过程中你还额外执行了别的脚本、改了数据库内容，才需要动用备份。

## 已知说明

### 1. `docker-compose.yml` 当前状态

当前仓库里的 [docker-compose.yml](d:/CodeLab/calendar-task-manager/docker-compose.yml) 已经改成：

- `app.image = calendar-task-manager:company-2026-05-14`

如果你的部署环境不是公司版，需要自行改成对应环境 tag。

### 2. 本次手册仅覆盖应用升级

这份手册不包含：

- Docker Desktop 本机安装问题处理
- Windows 服务权限修复
- PostgreSQL 基础镜像损坏处理
- 旧历史脏数据清洗

如果部署机本身 Docker 运行异常，先恢复 Docker 可用，再执行本手册。

## 推荐交付物

如果你要把这次升级发给运维或内网同事，建议一起交付下面这些内容：

- 本文档：`docs/deployment/2026-05-14-team-stats-plan-list-update.md`
- 当前代码提交号：`c5acc3d`
- 目标镜像 tag：`calendar-task-manager:company-2026-05-14`
- 如为离线环境，再附：
  - `calendar-task-manager_company-2026-05-14.tar`
  - `docker-compose.yml`
  - `.env.example`
