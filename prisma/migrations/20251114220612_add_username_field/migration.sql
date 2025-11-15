/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN "username" TEXT NOT NULL DEFAULT '';

-- 为现有用户设置 username（从邮箱提取用户名部分）
UPDATE "User" SET "username" = SPLIT_PART("email", '@', 1) WHERE "username" = '';

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
