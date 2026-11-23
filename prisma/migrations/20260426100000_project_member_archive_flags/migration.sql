ALTER TABLE "ProjectMember" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProjectMember" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ProjectMember_userId_isArchived_idx"
  ON "ProjectMember"("userId", "isArchived");

-- 兼容旧的全局归档逻辑：把 Project 上的归档状态一次性回填到成员维度
-- On a fresh database add_project_archive runs later, so there is no legacy data to copy.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'Project'
      AND column_name = 'isArchived'
  ) THEN
    UPDATE "ProjectMember" pm
    SET
      "isArchived" = p."isArchived",
      "archivedAt" = p."archivedAt"
    FROM "Project" p
    WHERE pm."projectId" = p.id
      AND p."isArchived" = true;
  END IF;
END $$;
