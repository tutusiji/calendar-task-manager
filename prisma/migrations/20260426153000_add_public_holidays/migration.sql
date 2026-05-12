CREATE TABLE "PublicHoliday" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PublicHoliday_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicHoliday_code_key" ON "PublicHoliday"("code");
CREATE INDEX "PublicHoliday_year_idx" ON "PublicHoliday"("year");
CREATE INDEX "PublicHoliday_startDate_endDate_idx" ON "PublicHoliday"("startDate", "endDate");
