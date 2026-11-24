import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function listAllPersonalProjects() {
  console.log('📋 所有用户的个人项目列表\n')

  try {
    const users = await prisma.user.findMany({
      include: {
        createdProjects: {
          where: {
            type: 'PERSONAL'
          }
        },
        projectMembers: {
          include: {
            project: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.username})`)
      
      for (const project of user.createdProjects) {
        console.log(`   ✅ 创建了: ${project.name}`)
      }
      
      const memberProjects = user.projectMembers.map(m => m.project.name)
      if (memberProjects.length > 0) {
        console.log(`   📁 参与项目 (${memberProjects.length}):`, memberProjects.join(', '))
      } else {
        console.log(`   ⚠️  没有参与任何项目`)
      }
      console.log()
    })

    console.log(`总计: ${users.length} 个用户`)
  } catch (error) {
    console.error('❌ 错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listAllPersonalProjects()
