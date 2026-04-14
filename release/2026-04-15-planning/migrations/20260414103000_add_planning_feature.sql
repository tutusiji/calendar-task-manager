-- CreateEnum
CREATE TYPE "PlanningScopeType" AS ENUM ('PERSONAL', 'TEAM', 'PROJECT');

-- CreateTable
CREATE TABLE "PlanningBoard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "scopeType" "PlanningScopeType" NOT NULL,
    "ownerUserId" TEXT,
    "teamId" TEXT,
    "projectId" TEXT,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningBucket" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningCard" (
    "id" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "headerColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningCardItem" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningCardItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningCardAssignee" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanningCardAssignee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanningBoard_ownerUserId_idx" ON "PlanningBoard"("ownerUserId");

-- CreateIndex
CREATE INDEX "PlanningBoard_teamId_idx" ON "PlanningBoard"("teamId");

-- CreateIndex
CREATE INDEX "PlanningBoard_projectId_idx" ON "PlanningBoard"("projectId");

-- CreateIndex
CREATE INDEX "PlanningBoard_creatorId_idx" ON "PlanningBoard"("creatorId");

-- CreateIndex
CREATE INDEX "PlanningBoard_scopeType_idx" ON "PlanningBoard"("scopeType");

-- CreateIndex
CREATE INDEX "PlanningBucket_boardId_sortOrder_idx" ON "PlanningBucket"("boardId", "sortOrder");

-- CreateIndex
CREATE INDEX "PlanningCard_bucketId_sortOrder_idx" ON "PlanningCard"("bucketId", "sortOrder");

-- CreateIndex
CREATE INDEX "PlanningCard_creatorId_idx" ON "PlanningCard"("creatorId");

-- CreateIndex
CREATE INDEX "PlanningCardItem_cardId_sortOrder_idx" ON "PlanningCardItem"("cardId", "sortOrder");

-- CreateIndex
CREATE INDEX "PlanningCardItem_cardId_isCompleted_idx" ON "PlanningCardItem"("cardId", "isCompleted");

-- CreateIndex
CREATE INDEX "PlanningCardAssignee_cardId_idx" ON "PlanningCardAssignee"("cardId");

-- CreateIndex
CREATE INDEX "PlanningCardAssignee_userId_idx" ON "PlanningCardAssignee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningCardAssignee_cardId_userId_key" ON "PlanningCardAssignee"("cardId", "userId");

-- AddForeignKey
ALTER TABLE "PlanningBoard" ADD CONSTRAINT "PlanningBoard_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningBoard" ADD CONSTRAINT "PlanningBoard_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningBoard" ADD CONSTRAINT "PlanningBoard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningBoard" ADD CONSTRAINT "PlanningBoard_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningBucket" ADD CONSTRAINT "PlanningBucket_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "PlanningBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningCard" ADD CONSTRAINT "PlanningCard_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "PlanningBucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningCard" ADD CONSTRAINT "PlanningCard_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningCardItem" ADD CONSTRAINT "PlanningCardItem_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "PlanningCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningCardAssignee" ADD CONSTRAINT "PlanningCardAssignee_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "PlanningCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningCardAssignee" ADD CONSTRAINT "PlanningCardAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
