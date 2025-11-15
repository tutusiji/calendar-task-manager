/*
  Warnings:

  - Added the required column `creatorId` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creatorId` to the `Team` table without a default value. This is not possible if the table is not empty.

*/

-- AlterTable
ALTER TABLE "User" ADD COLUMN "gender" TEXT DEFAULT '未设置';

-- 为现有的 Team 添加可空的 creatorId 列
ALTER TABLE "Team" ADD COLUMN "creatorId" TEXT;

-- 将所有现有团队的创建者设置为第一个用户
UPDATE "Team" SET "creatorId" = (SELECT "id" FROM "User" ORDER BY "createdAt" LIMIT 1) WHERE "creatorId" IS NULL;

-- 将 creatorId 设置为 NOT NULL
ALTER TABLE "Team" ALTER COLUMN "creatorId" SET NOT NULL;

-- 为现有的 Project 添加可空的 creatorId 列
ALTER TABLE "Project" ADD COLUMN "creatorId" TEXT;

-- 将所有现有项目的创建者设置为第一个用户
UPDATE "Project" SET "creatorId" = (SELECT "id" FROM "User" ORDER BY "createdAt" LIMIT 1) WHERE "creatorId" IS NULL;

-- 将 creatorId 设置为 NOT NULL
ALTER TABLE "Project" ALTER COLUMN "creatorId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Project_creatorId_idx" ON "Project"("creatorId");

-- CreateIndex
CREATE INDEX "Team_creatorId_idx" ON "Team"("creatorId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
