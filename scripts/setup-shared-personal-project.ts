import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function setupSharedPersonalProject() {
  console.log('🔧 设置共享的"个人事务"项目...\n')

  try {
    // 1. 查找或创建共享的"个人事务"项目
    let sharedProject = await prisma.project.findFirst({
      where: {
        name: '个人事务'
      }
    })

    if (!sharedProject) {
      // 获取第一个用户作为创建者
      const firstUser = await prisma.user.findFirst({
        select: {
          id: true,
          currentOrganizationId: true,
        },
      })
      
      if (!firstUser) {
        console.log('❌ 没有找到用户，请先创建用户')
        return
      }

      if (!firstUser.currentOrganizationId) {
        console.log('❌ 第一个用户没有当前组织，无法创建项目')
        return
      }

      sharedProject = await prisma.project.create({
        data: {
          name: '个人事务',
          color: '#3b82f6',
          description: '所有人共享的个人日常任务和事项',
          organizationId: firstUser.currentOrganizationId,
          creatorId: firstUser.id
        }
      })
      console.log(`✅ 创建共享项目: ${sharedProject.name} (ID: ${sharedProject.id})`)
    } else {
      console.log(`✓ 找到现有的共享项目: ${sharedProject.name} (ID: ${sharedProject.id})`)
    }

    // 2. 获取所有用户
    const users = await prisma.user.findMany({
      select: { id: true, name: true, username: true }
    })

    console.log(`\n找到 ${users.length} 个用户`)

    // 3. 确保所有用户都是该项目的成员
    for (const user of users) {
      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: user.id,
            projectId: sharedProject.id
          }
        }
      })

      if (membership) {
        console.log(`✓ ${user.name} (${user.username}) 已是成员`)
      } else {
        await prisma.projectMember.create({
          data: {
            userId: user.id,
            projectId: sharedProject.id
          }
        })
        console.log(`✅ 添加 ${user.name} (${user.username}) 为成员`)
      }
    }

    // 4. 删除其他独立的"个人事务"项目（每个用户自己的）
    const duplicateProjects = await prisma.project.findMany({
      where: {
        name: '个人事务',
        id: { not: sharedProject.id }
      },
      include: {
        members: true,
        tasks: true
      }
    })

    if (duplicateProjects.length > 0) {
      console.log(`\n找到 ${duplicateProjects.length} 个重复的"个人事务"项目`)
      
      for (const project of duplicateProjects) {
        // 如果项目有任务，将任务迁移到共享项目
        if (project.tasks.length > 0) {
          await prisma.task.updateMany({
            where: { projectId: project.id },
            data: { projectId: sharedProject.id }
          })
          console.log(`  ↗ 迁移了 ${project.tasks.length} 个任务到共享项目`)
        }

        // 删除项目成员记录
        await prisma.projectMember.deleteMany({
          where: { projectId: project.id }
        })

        // 删除项目
        await prisma.project.delete({
          where: { id: project.id }
        })
        
        console.log(`  ✓ 删除重复项目 (ID: ${project.id})`)
      }
    }

    console.log('\n✅ 共享"个人事务"项目设置完成！')
    console.log(`   项目ID: ${sharedProject.id}`)
    console.log(`   项目名称: ${sharedProject.name}`)
    console.log(`   成员数量: ${users.length}`)

  } catch (error) {
    console.error('❌ 错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupSharedPersonalProject()
