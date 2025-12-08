-- 为现有的 Organization 表添加 joinRequiresApproval 字段并初始化为 false
-- 如果字段已存在，则只更新现有记录的值

-- 添加字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Organization' 
        AND column_name = 'joinRequiresApproval'
    ) THEN
        ALTER TABLE "Organization" 
        ADD COLUMN "joinRequiresApproval" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- 更新所有现有记录，确保 joinRequiresApproval 为 false
UPDATE "Organization" 
SET "joinRequiresApproval" = false 
WHERE "joinRequiresApproval" IS NULL OR "joinRequiresApproval" IS DISTINCT FROM false;

-- 验证更新结果
SELECT 
    id, 
    name, 
    "joinRequiresApproval",
    "createdAt"
FROM "Organization"
ORDER BY "createdAt" DESC;
