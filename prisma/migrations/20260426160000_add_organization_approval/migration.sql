ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "joinRequiresApproval" BOOLEAN NOT NULL DEFAULT false;
