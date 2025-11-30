-- 检查 defaultTeamId 字段是否存在
-- 如果存在，这个查询会返回结果；如果不存在，返回空
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'User' AND column_name = 'defaultTeamId';

-- 如果上面的查询返回空，执行以下命令添加字段：
-- ALTER TABLE "User" ADD COLUMN "defaultTeamId" TEXT;

-- 初始化 defaultTeamId：为每个用户设置为其所在团队的第一个ID
-- 这个查询会为每个用户设置 defaultTeamId 为他们所在团队中创建时间最早的团队
UPDATE "User" u
SET "defaultTeamId" = (
  SELECT t.id
  FROM "Team" t
  INNER JOIN "TeamMember" tm ON t.id = tm."teamId"
  WHERE tm."userId" = u.id
  ORDER BY t."createdAt" ASC
  LIMIT 1
)
WHERE "defaultTeamId" IS NULL
AND EXISTS (
  SELECT 1 FROM "TeamMember" tm WHERE tm."userId" = u.id
);

-- 验证结果
SELECT id, username, "defaultTeamId" FROM "User" LIMIT 10;
