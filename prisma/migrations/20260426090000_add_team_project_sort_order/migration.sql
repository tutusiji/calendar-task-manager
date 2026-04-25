ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Team_organizationId_sortOrder_idx" ON "Team"("organizationId", "sortOrder");
CREATE INDEX IF NOT EXISTS "Project_organizationId_sortOrder_idx" ON "Project"("organizationId", "sortOrder");

WITH ranked_teams AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "organizationId" ORDER BY name ASC, "createdAt" ASC) - 1 AS rn
  FROM "Team"
)
UPDATE "Team"
SET "sortOrder" = ranked_teams.rn
FROM ranked_teams
WHERE "Team".id = ranked_teams.id;

WITH ranked_projects AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "organizationId" ORDER BY "createdAt" ASC, name ASC) - 1 AS rn
  FROM "Project"
)
UPDATE "Project"
SET "sortOrder" = ranked_projects.rn
FROM ranked_projects
WHERE "Project".id = ranked_projects.id;
