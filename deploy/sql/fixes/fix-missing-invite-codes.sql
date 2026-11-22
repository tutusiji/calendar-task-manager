-- ========================================
-- 为缺失邀请码的组织成员生成邀请码
-- ========================================

DO $$
DECLARE
    member_record RECORD;
    new_invite_code TEXT;
    is_unique BOOLEAN;
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE '开始为缺失邀请码的成员生成邀请码...';
    
    FOR member_record IN 
        SELECT id, "userId", "organizationId" 
        FROM "OrganizationMember"
        WHERE "inviteCode" IS NULL
    LOOP
        -- 生成唯一的邀请码（6位大写字母和数字）
        LOOP
            -- 生成 6 位邀请码
            new_invite_code := UPPER(
                SUBSTRING(
                    CONCAT(
                        CHR(65 + (floor(random() * 26)::int)),
                        CHR(65 + (floor(random() * 26)::int)),
                        CHR(48 + (floor(random() * 10)::int)),
                        CHR(65 + (floor(random() * 26)::int)),
                        CHR(48 + (floor(random() * 10)::int)),
                        CHR(65 + (floor(random() * 26)::int))
                    ),
                    1, 6
                )
            );
            
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
        
        updated_count := updated_count + 1;
        RAISE NOTICE '✅ 为成员 % 生成邀请码: %', member_record.id, new_invite_code;
    END LOOP;
    
    RAISE NOTICE '完成！共为 % 个成员生成了邀请码', updated_count;
END $$;

-- 验证结果
SELECT 
    COUNT(*) as total_members,
    COUNT("inviteCode") as members_with_code,
    COUNT(*) - COUNT("inviteCode") as members_without_code
FROM "OrganizationMember";
