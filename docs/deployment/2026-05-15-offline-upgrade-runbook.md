# 2026-05-15 内网离线部署手册

## 文档用途

这份手册用于把当前系统升级到 `2026-05-15` 这一版代码。

这次版本是在 `2026-05-14` 的基础上继续做的一次轻量发布，重点是日历周视图和月视图的展示修正，以及节假日展示方式优化。

推荐镜像标签：

- `calendar-task-manager:company-2026-05-15`

如果你的环境还没有完成 `2026-05-14` 那一版升级，建议先阅读并完成：

- [2026-05-14-team-stats-plan-list-update.md](d:/CodeLab/calendar-task-manager/docs/deployment/2026-05-14-team-stats-plan-list-update.md)

## 一句话结论

这次升级的性质是：

- 纯前端展示和交互修正升级
- 不包含新的 Prisma migration
- 不需要新增数据库表、字段或索引
- 离线环境可以直接按“导入新镜像、切换 tag、重启 app”完成升级

也就是说，如果你当前已经稳定运行在 `2026-05-14`，这次通常不需要执行 `prisma migrate deploy`。

## 本次版本主要变化

### 1. 周视图节假日展示调整

- 团队周视图不再单独插入一整条节假日行
- 个人周视图也不再额外占一行显示节假日
- 节假日名称直接显示在周视图日期表头里

### 2. 日历跨天事项条对齐修正

- 修复周视图和月视图中，跨天事项条右端点微小不对齐的问题
- 不同跨度但同一天结束的事项条，视觉上会更整齐

### 3. 节假日展示逻辑收敛

- 节假日仍然保留系统只读属性
- 但不再以单独整行的方式干扰团队成员列表或个人周视图

## 适用场景

这份 runbook 适用于下面场景：

- 目标服务器处于内网离线环境，不能直接联网拉取镜像
- 你会在一台可联网或可构建的机器上先打包镜像
- 再把镜像 tar 包拷贝到内网服务器导入
- 数据库里已经有正式业务数据，希望尽量小成本升级

## 升级前判断

先确认你当前属于哪一种情况：

### 情况 A：已经在 `2026-05-14`

这种情况最简单：

- 不需要新的数据库迁移
- 只需要换镜像并重启应用

### 情况 B：还停留在更早版本

如果你现在还没完成 `2026-05-14` 或 `2026-05-07` 的结构升级，不建议直接跳过前置手册。

优先顺序建议是：

1. 先完成 `2026-05-07` 相关结构升级
2. 再完成 `2026-05-14` 逻辑升级
3. 最后再切到 `2026-05-15`

对应文档：

- [2026-05-12-offline-upgrade-to-2026-05-07-runbook.md](d:/CodeLab/calendar-task-manager/docs/deployment/2026-05-12-offline-upgrade-to-2026-05-07-runbook.md)
- [2026-05-14-team-stats-plan-list-update.md](d:/CodeLab/calendar-task-manager/docs/deployment/2026-05-14-team-stats-plan-list-update.md)

## 交付物清单

建议给内网同事一起交付下面这些文件：

- 本文档：`docs/deployment/2026-05-15-offline-upgrade-runbook.md`
- 镜像 tar：`calendar-task-manager_company-2026-05-15.tar`
- 部署用 compose：`docker-compose.yml`
- 环境变量样例：`.env.example`

如果你们现场不是公司版，也可以改为个人版镜像 tag 和 tar 包名称。

## 一、外网或构建机上准备镜像

### 1. 切到当前发布代码

如果你准备从当前分支构建：

```bash
git checkout feat/team-stats-plan-list-20260514
git pull
```

如果你准备按某个固定提交构建，也可以改成：

```bash
git checkout <你的发布提交号>
```

### 2. 构建公司版镜像

```bash
docker build --build-arg ENV_TYPE=company -t calendar-task-manager:company-2026-05-15 .
```

如果你需要个人版：

```bash
docker build --build-arg ENV_TYPE=personal -t calendar-task-manager:personal-2026-05-15 .
```

### 3. 导出镜像 tar

公司版：

```bash
docker save -o ./calendar-task-manager_company-2026-05-15.tar calendar-task-manager:company-2026-05-15
```

个人版：

```bash
docker save -o ./calendar-task-manager_personal-2026-05-15.tar calendar-task-manager:personal-2026-05-15
```

### 4. 简单核对导出结果

Linux / macOS：

```bash
ls -lh ./calendar-task-manager_*2026-05-15.tar
```

Windows PowerShell：

```powershell
Get-ChildItem .\calendar-task-manager_*2026-05-15.tar
```

## 二、把文件拷到内网服务器

至少拷下面这些：

- `calendar-task-manager_company-2026-05-15.tar`
- `docker-compose.yml`
- `docs/deployment/2026-05-15-offline-upgrade-runbook.md`

如果内网服务器上还没有 `postgres:16-alpine`，也请一并准备对应 PostgreSQL 镜像 tar。

