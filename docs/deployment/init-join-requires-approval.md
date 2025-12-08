# Organization joinRequiresApproval 字段初始化指南

## 背景
在部署新版本后,需要为现有的 organization 记录添加 `joinRequiresApproval` 字段并初始化为 `false`。

## 方案选择

### 方案一：使用 Prisma Migrate (推荐)

如果您的数据库迁移是通过 Prisma 管理的，最安全的方式是运行 Prisma migrate:

```bash
# 在服务器上执行
npx prisma migrate deploy
```

这会自动应用所有待执行的迁移，包括 schema 中定义的 `joinRequiresApproval` 字段。

### 方案二：直接执行 SQL 脚本

如果需要手动执行 SQL，可以使用以下命令：

#### 使用 psql 命令行工具

```bash
# 连接到数据库并执行脚本
psql -h <数据库主机> -U <用户名> -d <数据库名> -f prisma/migrations/add_join_requires_approval.sql
```

#### 使用 Docker 容器中的 psql

```bash
# 如果数据库在 Docker 容器中
docker exec -i <容器名> psql -U <用户名> -d <数据库名> < prisma/migrations/add_join_requires_approval.sql
```

#### 直接执行 SQL 语句

```bash
# 连接到数据库后执行
psql -h <数据库主机> -U <用户名> -d <数据库名>
```

然后在 psql 提示符下执行：

```sql
-- 添加字段（如果不存在）
ALTER TABLE "Organization" 
ADD COLUMN IF NOT EXISTS "joinRequiresApproval" BOOLEAN NOT NULL DEFAULT false;

-- 更新所有现有记录
UPDATE "Organization" 
SET "joinRequiresApproval" = false 
WHERE "joinRequiresApproval" IS NULL;

-- 验证结果
SELECT id, name, "joinRequiresApproval" FROM "Organization";
```

### 方案三：使用 Prisma Studio

```bash
# 在服务器上启动 Prisma Studio
npx prisma studio
```

然后在浏览器中手动编辑每条 organization 记录。

## 验证

执行完成后，可以通过以下 SQL 验证：

```sql
SELECT 
    COUNT(*) as total_orgs,
    COUNT(CASE WHEN "joinRequiresApproval" = false THEN 1 END) as orgs_with_false,
    COUNT(CASE WHEN "joinRequiresApproval" = true THEN 1 END) as orgs_with_true,
    COUNT(CASE WHEN "joinRequiresApproval" IS NULL THEN 1 END) as orgs_with_null
FROM "Organization";
```

预期结果：所有 organization 的 `joinRequiresApproval` 都应该是 `false`。

## 注意事项

1. **备份数据库**：在执行任何数据库操作前，请先备份数据库
2. **停止应用**：建议在维护窗口执行，或暂时停止应用服务
3. **检查权限**：确保数据库用户有 ALTER TABLE 权限
4. **测试环境**：建议先在测试环境验证脚本

## 快速命令参考

```bash
# 1. 备份数据库
pg_dump -h <主机> -U <用户> -d <数据库> > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 执行迁移（推荐）
npx prisma migrate deploy

# 3. 或者执行 SQL 脚本
psql -h <主机> -U <用户> -d <数据库> -f prisma/migrations/add_join_requires_approval.sql

# 4. 验证结果
psql -h <主机> -U <用户> -d <数据库> -c "SELECT id, name, \"joinRequiresApproval\" FROM \"Organization\";"
```
