-- 创建任务负责人关系表
CREATE TABLE "TaskAssignee" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAssignee_pkey" PRIMARY KEY ("id")
);

-- 添加创建人字段（先允许为空，后面会填充）
ALTER TABLE "Task" ADD COLUMN "creatorId" TEXT;

-- 将现有的 userId 数据迁移到 TaskAssignee 表
INSERT INTO "TaskAssignee" ("id", "taskId", "userId", "createdAt")
SELECT 
    'mig_' || gen_random_uuid()::text,
    "id",
    "userId",
    "createdAt"
FROM "Task";

-- 将 userId 设置为 creatorId（保持向后兼容）
UPDATE "Task" SET "creatorId" = "userId";

-- 现在 creatorId 已经有值，设置为不可为空
ALTER TABLE "Task" ALTER COLUMN "creatorId" SET NOT NULL;

-- 删除旧的 userId 列
ALTER TABLE "Task" DROP COLUMN "userId";

-- 创建唯一索引
CREATE UNIQUE INDEX "TaskAssignee_taskId_userId_key" ON "TaskAssignee"("taskId", "userId");

-- 创建索引
CREATE INDEX "TaskAssignee_taskId_idx" ON "TaskAssignee"("taskId");
CREATE INDEX "TaskAssignee_userId_idx" ON "TaskAssignee"("userId");
CREATE INDEX "Task_creatorId_idx" ON "Task"("creatorId");

-- 添加外键约束
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
