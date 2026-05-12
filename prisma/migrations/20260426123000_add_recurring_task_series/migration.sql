DO $$
BEGIN
  CREATE TYPE "TaskRecurrenceType" AS ENUM ('WEEKLY', 'MONTHLY', 'INTERVAL_DAYS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE "RecurringTaskSeries" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "startTime" TEXT,
  "endTime" TEXT,
  "type" "TaskType" NOT NULL,
  "color" TEXT,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "recurrenceType" "TaskRecurrenceType" NOT NULL,
  "intervalDays" INTEGER,
  "assigneeIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "creatorId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "teamId" TEXT,
  "generatedUntil" TIMESTAMP(3),
  "stopsAfter" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RecurringTaskSeries_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Task"
  ADD COLUMN "recurringSeriesId" TEXT,
  ADD COLUMN "recurrenceDate" TIMESTAMP(3);

ALTER TABLE "RecurringTaskSeries"
  ADD CONSTRAINT "RecurringTaskSeries_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecurringTaskSeries"
  ADD CONSTRAINT "RecurringTaskSeries_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecurringTaskSeries"
  ADD CONSTRAINT "RecurringTaskSeries_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_recurringSeriesId_fkey"
  FOREIGN KEY ("recurringSeriesId") REFERENCES "RecurringTaskSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "RecurringTaskSeries_creatorId_idx" ON "RecurringTaskSeries"("creatorId");
CREATE INDEX "RecurringTaskSeries_projectId_idx" ON "RecurringTaskSeries"("projectId");
CREATE INDEX "RecurringTaskSeries_teamId_idx" ON "RecurringTaskSeries"("teamId");
CREATE INDEX "RecurringTaskSeries_generatedUntil_idx" ON "RecurringTaskSeries"("generatedUntil");
CREATE INDEX "RecurringTaskSeries_stopsAfter_idx" ON "RecurringTaskSeries"("stopsAfter");
CREATE INDEX "Task_recurringSeriesId_idx" ON "Task"("recurringSeriesId");
CREATE UNIQUE INDEX "Task_recurringSeriesId_recurrenceDate_key" ON "Task"("recurringSeriesId", "recurrenceDate");
