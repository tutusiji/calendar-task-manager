import { prisma } from '../lib/prisma'

/**
 * 为没有邀请码的组织成员生成邀请码
 */
async function fixMissingInviteCodes() {
  console.log('开始为缺失邀请码的成员生成邀请码...')

  // 查找所有没有邀请码的成员
  const membersWithoutCode = await prisma.organizationMember.findMany({
    where: {
      inviteCode: null,
    },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      user: {
        select: {
          name: true,
        },
      },
      organization: {
        select: {
          name: true,
        },
      },
    },
  })

  console.log(`找到 ${membersWithoutCode.length} 个缺失邀请码的成员`)

  if (membersWithoutCode.length === 0) {
    console.log('所有成员都已有邀请码，无需处理')
    return
  }

  // 生成邀请码函数
  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  // 获取所有已存在的邀请码
  const existingCodes = new Set(
    (
      await prisma.organizationMember.findMany({
        where: {
          inviteCode: { not: null },
        },
        select: { inviteCode: true },
      })
    ).map((m) => m.inviteCode)
  )

  let updatedCount = 0

  // 为每个成员生成唯一的邀请码
  for (const member of membersWithoutCode) {
    let inviteCode = generateInviteCode()

    // 确保邀请码唯一
    while (existingCodes.has(inviteCode)) {
      inviteCode = generateInviteCode()
    }

    existingCodes.add(inviteCode)

    // 更新成员记录
    await prisma.organizationMember.update({
      where: { id: member.id },
      data: { inviteCode },
    })

    console.log(
      `✅ 为 ${member.user.name} (${member.organization.name}) 生成邀请码: ${inviteCode}`
    )
    updatedCount++
  }

  console.log(`\n完成！共为 ${updatedCount} 个成员生成了邀请码`)
}

// 执行脚本
fixMissingInviteCodes()
  .then(() => {
    console.log('脚本执行成功')
    process.exit(0)
  })
  .catch((error) => {
    console.error('脚本执行失败:', error)
    process.exit(1)
  })
