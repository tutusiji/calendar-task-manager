import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function renamePersonalProjects() {
  console.log('🔧 更新个人项目名称...\n')

  try {
    // 查找所有名为"个人事务"的项目
    const projects = await prisma.project.findMany({
      where: {
        type: 'PERSONAL',
        name: '个人事务'
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    })

    console.log(`找到 ${projects.length} 个需要重命名的项目\n`)

    for (const project of projects) {
      const newName = `${project.creator.name}的个人事务`
      
      await prisma.project.update({
        where: { id: project.id },
        data: { name: newName }
      })

      console.log(`✅ ${project.creator.name} (${project.creator.username}):`)
      console.log(`   "${project.name}" → "${newName}"`)
    }

    console.log('\n✅ 所有项目名称已更新！')
  } catch (error) {
    console.error('❌ 错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

renamePersonalProjects()
