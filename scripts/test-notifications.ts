import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('创建测试申请和通知...\n')

  // 获取第一个用户和组织
  const users = await prisma.user.findMany({ take: 2 })
  const orgs = await prisma.organization.findMany({ take: 1 })

  if (users.length < 2 || orgs.length < 1) {
    console.log('需要至少2个用户和1个组织')
    return
  }

  const [applicant, creator] = users
  const org = orgs[0]

  console.log(`申请人: ${applicant.name} (${applicant.email})`)
  console.log(`组织创建者: ${creator.name} (${creator.email})`)
  console.log(`组织: ${org.name}\n`)

  // 1. 创建加入申请
  const request = await prisma.organizationJoinRequest.create({
    data: {
      organizationId: org.id,
      applicantId: applicant.id,
      message: '希望加入贵组织，共同完成项目目标',
      status: 'PENDING',
    },
  })

  console.log(`✓ 创建申请: ${request.id}`)

  // 2. 给组织创建者发送通知
  const notification = await prisma.notification.create({
    data: {
      userId: creator.id,
      type: 'ORG_JOIN_REQUEST',
      title: '新的加入申请',
      content: `${applicant.name} 申请加入 ${org.name}`,
      metadata: {
        requestId: request.id,
        organizationId: org.id,
        organizationName: org.name,
        applicantId: applicant.id,
        applicantName: applicant.name,
        message: '希望加入贵组织，共同完成项目目标',
      },
    },
  })

  console.log(`✓ 创建通知: ${notification.id}`)

  // 3. 查询通知
  const unreadCount = await prisma.notification.count({
    where: {
      userId: creator.id,
      isRead: false,
    },
  })

  console.log(`\n未读消息数: ${unreadCount}`)

  console.log('\n✓ 测试数据创建完成！')
  console.log('\n现在可以：')
  console.log(`1. 以 ${creator.name} (${creator.email}) 登录`)
  console.log('2. 点击顶部的铃铛图标查看消息')
  console.log('3. 点击"同意"或"拒绝"按钮处理申请')
}

main()
  .catch((e) => {
    console.error('错误:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
