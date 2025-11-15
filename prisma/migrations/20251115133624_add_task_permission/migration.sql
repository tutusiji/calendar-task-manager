-- CreateEnum
CREATE TYPE "TaskPermission" AS ENUM ('ALL_MEMBERS', 'CREATOR_ONLY');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "taskPermission" "TaskPermission" NOT NULL DEFAULT 'ALL_MEMBERS';

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "taskPermission" "TaskPermission" NOT NULL DEFAULT 'ALL_MEMBERS';
