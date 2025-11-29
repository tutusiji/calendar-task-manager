import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('开始创建示例组织数据...')

  // 创建两个组织
  const org1 = await prisma.organization.create({
    data: {
      name: '牛马科技有限公司',
      description: '一家专注于创新的科技公司',
      isVerified: true,
      creator: {
        create: {
          username: 'admin_niumatech',
          password: await hashPassword('123456'),
          name: '张三',
          email: 'zhangsan@niumatech.com',
          role: '产品经理',
          avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=zhangsan',
        },
      },
    },
  })

  // 获取创建者
  const creator1 = await prisma.user.findFirst({
    where: { username: 'admin_niumatech' },
  })

  if (!creator1) {
    throw new Error('创建者不存在')
  }

  // 将创建者设置为组织所有者并设为当前组织
  await prisma.organizationMember.create({
    data: {
      userId: creator1.id,
      organizationId: org1.id,
      role: 'OWNER',
    },
  })

  await prisma.user.update({
    where: { id: creator1.id },
    data: { currentOrganizationId: org1.id },
  })

  // 为组织1创建更多成员
  const members1 = [
    { username: 'lisi_nm', name: '李四', email: 'lisi@niumatech.com', role: '前端开发' },
    { username: 'wangwu_nm', name: '王五', email: 'wangwu@niumatech.com', role: '后端开发' },
    { username: 'zhaoliu_nm', name: '赵六', email: 'zhaoliu@niumatech.com', role: '设计师' },
  ]

  for (const memberData of members1) {
    const user = await prisma.user.create({
      data: {
        username: memberData.username,
        password: await hashPassword('123456'),
        name: memberData.name,
        email: memberData.email,
        role: memberData.role,
        avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${memberData.username}`,
        currentOrganizationId: org1.id,
      },
    })

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: org1.id,
        role: 'MEMBER',
      },
    })
  }

  // 为组织1创建团队
  const allMembers1 = await prisma.user.findMany({
    where: {
      organizationMembers: {
        some: { organizationId: org1.id },
      },
    },
  })

  const team1 = await prisma.team.create({
    data: {
      name: '产品研发团队',
      color: '#3b82f6',
      description: '负责产品的设计和开发',
      organizationId: org1.id,
      creatorId: creator1.id,
      members: {
        create: allMembers1.map((user) => ({ userId: user.id })),
      },
    },
  })

  // 为组织1创建项目
  const project1 = await prisma.project.create({
    data: {
      name: '移动应用开发项目',
      color: '#10b981',
      description: '开发一款创新的移动应用',
      organizationId: org1.id,
      creatorId: creator1.id,
      members: {
        create: allMembers1.slice(0, 3).map((user) => ({ userId: user.id })),
      },
    },
  })

  // 为项目创建一些任务
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  await prisma.task.create({
    data: {
      title: '需求分析会议',
      description: '讨论项目需求和技术方案',
      startDate: today,
      endDate: today,
      startTime: '10:00',
      endTime: '12:00',
      type: 'meeting',
      userId: creator1.id,
      projectId: project1.id,
      teamId: team1.id,
    },
  })

  console.log('✅ 牛马科技有限公司数据创建完成')

  // 创建第二个组织
  const org2 = await prisma.organization.create({
    data: {
      name: '吧啦吧啦小魔仙科技',
      description: '充满魔法的创意科技公司',
      isVerified: true,
      creator: {
        create: {
          username: 'admin_balabala',
          password: await hashPassword('123456'),
          name: '小蓝',
          email: 'xiaolan@balabala.com',
          role: '项目管理',
          avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=xiaolan',
        },
      },
    },
  })

  const creator2 = await prisma.user.findFirst({
    where: { username: 'admin_balabala' },
  })

  if (!creator2) {
    throw new Error('创建者2不存在')
  }

  await prisma.organizationMember.create({
    data: {
      userId: creator2.id,
      organizationId: org2.id,
      role: 'OWNER',
    },
  })

  await prisma.user.update({
    where: { id: creator2.id },
    data: { currentOrganizationId: org2.id },
  })

  // 为组织2创建成员
  const members2 = [
    { username: 'xiaomei_bb', name: '小美', email: 'xiaomei@balabala.com', role: '交互设计师' },
    { username: 'xiaoqi_bb', name: '小奇', email: 'xiaoqi@balabala.com', role: '前端开发' },
    { username: 'xiaoya_bb', name: '小雅', email: 'xiaoya@balabala.com', role: '后端开发' },
  ]

  for (const memberData of members2) {
    const user = await prisma.user.create({
      data: {
        username: memberData.username,
        password: await hashPassword('123456'),
        name: memberData.name,
        email: memberData.email,
        role: memberData.role,
        avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${memberData.username}`,
        currentOrganizationId: org2.id,
      },
    })

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: org2.id,
        role: 'MEMBER',
      },
    })
  }

  // 为组织2创建团队
  const allMembers2 = await prisma.user.findMany({
    where: {
      organizationMembers: {
        some: { organizationId: org2.id },
      },
    },
  })

  const team2 = await prisma.team.create({
    data: {
      name: '魔法开发小组',
      color: '#ec4899',
      description: '用魔法般的创意开发产品',
      organizationId: org2.id,
      creatorId: creator2.id,
      members: {
        create: allMembers2.map((user) => ({ userId: user.id })),
      },
    },
  })

  // 为组织2创建项目
  const project2 = await prisma.project.create({
    data: {
      name: '魔法世界网站',
      color: '#a855f7',
      description: '打造一个充满魔法的互动网站',
      organizationId: org2.id,
      creatorId: creator2.id,
      members: {
        create: allMembers2.slice(0, 3).map((user) => ({ userId: user.id })),
      },
    },
  })

  // 为项目创建任务
  await prisma.task.create({
    data: {
      title: '魔法界面设计',
      description: '设计充满魔法元素的用户界面',
      startDate: today,
      endDate: tomorrow,
      startTime: '14:00',
      endTime: '18:00',
      type: 'daily',
      userId: creator2.id,
      projectId: project2.id,
      teamId: team2.id,
    },
  })

  console.log('✅ 吧啦吧啦小魔仙科技数据创建完成')

  // 创建个人项目
  for (const user of [...allMembers1, ...allMembers2]) {
    await prisma.project.create({
      data: {
        name: `${user.name}的个人事务`,
        color: '#3b82f6',
        description: '个人日常任务和事项',
        organizationId: user.currentOrganizationId!,
        creatorId: user.id,
        members: {
          create: {
            userId: user.id,
          },
        },
      },
    })
  }

  console.log('✅ 个人项目创建完成')

  console.log('\n======================')
  console.log('示例数据创建完成！')
  console.log('======================')
  console.log('\n组织1: 牛马科技有限公司')
  console.log('  管理员: admin_niumatech / 123456')
  console.log('  成员: lisi_nm, wangwu_nm, zhaoliu_nm / 123456')
  console.log('\n组织2: 吧啦吧啦小魔仙科技')
  console.log('  管理员: admin_balabala / 123456')
  console.log('  成员: xiaomei_bb, xiaoqi_bb, xiaoya_bb / 123456')
  console.log('======================\n')
}

main()
  .catch((e) => {
    console.error('错误:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