## 三、内网服务器升级前备份

即使这次不改数据库结构，也建议先备份数据库。

```bash
docker compose up -d postgres
docker exec -t calendar-postgres pg_dump -U postgres -d calendar_tasks > calendar_tasks_backup_2026-05-15.sql
```

如果当前数据库容器名称不是 `calendar-postgres`，请按你的实际容器名替换。

## 四、导入新镜像

```bash
docker load -i ./calendar-task-manager_company-2026-05-15.tar
```

导入后检查：

```bash
docker image ls | grep calendar-task-manager
```

如果没有 `grep`，也可以直接：

```bash
docker image ls
```

## 五、确认 compose 镜像标签

当前仓库里的 [docker-compose.yml](d:/CodeLab/calendar-task-manager/docker-compose.yml) 已经默认指向：

```yaml
image: calendar-task-manager:company-2026-05-15
```

你需要确认内网服务器上的 `docker-compose.yml` 也和实际导入标签一致。

如果你导入的是个人版镜像，就改成：

```yaml
image: calendar-task-manager:personal-2026-05-15
```

## 六、停旧应用

建议先停掉旧版 `app`，保留数据库即可：

```bash
docker compose stop app
```

这样做的目的是：

- 避免旧应用继续写库
- 避免重启切换过程中有旧请求打进来
- 降低升级窗口内的混乱

## 七、这次是否需要执行数据库迁移

默认结论：

- 如果你已经在 `2026-05-14`
- 并且数据库一直正常运行
- 没有漏执行历史 migration

那么这次 `2026-05-15` 升级默认不需要执行：

```bash
docker compose run --rm --no-deps app npx prisma migrate deploy
```

也就是说，正常情况下这一步可以跳过。

### 什么时候需要回看迁移问题

只有当你本机本来就不是完整的 `2026-05-14` 环境，或者你之前有 migration 漏跑、库结构异常，才需要回看更早的升级手册。

这时优先参考：

- [2026-05-12-offline-upgrade-to-2026-05-07-runbook.md](d:/CodeLab/calendar-task-manager/docs/deployment/2026-05-12-offline-upgrade-to-2026-05-07-runbook.md)

## 八、启动新版本应用

```bash
docker compose up -d app
```

如果你希望顺带把依赖状态一起拉起来，也可以：

```bash
docker compose up -d
```

## 九、查看启动日志

```bash
docker compose ps
docker compose logs --tail=200 app
```

重点确认：

- `calendar-app` 状态为 `Up`
- 没有 Prisma 连接报错
- 没有 `server.js` 启动失败
- 没有镜像 tag 不匹配导致的容器拉起失败

## 十、升级后验证清单

建议至少手工验证下面这些点。

### 1. 团队周视图

- 周视图顶部不再出现单独一整条节假日行
- 节假日名称直接显示在日期表头区域
- 团队成员列表不会被节假日行打断

### 2. 个人周视图

- 同样不再出现独立节假日行
- 节假日提示在日期格表头内显示

### 3. 月视图和周视图跨天事项条

- 找几条不同跨度、但同一天截止的事项
- 观察右侧端点是否已经基本对齐

### 4. 节假日数据

- 周视图和月视图仍能看到法定节假日
- 节假日不应该变成可编辑普通事项

### 5. 回归验证

由于当前镜像本身仍然包含 `2026-05-14` 那一批功能，建议顺手复核：

- 团队统计页是否还能正常打开
- 清单视图复制按钮是否正常
- 计划面板拖拽排序是否正常

## 回滚方案

如果你发现这次 UI 版本不符合预期，最稳的方式还是回滚镜像 tag。

### 回滚步骤

1. 把 `docker-compose.yml` 中的 `app.image` 改回旧 tag，例如：

```yaml
image: calendar-task-manager:company-2026-05-14
```

2. 重新启动应用：

```bash
docker compose stop app
docker compose up -d app
```

### 数据回滚说明

由于这次版本不涉及数据库结构变更，通常不需要回滚数据库结构。

只要你没有额外手工执行 SQL，理论上回滚到旧镜像即可。

## 最短执行版

如果你当前已经明确是从 `2026-05-14` 升到 `2026-05-15`，可以直接照这个最短顺序执行：

```bash
docker compose up -d postgres
docker exec -t calendar-postgres pg_dump -U postgres -d calendar_tasks > calendar_tasks_backup_2026-05-15.sql
docker load -i ./calendar-task-manager_company-2026-05-15.tar
docker compose stop app
docker compose up -d app
docker compose logs --tail=200 app
```

## 推荐交付口径

如果你要把这次版本交给运维或内网同事，建议同时附上下面这些说明：

- 目标版本：`2026-05-15`
- 推荐镜像：`calendar-task-manager:company-2026-05-15`
- 升级性质：纯 UI 和展示修正
- 数据库要求：无新增 migration
- 风险等级：低
