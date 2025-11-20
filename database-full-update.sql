-- ========================================
-- 完整数据库更新脚本
-- 2025年11月20日
-- ========================================

-- 1. 添加邀请码相关字段和枚举
-- ========================================

-- 添加 USER_INVITED_JOINED 通知类型
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'USER_INVITED_JOINED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')
    ) THEN
        ALTER TYPE "NotificationType" ADD VALUE 'USER_INVITED_JOINED';
    END IF;
END $$;

-- 为 User 表添加 inviteCode 字段
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inviteCode" TEXT;

-- 创建唯一索引（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'User_inviteCode_key'
    ) THEN
        CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");
    END IF;
END $$;

-- 为 OrganizationJoinRequest 添加 inviterId 字段
ALTER TABLE "OrganizationJoinRequest" ADD COLUMN IF NOT EXISTS "inviterId" TEXT;

-- 创建索引
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'OrganizationJoinRequest_inviterId_idx'
    ) THEN
        CREATE INDEX "OrganizationJoinRequest_inviterId_idx" ON "OrganizationJoinRequest"("inviterId");
    END IF;
END $$;

-- 为 OrganizationMember 添加 inviterId 字段
ALTER TABLE "OrganizationMember" ADD COLUMN IF NOT EXISTS "inviterId" TEXT;

-- 创建索引
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'OrganizationMember_inviterId_idx'
    ) THEN
        CREATE INDEX "OrganizationMember_inviterId_idx" ON "OrganizationMember"("inviterId");
    END IF;
END $$;

-- 添加外键约束（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'OrganizationMember_inviterId_fkey'
    ) THEN
        ALTER TABLE "OrganizationMember" 
        ADD CONSTRAINT "OrganizationMember_inviterId_fkey" 
        FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'OrganizationJoinRequest_inviterId_fkey'
    ) THEN
        ALTER TABLE "OrganizationJoinRequest" 
        ADD CONSTRAINT "OrganizationJoinRequest_inviterId_fkey" 
        FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 2. 为 OrganizationMember 添加邀请码
-- ========================================

-- 添加 inviteCode 字段
ALTER TABLE "OrganizationMember" ADD COLUMN IF NOT EXISTS "inviteCode" TEXT;

-- 为现有记录生成唯一邀请码（如果还没有）
DO $$
DECLARE
    member_record RECORD;
    new_invite_code TEXT;
    is_unique BOOLEAN;
BEGIN
    FOR member_record IN 
        SELECT id, "userId", "organizationId" 
        FROM "OrganizationMember"
        WHERE "inviteCode" IS NULL
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

-- 创建唯一索引
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'OrganizationMember_inviteCode_key'
    ) THEN
        CREATE UNIQUE INDEX "OrganizationMember_inviteCode_key" ON "OrganizationMember"("inviteCode");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'OrganizationMember_inviteCode_idx'
    ) THEN
        CREATE INDEX "OrganizationMember_inviteCode_idx" ON "OrganizationMember"("inviteCode");
    END IF;
END $$;

-- 3. 创建组织邀请系统
-- ========================================

-- 创建 InviteStatus 枚举类型
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InviteStatus') THEN
        CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');
    END IF;
END $$;

-- 添加组织邀请相关通知类型
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ORG_INVITE_RECEIVED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')
    ) THEN
        ALTER TYPE "NotificationType" ADD VALUE 'ORG_INVITE_RECEIVED';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ORG_INVITE_ACCEPTED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')
    ) THEN
        ALTER TYPE "NotificationType" ADD VALUE 'ORG_INVITE_ACCEPTED';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ORG_INVITE_REJECTED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')
    ) THEN
        ALTER TYPE "NotificationType" ADD VALUE 'ORG_INVITE_REJECTED';
    END IF;
END $$;

-- 创建 OrganizationInvite 表
CREATE TABLE IF NOT EXISTS "OrganizationInvite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "invitedUserId" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrganizationInvite_pkey" PRIMARY KEY ("id")
);

-- 创建索引
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'OrganizationInvite_organizationId_status_idx'
    ) THEN
        CREATE INDEX "OrganizationInvite_organizationId_status_idx" ON "OrganizationInvite"("organizationId", "status");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'OrganizationInvite_invitedUserId_status_idx'
    ) THEN
        CREATE INDEX "OrganizationInvite_invitedUserId_status_idx" ON "OrganizationInvite"("invitedUserId", "status");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'OrganizationInvite_inviterId_idx'
    ) THEN
        CREATE INDEX "OrganizationInvite_inviterId_idx" ON "OrganizationInvite"("inviterId");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'OrganizationInvite_createdAt_idx'
    ) THEN
        CREATE INDEX "OrganizationInvite_createdAt_idx" ON "OrganizationInvite"("createdAt");
    END IF;
END $$;

-- 添加外键约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'OrganizationInvite_organizationId_fkey'
    ) THEN
        ALTER TABLE "OrganizationInvite" 
        ADD CONSTRAINT "OrganizationInvite_organizationId_fkey" 
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'OrganizationInvite_inviterId_fkey'
    ) THEN
        ALTER TABLE "OrganizationInvite" 
        ADD CONSTRAINT "OrganizationInvite_inviterId_fkey" 
        FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'OrganizationInvite_invitedUserId_fkey'
    ) THEN
        ALTER TABLE "OrganizationInvite" 
        ADD CONSTRAINT "OrganizationInvite_invitedUserId_fkey" 
        FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 4. 添加删除通知类型
-- ========================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ORG_MEMBER_REMOVED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')
    ) THEN
        ALTER TYPE "NotificationType" ADD VALUE 'ORG_MEMBER_REMOVED';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'TEAM_DELETED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')
    ) THEN
        ALTER TYPE "NotificationType" ADD VALUE 'TEAM_DELETED';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'PROJECT_DELETED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')
    ) THEN
        ALTER TYPE "NotificationType" ADD VALUE 'PROJECT_DELETED';
    END IF;
END $$;

-- 5. 添加积分系统
-- ========================================

-- 为 User 表添加 points 字段
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 0;

-- ========================================
-- 更新完成！
-- ========================================

-- 验证所有更新
SELECT 'Database update completed!' as status;

-- 显示当前的 NotificationType 枚举值
SELECT enum_range(NULL::"NotificationType") as notification_types;

-- 显示 User 表结构
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'User' 
ORDER BY ordinal_position;
