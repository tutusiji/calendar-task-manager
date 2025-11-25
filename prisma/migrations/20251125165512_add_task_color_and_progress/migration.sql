-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "color" TEXT,
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0;
