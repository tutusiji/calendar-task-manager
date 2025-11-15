import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addDefaultProjects() {
  console.log('🔧 为现有用户添加默认项目...\n')

  try {
    // 获取所有用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true
      }
    })

    console.log(`找到 ${users.length} 个用户`)

    for (const user of users) {
      // 检查用户是否已经有自己创建的个人事务项目
      const existingPersonalProject = await prisma.project.findFirst({
        where: {
          creatorId: user.id,
          OR: [
            { name: '个人事务' },
            { name: `${user.name}的个人事务` }
          ]
        }
      })

      if (existingPersonalProject) {
        console.log(`✓ ${user.name} (${user.username}) 已有个人项目: ${existingPersonalProject.name}`)
        continue
      }

      // 为用户创建专属的"个人事务"项目
      const project = await prisma.project.create({
        data: {
          name: `${user.name}的个人事务`,
          color: '#3b82f6',
          description: '个人日常任务和事项',
          creatorId: user.id,
          members: {
            create: {
              userId: user.id
            }
          }
        },
        include: {
          members: true
        }
      })

      console.log(`✅ 为 ${user.name} (${user.username}) 创建了项目: ${project.name}`)
    }

    console.log('\n✅ 所有用户都已配置默认项目！')
  } catch (error) {
    console.error('❌ 错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addDefaultProjects()
