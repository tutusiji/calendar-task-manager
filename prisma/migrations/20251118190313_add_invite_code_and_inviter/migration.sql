/*
  Warnings:

  - A unique constraint covering the columns `[inviteCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'USER_INVITED_JOINED';

-- AlterTable
ALTER TABLE "OrganizationJoinRequest" ADD COLUMN     "inviterId" TEXT;

-- AlterTable
ALTER TABLE "OrganizationMember" ADD COLUMN     "inviterId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "inviteCode" TEXT;

-- CreateIndex
CREATE INDEX "OrganizationJoinRequest_inviterId_idx" ON "OrganizationJoinRequest"("inviterId");

-- CreateIndex
CREATE INDEX "OrganizationMember_inviterId_idx" ON "OrganizationMember"("inviterId");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationJoinRequest" ADD CONSTRAINT "OrganizationJoinRequest_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
