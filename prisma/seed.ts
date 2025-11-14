import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('开始清空数据库...')
  
  // 清空现有数据
  await prisma.task.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.teamMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.team.deleteMany()
  await prisma.user.deleteMany()

  console.log('创建用户...')
  
  // 创建用户
  const alice = await prisma.user.create({
    data: {
      name: 'Alice',
      email: 'alice@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'
    }
  })

  const bob = await prisma.user.create({
    data: {
      name: 'Bob',
      email: 'bob@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob'
    }
  })

  const charlie = await prisma.user.create({
    data: {
      name: 'Charlie',
      email: 'charlie@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie'
    }
  })

  console.log('创建团队...')

  // 创建团队
  const engineeringTeam = await prisma.team.create({
    data: {
      name: '工程团队',
      color: '#3b82f6',
      description: '负责产品开发和技术实现',
      members: {
        create: [
          { userId: alice.id },
          { userId: bob.id }
        ]
      }
    }
  })

  const designTeam = await prisma.team.create({
    data: {
      name: '设计团队',
      color: '#8b5cf6',
      description: '负责产品设计和用户体验',
      members: {
        create: [
          { userId: charlie.id }
        ]
      }
    }
  })

  console.log('创建项目...')

  // 创建项目
  const webProject = await prisma.project.create({
    data: {
      name: 'Web 应用开发',
      color: '#10b981',
      description: '开发新的 Web 应用平台',
      teamId: engineeringTeam.id,
      members: {
        create: [
          { userId: alice.id },
          { userId: bob.id }
        ]
      }
    }
  })

  const mobileProject = await prisma.project.create({
    data: {
      name: '移动端开发',
      color: '#f59e0b',
      description: '开发 iOS 和 Android 应用',
      teamId: engineeringTeam.id,
      members: {
        create: [
          { userId: bob.id }
        ]
      }
    }
  })

  const designProject = await prisma.project.create({
    data: {
      name: 'UI 设计',
      color: '#ec4899',
      description: '产品界面和交互设计',
      teamId: designTeam.id,
      members: {
        create: [
          { userId: charlie.id }
        ]
      }
    }
  })

  console.log('创建任务...')

  // 创建任务
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  await prisma.task.createMany({
    data: [
      {
        title: '开发登录功能',
        description: '实现用户登录和认证系统',
        startDate: today,
        endDate: tomorrow,
        startTime: '09:00',
        endTime: '18:00',
        type: 'daily',
        userId: alice.id,
        projectId: webProject.id
      },
      {
        title: '团队周会',
        description: '讨论本周工作进展和下周计划',
        startDate: today,
        endDate: today,
        startTime: '14:00',
        endTime: '15:00',
        type: 'meeting',
        userId: alice.id,
        projectId: webProject.id
      },
      {
        title: 'API 接口开发',
        description: '开发后端 RESTful API',
        startDate: tomorrow,
        endDate: nextWeek,
        type: 'daily',
        userId: bob.id,
        projectId: mobileProject.id
      },
      {
        title: '界面原型设计',
        description: '设计应用主要页面的原型',
        startDate: today,
        endDate: nextWeek,
        type: 'daily',
        userId: charlie.id,
        projectId: designProject.id
      },
      {
        title: '年假',
        description: '休年假',
        startDate: nextWeek,
        endDate: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000),
        type: 'vacation',
        userId: bob.id,
        projectId: mobileProject.id
      }
    ]
  })

  console.log('✅ 数据库初始化完成!')
  console.log(`创建了 3 个用户`)
  console.log(`创建了 2 个团队`)
  console.log(`创建了 3 个项目`)
  console.log(`创建了 5 个任务`)
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
