-- ========================================
-- 归档功能 + 计划功能 一体化结构同步脚本
-- 适用场景：
-- 1. 公司内网数据库已经有正式数据
-- 2. 不迁移数据，只补数据库结构
-- 3. 一次性补齐项目归档 + 计划板功能相关表/字段
-- ========================================

-- ========================================
-- 一、项目归档功能
-- ========================================

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Project_isArchived_idx" ON "Project"("isArchived");

-- ========================================
-- 二、计划功能枚举
-- ========================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'PlanningScopeType'
    ) THEN
        CREATE TYPE "PlanningScopeType" AS ENUM ('PERSONAL', 'TEAM', 'PROJECT');
    END IF;
END $$;

-- ========================================
-- 三、计划功能表
-- ========================================

CREATE TABLE IF NOT EXISTS "PlanningBoard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "scopeType" "PlanningScopeType" NOT NULL,
    "ownerUserId" TEXT,
    "teamId" TEXT,
    "projectId" TEXT,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanningBoard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PlanningBucket" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 296,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanningBucket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PlanningCard" (
    "id" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "headerColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanningCard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PlanningCardItem" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanningCardItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PlanningCardAssignee" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanningCardAssignee_pkey" PRIMARY KEY ("id")
);

-- 如果表已存在但还没加上 width 字段，这里补齐
ALTER TABLE IF EXISTS "PlanningBucket" ADD COLUMN IF NOT EXISTS "width" INTEGER NOT NULL DEFAULT 296;

-- ========================================
-- 四、索引
-- ========================================

CREATE INDEX IF NOT EXISTS "PlanningBoard_ownerUserId_idx" ON "PlanningBoard"("ownerUserId");
CREATE INDEX IF NOT EXISTS "PlanningBoard_teamId_idx" ON "PlanningBoard"("teamId");
CREATE INDEX IF NOT EXISTS "PlanningBoard_projectId_idx" ON "PlanningBoard"("projectId");
CREATE INDEX IF NOT EXISTS "PlanningBoard_creatorId_idx" ON "PlanningBoard"("creatorId");
CREATE INDEX IF NOT EXISTS "PlanningBoard_scopeType_idx" ON "PlanningBoard"("scopeType");

CREATE INDEX IF NOT EXISTS "PlanningBucket_boardId_sortOrder_idx" ON "PlanningBucket"("boardId", "sortOrder");

CREATE INDEX IF NOT EXISTS "PlanningCard_bucketId_sortOrder_idx" ON "PlanningCard"("bucketId", "sortOrder");
CREATE INDEX IF NOT EXISTS "PlanningCard_creatorId_idx" ON "PlanningCard"("creatorId");

CREATE INDEX IF NOT EXISTS "PlanningCardItem_cardId_sortOrder_idx" ON "PlanningCardItem"("cardId", "sortOrder");
CREATE INDEX IF NOT EXISTS "PlanningCardItem_cardId_isCompleted_idx" ON "PlanningCardItem"("cardId", "isCompleted");

CREATE INDEX IF NOT EXISTS "PlanningCardAssignee_cardId_idx" ON "PlanningCardAssignee"("cardId");
CREATE INDEX IF NOT EXISTS "PlanningCardAssignee_userId_idx" ON "PlanningCardAssignee"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "PlanningCardAssignee_cardId_userId_key" ON "PlanningCardAssignee"("cardId", "userId");

-- ========================================
-- 五、外键约束
-- ========================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlanningBoard_ownerUserId_fkey') THEN
        ALTER TABLE "PlanningBoard"
        ADD CONSTRAINT "PlanningBoard_ownerUserId_fkey"
        FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlanningBoard_teamId_fkey') THEN
        ALTER TABLE "PlanningBoard"
        ADD CONSTRAINT "PlanningBoard_teamId_fkey"
        FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlanningBoard_projectId_fkey') THEN
        ALTER TABLE "PlanningBoard"
        ADD CONSTRAINT "PlanningBoard_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlanningBoard_creatorId_fkey') THEN
        ALTER TABLE "PlanningBoard"
        ADD CONSTRAINT "PlanningBoard_creatorId_fkey"
        FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlanningBucket_boardId_fkey') THEN
        ALTER TABLE "PlanningBucket"
        ADD CONSTRAINT "PlanningBucket_boardId_fkey"
        FOREIGN KEY ("boardId") REFERENCES "PlanningBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlanningCard_bucketId_fkey') THEN
        ALTER TABLE "PlanningCard"
        ADD CONSTRAINT "PlanningCard_bucketId_fkey"
        FOREIGN KEY ("bucketId") REFERENCES "PlanningBucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlanningCard_creatorId_fkey') THEN
        ALTER TABLE "PlanningCard"
        ADD CONSTRAINT "PlanningCard_creatorId_fkey"
        FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlanningCardItem_cardId_fkey') THEN
        ALTER TABLE "PlanningCardItem"
        ADD CONSTRAINT "PlanningCardItem_cardId_fkey"
        FOREIGN KEY ("cardId") REFERENCES "PlanningCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlanningCardAssignee_cardId_fkey') THEN
        ALTER TABLE "PlanningCardAssignee"
        ADD CONSTRAINT "PlanningCardAssignee_cardId_fkey"
        FOREIGN KEY ("cardId") REFERENCES "PlanningCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlanningCardAssignee_userId_fkey') THEN
        ALTER TABLE "PlanningCardAssignee"
        ADD CONSTRAINT "PlanningCardAssignee_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ========================================
-- 六、执行后检查
-- ========================================

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Project'
  AND column_name IN ('isArchived', 'archivedAt')
ORDER BY column_name;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('PlanningBoard', 'PlanningBucket', 'PlanningCard', 'PlanningCardItem', 'PlanningCardAssignee')
ORDER BY table_name;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'PlanningBucket'
  AND column_name = 'width';
