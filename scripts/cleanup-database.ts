import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

async function cleanupDatabaseIssues() {
  console.log('🧹 开始清理数据库问题...\n')

  try {
    // 1. 清理重复的团队成员关系
    console.log('🔍 检查并清理重复的团队成员关系...')
    const duplicateTeamMembers = await prisma.$queryRaw<Array<{
      userId: string,
      teamId: string,
      count: bigint
    }>>`
      SELECT "userId", "teamId", COUNT(*) as count
      FROM "TeamMember"
      GROUP BY "userId", "teamId"
      HAVING COUNT(*) > 1
    `

    if (duplicateTeamMembers.length > 0) {
      console.log(`  发现 ${duplicateTeamMembers.length} 组重复的团队成员关系`)
      
      for (const dup of duplicateTeamMembers) {
        // 保留最早创建的记录,删除其他重复记录
        const members = await prisma.teamMember.findMany({
          where: {
            userId: dup.userId,
            teamId: dup.teamId
          },
          orderBy: {
            createdAt: 'asc'
          }
        })

        // 删除除第一条之外的所有记录
        for (let i = 1; i < members.length; i++) {
          await prisma.teamMember.delete({
            where: { id: members[i].id }
          })
          console.log(`    删除重复记录: ${members[i].id}`)
        }
      }
    } else {
      console.log('  ✅ 没有发现重复的团队成员关系')
    }

    // 2. 清理重复的项目成员关系
    console.log('\n🔍 检查并清理重复的项目成员关系...')
    const duplicateProjectMembers = await prisma.$queryRaw<Array<{
      userId: string,
      projectId: string,
      count: bigint
    }>>`
      SELECT "userId", "projectId", COUNT(*) as count
      FROM "ProjectMember"
      GROUP BY "userId", "projectId"
      HAVING COUNT(*) > 1
    `

    if (duplicateProjectMembers.length > 0) {
      console.log(`  发现 ${duplicateProjectMembers.length} 组重复的项目成员关系`)
      
      for (const dup of duplicateProjectMembers) {
        const members = await prisma.projectMember.findMany({
          where: {
            userId: dup.userId,
            projectId: dup.projectId
          },
          orderBy: {
            createdAt: 'asc'
          }
        })

        for (let i = 1; i < members.length; i++) {
          await prisma.projectMember.delete({
            where: { id: members[i].id }
          })
          console.log(`    删除重复记录: ${members[i].id}`)
        }
      }
    } else {
      console.log('  ✅ 没有发现重复的项目成员关系')
    }

    // 3. 清理重复的任务负责人关系
    console.log('\n🔍 检查并清理重复的任务负责人关系...')
    const duplicateTaskAssignees = await prisma.$queryRaw<Array<{
      taskId: string,
      userId: string,
      count: bigint
    }>>`
      SELECT "taskId", "userId", COUNT(*) as count
      FROM "TaskAssignee"
      GROUP BY "taskId", "userId"
      HAVING COUNT(*) > 1
    `

    if (duplicateTaskAssignees.length > 0) {
      console.log(`  发现 ${duplicateTaskAssignees.length} 组重复的任务负责人关系`)
      
      for (const dup of duplicateTaskAssignees) {
        const assignees = await prisma.taskAssignee.findMany({
          where: {
            taskId: dup.taskId,
            userId: dup.userId
          },
          orderBy: {
            createdAt: 'asc'
          }
        })

        for (let i = 1; i < assignees.length; i++) {
          await prisma.taskAssignee.delete({
            where: { id: assignees[i].id }
          })
          console.log(`    删除重复记录: ${assignees[i].id}`)
        }
      }
    } else {
      console.log('  ✅ 没有发现重复的任务负责人关系')
    }

    // 4. 清理无效的用户默认团队设置
    console.log('\n🔍 检查并清理无效的用户默认团队设置...')
    const usersWithDefaultTeam = await prisma.user.findMany({
      where: {
        defaultTeamId: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        defaultTeamId: true
      }
    })

    let fixedCount = 0
    for (const user of usersWithDefaultTeam) {
      if (user.defaultTeamId) {
        const teamExists = await prisma.team.findUnique({
          where: { id: user.defaultTeamId }
        })
        
        if (!teamExists) {
          await prisma.user.update({
            where: { id: user.id },
            data: { defaultTeamId: null }
          })
          console.log(`    修复用户 ${user.name} 的无效默认团队设置`)
          fixedCount++
        }
      }
    }

    if (fixedCount === 0) {
      console.log('  ✅ 所有用户的默认团队设置都有效')
    } else {
      console.log(`  修复了 ${fixedCount} 个无效的默认团队设置`)
    }

    // 5. 清理过期的通知 (超过45天的已读通知)
    console.log('\n🔍 清理过期的通知...')
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 45)

    const deletedNotifications = await prisma.notification.deleteMany({
      where: {
        isRead: true,
        readAt: {
          lt: thirtyDaysAgo
        }
      }
    })

    console.log(`  删除了 ${deletedNotifications.count} 条过期通知`)

    console.log('\n✅ 清理完成!')
    console.log('\n建议: 重启应用以确保更改生效')

  } catch (error) {
    console.error('❌ 清理过程中出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupDatabaseIssues()
