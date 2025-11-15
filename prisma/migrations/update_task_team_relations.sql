-- Migration: 更新任务、团队和项目的关系
-- 1. 为Task添加teamId字段
-- 2. 移除Project的teamId字段（团队和项目是独立的）

-- Step 1: 添加Task.teamId字段
ALTER TABLE "Task" ADD COLUMN "teamId" TEXT;

-- Step 2: 创建索引
CREATE INDEX "Task_teamId_idx" ON "Task"("teamId");

-- Step 3: 添加外键约束
ALTER TABLE "Task" ADD CONSTRAINT "Task_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 4: 移除Project表中的teamId索引
DROP INDEX IF EXISTS "Project_teamId_idx";

-- Step 5: 移除Project.teamId的外键约束
ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_teamId_fkey";

-- Step 6: 删除Project表中的teamId列
ALTER TABLE "Project" DROP COLUMN IF EXISTS "teamId";
