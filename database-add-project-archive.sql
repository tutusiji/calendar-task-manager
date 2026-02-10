-- 项目归档功能数据库迁移脚本
-- 执行日期: 2026-02-05
-- 功能: 为 Project 表添加归档相关字段

-- 1. 添加 isArchived 字段（是否已归档）
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- 2. 添加 archivedAt 字段（归档时间）
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- 3. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS "Project_isArchived_idx" ON "Project"("isArchived");

-- 4. 验证字段是否添加成功
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'Project' 
    AND column_name IN ('isArchived', 'archivedAt')
ORDER BY column_name;

-- 5. 统计当前项目状态
SELECT 
    "isArchived",
    COUNT(*) as count
FROM "Project"
GROUP BY "isArchived";

-- 执行说明:
-- 1. 备份数据库（重要！）
-- 2. 在 PostgreSQL 中执行此脚本
-- 3. 验证字段添加成功
-- 4. 重启应用服务
-- 5. 测试归档功能

-- 回滚脚本（如需回滚，请执行以下语句）:
-- DROP INDEX IF EXISTS "Project_isArchived_idx";
-- ALTER TABLE "Project" DROP COLUMN IF EXISTS "archivedAt";
-- ALTER TABLE "Project" DROP COLUMN IF EXISTS "isArchived";
