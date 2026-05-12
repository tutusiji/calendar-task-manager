-- ========================================
-- 2026-04-15 镜像之后的数据库结构同步脚本
-- 适用基线：
-- 1. 上一个已部署版本为 2026-04-15 planning 版
-- 2. 目标库已有正式数据
-- 3. 本次只补数据库结构，不整体替换数据
-- ========================================

-- ========================================
-- 一、团队/项目侧边栏排序
-- 对应迁移：
-- - 20260426090000_add_team_project_sort_order
-- ========================================

ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Team_organizationId_sortOrder_idx"
  ON "Team"("organizationId", "sortOrder");

CREATE INDEX IF NOT EXISTS "Project_organizationId_sortOrder_idx"
  ON "Project"("organizationId", "sortOrder");

WITH ranked_teams AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "organizationId" ORDER BY name ASC, "createdAt" ASC) - 1 AS rn
  FROM "Team"
)
UPDATE "Team"
SET "sortOrder" = ranked_teams.rn
FROM ranked_teams
WHERE "Team".id = ranked_teams.id
  AND "Team"."sortOrder" = 0;

WITH ranked_projects AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "organizationId" ORDER BY "createdAt" ASC, name ASC) - 1 AS rn
  FROM "Project"
)
UPDATE "Project"
SET "sortOrder" = ranked_projects.rn
FROM ranked_projects
WHERE "Project".id = ranked_projects.id
  AND "Project"."sortOrder" = 0;

-- ========================================
-- 二、项目成员维度归档
-- 对应迁移：
-- - 20260426100000_project_member_archive_flags
-- ========================================

ALTER TABLE "ProjectMember" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProjectMember" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ProjectMember_userId_isArchived_idx"
  ON "ProjectMember"("userId", "isArchived");

UPDATE "ProjectMember" pm
SET
  "isArchived" = p."isArchived",
  "archivedAt" = p."archivedAt"
FROM "Project" p
WHERE pm."projectId" = p.id
  AND p."isArchived" = true
  AND pm."isArchived" = false;

-- ========================================
-- 三、定时任务
-- 对应迁移：
-- - 20260426123000_add_recurring_task_series
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'TaskRecurrenceType'
  ) THEN
    CREATE TYPE "TaskRecurrenceType" AS ENUM ('WEEKLY', 'MONTHLY', 'INTERVAL_DAYS');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "RecurringTaskSeries" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "startTime" TEXT,
  "endTime" TEXT,
  "type" "TaskType" NOT NULL,
  "color" TEXT,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "recurrenceType" "TaskRecurrenceType" NOT NULL,
  "intervalDays" INTEGER,
  "assigneeIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "creatorId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "teamId" TEXT,
  "generatedUntil" TIMESTAMP(3),
  "stopsAfter" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecurringTaskSeries_pkey" PRIMARY KEY ("id")
);

ALTER TABLE IF EXISTS "RecurringTaskSeries" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE IF EXISTS "RecurringTaskSeries" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "RecurringTaskSeries" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE IF EXISTS "RecurringTaskSeries" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE IF EXISTS "RecurringTaskSeries" ADD COLUMN IF NOT EXISTS "startTime" TEXT;
ALTER TABLE IF EXISTS "RecurringTaskSeries" ADD COLUMN IF NOT EXISTS "endTime" TEXT;
ALTER TABLE IF EXISTS "RecurringTaskSeries" ADD COLUMN IF NOT EXISTS "type" "TaskType";
ALTER TABLE IF EXISTS "RecurringTaskSeries" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE IF EXISTS "RecurringTaskSeries" ADD COLUMN IF NOT EXISTS "progress" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS "RecurringTaskSeries" ADD COLUMN IF NOT EXISTS "recurrenceType" "TaskRecurrenceType";
ALTER TABLE IF EXISTS "RecurringTaskSeries" ADD COLUMN IF NOT EXISTS "intervalDays" INTEGER;
ALTER TABLE IF EXISTS "RecurringTaskSeries" ADD COLUMN IF NOT EXISTS "assigneeIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE IF EXISTS "RecurringTaskSeries" ADD COLUMN IF NOT EXISTS "creatorId" TEXT;
ALTER TABLE IF EXISTS "RecurringTaskSeries" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE IF EXISTS "RecurringTaskSeries" ADD COLUMN IF NOT EXISTS "teamId" TEXT;
ALTER TABLE IF EXISTS "RecurringTaskSeries" ADD COLUMN IF NOT EXISTS "generatedUntil" TIMESTAMP(3);
ALTER TABLE IF EXISTS "RecurringTaskSeries" ADD COLUMN IF NOT EXISTS "stopsAfter" TIMESTAMP(3);
ALTER TABLE IF EXISTS "RecurringTaskSeries" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS "RecurringTaskSeries" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "recurringSeriesId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "recurrenceDate" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "RecurringTaskSeries_creatorId_idx"
  ON "RecurringTaskSeries"("creatorId");
