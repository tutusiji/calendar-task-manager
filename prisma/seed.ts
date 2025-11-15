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
  
  // 创建 6 个用户（中文名字）
  const zhangsan = await prisma.user.create({
    data: {
      name: '张三',
      email: 'zhangsan@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangsan'
    }
  })

  const lisi = await prisma.user.create({
    data: {
      name: '李四',
      email: 'lisi@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisi'
    }
  })

  const wangwu = await prisma.user.create({
    data: {
      name: '王五',
      email: 'wangwu@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangwu'
    }
  })

  const zhaoliu = await prisma.user.create({
    data: {
      name: '赵六',
      email: 'zhaoliu@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhaoliu'
    }
  })

  const sunqi = await prisma.user.create({
    data: {
      name: '孙七',
      email: 'sunqi@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sunqi'
    }
  })

  const zhouba = await prisma.user.create({
    data: {
      name: '周八',
      email: 'zhouba@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhouba'
    }
  })

  console.log('创建团队...')

  // 创建 4 个团队
  const engineeringTeam = await prisma.team.create({
    data: {
      name: '工程团队',
      color: '#3b82f6',
      description: '负责产品开发和技术实现',
      members: {
        create: [
          { userId: zhangsan.id },
          { userId: lisi.id },
          { userId: wangwu.id }
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
          { userId: zhaoliu.id },
          { userId: sunqi.id }
        ]
      }
    }
  })

  const marketingTeam = await prisma.team.create({
    data: {
      name: '市场团队',
      color: '#ec4899',
      description: '负责市场推广和品牌建设',
      members: {
        create: [
          { userId: zhouba.id },
          { userId: zhaoliu.id }
        ]
      }
    }
  })

  const managementTeam = await prisma.team.create({
    data: {
      name: '管理团队',
      color: '#f59e0b',
      description: '负责公司战略规划和决策',
      members: {
        create: [
          { userId: zhangsan.id },
          { userId: zhaoliu.id },
          { userId: zhouba.id }
        ]
      }
    }
  })

  console.log('创建项目...')

  // 创建 6 个项目
  const webProject = await prisma.project.create({
    data: {
      name: 'Web 应用开发',
      color: '#10b981',
      description: '开发新的 Web 应用平台',
      teamId: engineeringTeam.id,
      members: {
        create: [
          { userId: zhangsan.id },
          { userId: lisi.id }
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
          { userId: lisi.id },
          { userId: wangwu.id }
        ]
      }
    }
  })

  const designProject = await prisma.project.create({
    data: {
      name: 'UI/UX 设计',
      color: '#ec4899',
      description: '产品界面和交互设计',
      teamId: designTeam.id,
      members: {
        create: [
          { userId: zhaoliu.id },
          { userId: sunqi.id }
        ]
      }
    }
  })

  const marketingProject = await prisma.project.create({
    data: {
      name: 'Q4 市场推广',
      color: '#06b6d4',
      description: '第四季度市场营销活动',
      teamId: marketingTeam.id,
      members: {
        create: [
          { userId: zhouba.id },
          { userId: zhaoliu.id }
        ]
      }
    }
  })

  const personalProject = await prisma.project.create({
    data: {
      name: '个人事务',
      color: '#6366f1',
      description: '个人日常任务和事项',
      members: {
        create: [
          { userId: zhangsan.id }
        ]
      }
    }
  })

  const researchProject = await prisma.project.create({
    data: {
      name: 'AI 技术研究',
      color: '#8b5cf6',
      description: '人工智能技术研究和应用',
      teamId: engineeringTeam.id,
      members: {
        create: [
          { userId: zhangsan.id },
          { userId: wangwu.id }
        ]
      }
    }
  })

  console.log('创建任务...')

  // 创建 25+ 个任务，覆盖多种场景
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const lastWeek = new Date(today)
  lastWeek.setDate(lastWeek.getDate() - 7)
  const twoWeeksLater = new Date(today)
  twoWeeksLater.setDate(twoWeeksLater.getDate() + 14)

  await prisma.task.createMany({
    data: [
      // 张三的任务（Web 开发）
      {
        title: '开发登录功能',
        description: '实现用户登录和认证系统，包括 JWT token 管理',
        startDate: yesterday,
        endDate: tomorrow,
        startTime: '09:00',
        endTime: '18:00',
        type: 'daily',
        userId: zhangsan.id,
        projectId: webProject.id
      },
      {
        title: '团队周会',
        description: '讨论本周工作进展和下周计划',
        startDate: today,
        endDate: today,
        startTime: '14:00',
        endTime: '15:30',
        type: 'meeting',
        userId: zhangsan.id,
        projectId: webProject.id
      },
      {
        title: '代码审查',
        description: '审查团队成员的 PR',
        startDate: today,
        endDate: today,
        startTime: '16:00',
        endTime: '17:00',
        type: 'daily',
        userId: zhangsan.id,
        projectId: webProject.id
      },
      {
        title: 'AI 模型调研',
        description: '研究最新的 LLM 模型',
        startDate: tomorrow,
        endDate: nextWeek,
        type: 'daily',
        userId: zhangsan.id,
        projectId: researchProject.id
      },
      {
        title: '体检',
        description: '年度体检',
        startDate: nextWeek,
        endDate: nextWeek,
        startTime: '08:00',
        endTime: '12:00',
        type: 'daily',
        userId: zhangsan.id,
        projectId: personalProject.id
      },

      // 李四的任务（Web + Mobile）
      {
        title: 'API 接口开发',
        description: '开发后端 RESTful API',
        startDate: lastWeek,
        endDate: tomorrow,
        type: 'daily',
        userId: lisi.id,
        projectId: webProject.id
      },
      {
        title: 'iOS 适配',
        description: '适配 iOS 14+ 系统',
        startDate: today,
        endDate: nextWeek,
        type: 'daily',
        userId: lisi.id,
        projectId: mobileProject.id
      },
      {
        title: '客户演示',
        description: '向客户演示新功能',
        startDate: tomorrow,
        endDate: tomorrow,
        startTime: '10:00',
        endTime: '11:30',
        type: 'meeting',
        userId: lisi.id,
        projectId: mobileProject.id
      },
      {
        title: '性能优化',
        description: '优化应用启动速度',
        startDate: nextWeek,
        endDate: twoWeeksLater,
        type: 'daily',
        userId: lisi.id,
        projectId: mobileProject.id
      },

      // 王五的任务（Mobile + Research）
      {
        title: 'Android 开发',
        description: '开发 Android 端功能',
        startDate: yesterday,
        endDate: nextWeek,
        type: 'daily',
        userId: wangwu.id,
        projectId: mobileProject.id
      },
      {
        title: '单元测试',
        description: '编写单元测试用例',
        startDate: today,
        endDate: tomorrow,
        type: 'daily',
        userId: wangwu.id,
        projectId: mobileProject.id
      },
      {
        title: '技术分享会',
        description: '分享 React Native 最佳实践',
        startDate: nextWeek,
        endDate: nextWeek,
        startTime: '15:00',
        endTime: '16:30',
        type: 'meeting',
        userId: wangwu.id,
        projectId: mobileProject.id
      },
      {
        title: '机器学习实验',
        description: '训练图像识别模型',
        startDate: tomorrow,
        endDate: twoWeeksLater,
        type: 'daily',
        userId: wangwu.id,
        projectId: researchProject.id
      },

      // 赵六的任务（Design + Marketing）
      {
        title: '界面原型设计',
        description: '设计应用主要页面的原型',
        startDate: lastWeek,
        endDate: tomorrow,
        type: 'daily',
        userId: zhaoliu.id,
        projectId: designProject.id
      },
      {
        title: '用户访谈',
        description: '收集用户反馈',
        startDate: today,
        endDate: today,
        startTime: '10:00',
        endTime: '12:00',
        type: 'meeting',
        userId: zhaoliu.id,
        projectId: designProject.id
      },
      {
        title: '设计评审',
        description: '评审新版设计稿',
        startDate: tomorrow,
        endDate: tomorrow,
        startTime: '14:00',
        endTime: '15:30',
        type: 'meeting',
        userId: zhaoliu.id,
        projectId: designProject.id
      },
      {
        title: '品牌策划',
        description: '制定品牌推广策略',
        startDate: today,
        endDate: nextWeek,
        type: 'daily',
        userId: zhaoliu.id,
        projectId: marketingProject.id
      },

      // 孙七的任务（Design）
      {
        title: '图标设计',
        description: '设计应用图标和 Logo',
        startDate: yesterday,
        endDate: today,
        type: 'daily',
        userId: sunqi.id,
        projectId: designProject.id
      },
      {
        title: '交互动效',
        description: '设计页面切换动效',
        startDate: tomorrow,
        endDate: nextWeek,
        type: 'daily',
        userId: sunqi.id,
        projectId: designProject.id
      },
      {
        title: '设计规范',
        description: '编写设计规范文档',
        startDate: nextWeek,
        endDate: twoWeeksLater,
        type: 'daily',
        userId: sunqi.id,
        projectId: designProject.id
      },

      // 周八的任务（Marketing）
      {
        title: '社交媒体运营',
        description: '管理公司社交媒体账号',
        startDate: lastWeek,
        endDate: twoWeeksLater,
        type: 'daily',
        userId: zhouba.id,
        projectId: marketingProject.id
      },
      {
        title: '营销活动策划',
        description: '策划双十一营销活动',
        startDate: today,
        endDate: nextWeek,
        type: 'daily',
        userId: zhouba.id,
        projectId: marketingProject.id
      },
      {
        title: '合作伙伴会议',
        description: '与合作伙伴商讨合作细节',
        startDate: tomorrow,
        endDate: tomorrow,
        startTime: '09:00',
        endTime: '10:30',
        type: 'meeting',
        userId: zhouba.id,
        projectId: marketingProject.id
      },
      {
        title: '市场调研',
        description: '调研竞品市场策略',
        startDate: nextWeek,
        endDate: twoWeeksLater,
        type: 'daily',
        userId: zhouba.id,
        projectId: marketingProject.id
      },

      // 额外的跨项目任务
      {
        title: '项目复盘会',
        description: '总结项目经验和教训',
        startDate: nextWeek,
        endDate: nextWeek,
        startTime: '14:00',
        endTime: '16:00',
        type: 'meeting',
        userId: zhangsan.id,
        projectId: webProject.id
      },
      {
        title: '年假',
        description: '休年假旅游',
        startDate: twoWeeksLater,
        endDate: new Date(twoWeeksLater.getTime() + 3 * 24 * 60 * 60 * 1000),
        type: 'vacation',
        userId: lisi.id,
        projectId: mobileProject.id
      }
    ]
  })

  console.log('✅ 数据库初始化完成!')
  console.log(`创建了 6 个用户`)
  console.log(`创建了 4 个团队`)
  console.log(`创建了 6 个项目`)
  console.log(`创建了 26 个任务`)
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
