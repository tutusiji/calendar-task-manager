import { prisma } from '../lib/prisma'

async function verifyInviteCodes() {
  console.log('正在验证 OrganizationMember 的邀请码...\n')

  const members = await prisma.organizationMember.findMany({
    include: {
      user: { select: { name: true } },
      organization: { select: { name: true } }
    },
    orderBy: [
      { userId: 'asc' },
      { organizationId: 'asc' }
    ]
  })

  console.log(`总共 ${members.length} 个组织成员记录\n`)

  // 按用户分组
  const userGroups = new Map<string, typeof members>()
  for (const member of members) {
    if (!userGroups.has(member.userId)) {
      userGroups.set(member.userId, [])
    }
    userGroups.get(member.userId)!.push(member)
  }

  // 显示每个用户在不同组织的邀请码
  for (const [userId, userMembers] of userGroups) {
    const userName = userMembers[0].user.name
    console.log(`用户: ${userName} (${userId})`)
    
    for (const member of userMembers) {
      console.log(`  - ${member.organization.name}: ${member.inviteCode || '未生成'}`)
    }
    console.log()
  }

  // 检查唯一性
  const inviteCodes = members
    .map(m => m.inviteCode)
    .filter(code => code !== null) as string[]
  
  const uniqueCodes = new Set(inviteCodes)
  
  console.log(`\n统计信息:`)
  console.log(`- 总邀请码数: ${inviteCodes.length}`)
  console.log(`- 唯一邀请码数: ${uniqueCodes.size}`)
  console.log(`- 是否全部唯一: ${inviteCodes.length === uniqueCodes.size ? '✅ 是' : '❌ 否'}`)

  await prisma.$disconnect()
}

verifyInviteCodes().catch(console.error)
