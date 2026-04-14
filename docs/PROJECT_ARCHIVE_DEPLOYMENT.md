# 项目归档功能部署清单

## 📋 部署前检查

- [ ] 已备份数据库
- [ ] 已测试开发环境
- [ ] 已审查代码变更
- [ ] 已准备回滚方案

## 🗂️ 文件变更清单

### 数据库相关
- ✅ `prisma/schema.prisma` - 添加 isArchived 和 archivedAt 字段
- ✅ `prisma/migrations/add_project_archive/migration.sql` - 迁移脚本
- ✅ `database-add-project-archive.sql` - 生产环境 SQL 脚本

### 后端 API
- ✅ `app/api/projects/[id]/archive/route.ts` - 新增归档 API 路由
  - POST - 归档项目
  - DELETE - 取消归档项目

### 前端组件
- ✅ `components/sidebar/navigation-menu.tsx` - 更新侧边栏导航
  - 添加归档项目列表
  - 添加归档/取消归档操作
  - 添加权限控制

### 类型定义
- ✅ `lib/types.ts` - 更新 Project 接口
  - 添加 isArchived 字段
  - 添加 archivedAt 字段

### API 客户端
- ✅ `lib/api-client.ts` - 添加归档相关方法
  - archive() - 归档项目
  - unarchive() - 取消归档项目

### 测试脚本
- ✅ `scripts/test-project-archive.ts` - 功能测试脚本

### 文档
- ✅ `PROJECT_ARCHIVE_FEATURE.md` - 功能说明文档
- ✅ `PROJECT_ARCHIVE_DEMO.md` - 功能演示文档
- ✅ `PROJECT_ARCHIVE_DEPLOYMENT.md` - 部署清单（本文件）

## 🚀 部署步骤

### 1. 数据库迁移

#### 开发环境
```bash
# 方式1: 使用 Prisma Migrate
npx prisma db push

# 方式2: 使用 Prisma Generate
npx prisma generate
```

#### 生产环境
```bash
# 1. 备份数据库
pg_dump -U postgres -d calendar_tasks > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 执行迁移脚本
psql -U postgres -d calendar_tasks -f database-add-project-archive.sql

# 3. 验证字段
psql -U postgres -d calendar_tasks -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Project' AND column_name IN ('isArchived', 'archivedAt');"
```

### 2. 代码部署

#### 使用 Git 部署
```bash
# 1. 提交代码
git add .
git commit -m "feat: 添加项目归档功能"
git push origin main

# 2. 服务器拉取代码
ssh user@server
cd /path/to/app
git pull origin main

# 3. 安装依赖（如有新增）
npm install

# 4. 构建应用
npm run build

# 5. 重启服务
pm2 restart calendar-task-manager
# 或
docker-compose restart
```

#### 使用 Docker 部署
```bash
# 1. 构建镜像
docker build -t calendar-task-manager:latest .

# 2. 停止旧容器
docker-compose down

# 3. 启动新容器
docker-compose up -d

# 4. 查看日志
docker-compose logs -f
```

### 3. 功能验证

#### 数据库验证
```sql
-- 检查字段是否存在
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Project' 
  AND column_name IN ('isArchived', 'archivedAt');

-- 检查索引是否创建
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'Project' 
  AND indexname = 'Project_isArchived_idx';

-- 统计项目状态
SELECT 
  "isArchived",
  COUNT(*) as count
FROM "Project"
GROUP BY "isArchived";
```

#### 功能测试
```bash
# 运行测试脚本
npx tsx scripts/test-project-archive.ts
```

#### 手动测试清单
- [ ] 创建者可以归档项目
- [ ] 归档后项目出现在归档列表
- [ ] 归档项目显示为半透明
- [ ] 可以取消归档恢复项目
- [ ] 普通成员看不到归档选项
- [ ] 个人事务项目无法归档
- [ ] 归档项目时自动切换视图
- [ ] Toast 提示正常显示
- [ ] 归档列表默认折叠
- [ ] 归档项目数量显示正确

### 4. 性能监控

```sql
-- 监控归档查询性能
EXPLAIN ANALYZE
SELECT * FROM "Project"
WHERE "isArchived" = false
  AND "organizationId" = 'xxx';

-- 检查索引使用情况
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'Project';
```

## 🔄 回滚方案

### 如果需要回滚

#### 1. 回滚代码
```bash
# 回到上一个版本
git revert HEAD
git push origin main

# 或回到特定提交
git reset --hard <commit-hash>
git push -f origin main
```

#### 2. 回滚数据库（可选）
```sql
-- 删除索引
DROP INDEX IF EXISTS "Project_isArchived_idx";

-- 删除字段
ALTER TABLE "Project" DROP COLUMN IF EXISTS "archivedAt";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "isArchived";
```

#### 3. 重启服务
```bash
pm2 restart calendar-task-manager
# 或
docker-compose restart
```

## 📊 监控指标

### 关键指标
- 归档操作响应时间
- 归档项目查询性能
- 数据库索引命中率
- API 错误率

### 日志关键字
- "archive project"
- "unarchive project"
- "Failed to archive"
- "Failed to unarchive"

## 🐛 常见问题

### Q1: 数据库迁移失败
**原因**: 可能是权限问题或数据库连接问题
**解决**: 
```bash
# 检查数据库连接
psql -U postgres -d calendar_tasks -c "SELECT 1;"

# 检查用户权限
psql -U postgres -d calendar_tasks -c "SELECT current_user, current_database();"
```

### Q2: Prisma 生成失败
**原因**: 文件权限或进程占用
**解决**:
```bash
# 停止应用
pm2 stop calendar-task-manager

# 清理 node_modules
rm -rf node_modules/.prisma

# 重新生成
npx prisma generate

# 启动应用
pm2 start calendar-task-manager
```

### Q3: 前端不显示归档选项
**原因**: 权限检查或状态更新问题
**解决**:
1. 检查用户权限（isAdmin, creatorId）
2. 清除浏览器缓存
3. 检查 API 响应数据
4. 查看浏览器控制台错误

### Q4: 归档后项目仍在活跃列表
**原因**: 状态更新或过滤逻辑问题
**解决**:
1. 检查 API 返回的 isArchived 字段
2. 检查前端过滤逻辑
3. 刷新页面重新加载数据

## ✅ 部署完成检查

- [ ] 数据库迁移成功
- [ ] 应用构建成功
- [ ] 服务启动正常
- [ ] 功能测试通过
- [ ] 性能指标正常
- [ ] 日志无错误
- [ ] 用户反馈良好

## 📞 支持联系

如遇问题，请联系：
- 开发团队: dev@example.com
- 运维团队: ops@example.com
- 紧急热线: xxx-xxxx-xxxx

## 📝 部署记录

| 日期 | 环境 | 版本 | 操作人 | 状态 | 备注 |
|------|------|------|--------|------|------|
| 2026-02-05 | 开发 | v1.0 | - | ✅ 成功 | 初始开发 |
| | 测试 | | | | |
| | 生产 | | | | |

---

**最后更新**: 2026-02-05
**文档版本**: 1.0
