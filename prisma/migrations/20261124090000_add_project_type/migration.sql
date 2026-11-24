BEGIN;

CREATE TYPE "ProjectType" AS ENUM ('PERSONAL', 'STANDARD');

ALTER TABLE "Project"
    ADD COLUMN "type" "ProjectType" NOT NULL DEFAULT 'STANDARD';

-- Match the old provisioning paths using their defaults and creator membership.
-- Names and descriptions are used only for this one-time backfill.
UPDATE "Project" AS project
SET "type" = 'PERSONAL'
WHERE (project."name" = '个人事务' OR project."name" LIKE '%的个人事务')
  AND EXISTS (
      SELECT 1 FROM "ProjectMember" AS member
      WHERE member."projectId" = project."id" AND member."userId" = project."creatorId"
  )
  AND (
      (project."color" = '#3b82f6' AND project."description" = '个人日常任务和事项')
      OR (
          lower(project."color") = '#8b5cf6' AND project."taskPermission" = 'CREATOR_ONLY'
          AND (
              project."description" = project."name" || '管理'
              OR (
                  project."description" IS NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM "ProjectMember" AS member
                      WHERE member."projectId" = project."id" AND member."userId" <> project."creatorId"
                  )
              )
          )
      )
  );

-- If historical projects conflict, fail and roll back so they can be reviewed.
CREATE UNIQUE INDEX "Project_personal_organization_creator_key"
    ON "Project" ("organizationId", "creatorId") WHERE "type" = 'PERSONAL';

COMMIT;