CREATE INDEX IF NOT EXISTS "RecurringTaskSeries_projectId_idx"
  ON "RecurringTaskSeries"("projectId");
CREATE INDEX IF NOT EXISTS "RecurringTaskSeries_teamId_idx"
  ON "RecurringTaskSeries"("teamId");
CREATE INDEX IF NOT EXISTS "RecurringTaskSeries_generatedUntil_idx"
  ON "RecurringTaskSeries"("generatedUntil");
CREATE INDEX IF NOT EXISTS "RecurringTaskSeries_stopsAfter_idx"
  ON "RecurringTaskSeries"("stopsAfter");
CREATE INDEX IF NOT EXISTS "Task_recurringSeriesId_idx"
  ON "Task"("recurringSeriesId");
CREATE UNIQUE INDEX IF NOT EXISTS "Task_recurringSeriesId_recurrenceDate_key"
  ON "Task"("recurringSeriesId", "recurrenceDate");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RecurringTaskSeries_creatorId_fkey'
  ) THEN
    ALTER TABLE "RecurringTaskSeries"
    ADD CONSTRAINT "RecurringTaskSeries_creatorId_fkey"
    FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RecurringTaskSeries_projectId_fkey'
  ) THEN
    ALTER TABLE "RecurringTaskSeries"
    ADD CONSTRAINT "RecurringTaskSeries_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RecurringTaskSeries_teamId_fkey'
  ) THEN
    ALTER TABLE "RecurringTaskSeries"
    ADD CONSTRAINT "RecurringTaskSeries_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Task_recurringSeriesId_fkey'
  ) THEN
    ALTER TABLE "Task"
    ADD CONSTRAINT "Task_recurringSeriesId_fkey"
    FOREIGN KEY ("recurringSeriesId") REFERENCES "RecurringTaskSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ========================================
-- 四、法定节假日表
-- 对应迁移：
-- - 20260426153000_add_public_holidays
-- 说明：
-- 该脚本只补结构，节假日数据由应用首次访问 /api/public-holidays 时自动 upsert
-- ========================================

CREATE TABLE IF NOT EXISTS "PublicHoliday" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PublicHoliday_pkey" PRIMARY KEY ("id")
);

ALTER TABLE IF EXISTS "PublicHoliday" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE IF EXISTS "PublicHoliday" ADD COLUMN IF NOT EXISTS "year" INTEGER;
ALTER TABLE IF EXISTS "PublicHoliday" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE IF EXISTS "PublicHoliday" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE IF EXISTS "PublicHoliday" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE IF EXISTS "PublicHoliday" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS "PublicHoliday" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "PublicHoliday_code_key"
  ON "PublicHoliday"("code");
CREATE INDEX IF NOT EXISTS "PublicHoliday_year_idx"
  ON "PublicHoliday"("year");
CREATE INDEX IF NOT EXISTS "PublicHoliday_startDate_endDate_idx"
  ON "PublicHoliday"("startDate", "endDate");

-- ========================================
-- 五、执行后检查
-- ========================================

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Team'
  AND column_name = 'sortOrder';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ProjectMember'
  AND column_name IN ('isArchived', 'archivedAt')
ORDER BY column_name;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('RecurringTaskSeries', 'PublicHoliday')
ORDER BY table_name;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Task'
  AND column_name IN ('recurringSeriesId', 'recurrenceDate')
ORDER BY column_name;
