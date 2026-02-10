-- AlterTable
ALTER TABLE "Project" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Project_isArchived_idx" ON "Project"("isArchived");
