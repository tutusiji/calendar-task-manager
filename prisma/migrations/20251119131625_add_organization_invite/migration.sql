-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ORG_INVITE_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'ORG_INVITE_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'ORG_INVITE_REJECTED';

-- CreateTable
CREATE TABLE "OrganizationInvite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "invitedUserId" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationInvite_organizationId_status_idx" ON "OrganizationInvite"("organizationId", "status");

-- CreateIndex
CREATE INDEX "OrganizationInvite_invitedUserId_status_idx" ON "OrganizationInvite"("invitedUserId", "status");

-- CreateIndex
CREATE INDEX "OrganizationInvite_inviterId_idx" ON "OrganizationInvite"("inviterId");

-- CreateIndex
CREATE INDEX "OrganizationInvite_createdAt_idx" ON "OrganizationInvite"("createdAt");

-- AddForeignKey
ALTER TABLE "OrganizationInvite" ADD CONSTRAINT "OrganizationInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvite" ADD CONSTRAINT "OrganizationInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvite" ADD CONSTRAINT "OrganizationInvite_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
