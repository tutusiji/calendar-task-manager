/*
  Warnings:

  - A unique constraint covering the columns `[inviteCode]` on the table `OrganizationMember` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "OrganizationMember" ADD COLUMN     "inviteCode" TEXT;

-- 数据迁移：为每个组织成员生成唯一的邀请码
-- 使用 md5(userId || organizationId || random()) 生成 8 位大写十六进制邀请码
DO $$
DECLARE
    member_record RECORD;
    new_invite_code TEXT;
    is_unique BOOLEAN;
BEGIN
    FOR member_record IN 
        SELECT id, "userId", "organizationId" 
        FROM "OrganizationMember"
    LOOP
        -- 生成唯一的邀请码
        LOOP
            -- 生成 8 位大写十六进制邀请码
            new_invite_code := UPPER(SUBSTRING(MD5(
                member_record."userId" || 
                member_record."organizationId" || 
                gen_random_uuid()::text
            ), 1, 8));
            
            -- 检查是否唯一
            SELECT NOT EXISTS (
                SELECT 1 FROM "OrganizationMember" WHERE "inviteCode" = new_invite_code
            ) INTO is_unique;
            
            EXIT WHEN is_unique;
        END LOOP;
        
        -- 更新记录
        UPDATE "OrganizationMember" 
        SET "inviteCode" = new_invite_code 
        WHERE id = member_record.id;
    END LOOP;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_inviteCode_key" ON "OrganizationMember"("inviteCode");

-- CreateIndex
CREATE INDEX "OrganizationMember_inviteCode_idx" ON "OrganizationMember"("inviteCode");
