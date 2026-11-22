import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function diagnoseDatabaseIssues() {
  console.log('🔍 开始诊断数据库问题...\n')

  try {
    // 1. 检查团队数量和成员关系
    console.log('📊 检查团队数据:')
    const teamCount = await prisma.team.count()
    console.log(`  总团队数: ${teamCount}`)

    const teams = await prisma.team.findMany({
      include: {
        _count: {
          select: {
            members: true,
            tasks: true
          }
        }
      }
    })

    for (const team of teams) {
      console.log(`  - 团队: ${team.name} (ID: ${team.id})`)
      console.log(`    成员数: ${team._count.members}`)
      console.log(`    任务数: ${team._count.tasks}`)
    }

    // 2. 检查是否有重复的团队成员关系
    console.log('\n🔍 检查重复的团队成员关系:')
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
      console.log('  ⚠️ 发现重复的团队成员关系:')
      for (const dup of duplicateTeamMembers) {
        console.log(`    用户 ${dup.userId} 在团队 ${dup.teamId} 中重复了 ${dup.count} 次`)
      }
    } else {
      console.log('  ✅ 没有发现重复的团队成员关系')
    }

    // 3. 检查是否有重复的项目成员关系
    console.log('\n🔍 检查重复的项目成员关系:')
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
      console.log('  ⚠️ 发现重复的项目成员关系:')
      for (const dup of duplicateProjectMembers) {
        console.log(`    用户 ${dup.userId} 在项目 ${dup.projectId} 中重复了 ${dup.count} 次`)
      }
    } else {
      console.log('  ✅ 没有发现重复的项目成员关系')
    }

    // 4. 检查孤立的成员关系(用户或团队已删除但关系仍存在)
    console.log('\n🔍 检查孤立的团队成员关系:')
    const orphanedTeamMembers = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT tm.id
      FROM "TeamMember" tm
      LEFT JOIN "User" u ON u.id = tm."userId"
      LEFT JOIN "Team" t ON t.id = tm."teamId"
      WHERE u.id IS NULL OR t.id IS NULL
    `

    if (orphanedTeamMembers.length > 0) {
      console.log(`  ⚠️ 发现 ${orphanedTeamMembers.length} 个孤立的团队成员关系`)
    } else {
      console.log('  ✅ 没有发现孤立的团队成员关系')
    }

    // 5. 检查组织数据
    console.log('\n📊 检查组织数据:')
    const orgCount = await prisma.organization.count()
    console.log(`  总组织数: ${orgCount}`)

    const orgs = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            members: true,
            teams: true,
            projects: true
          }
        }
      }
    })

    for (const org of orgs) {
      console.log(`  - 组织: ${org.name} (ID: ${org.id})`)
      console.log(`    成员数: ${org._count.members}`)
      console.log(`    团队数: ${org._count.teams}`)
      console.log(`    项目数: ${org._count.projects}`)
    }

    // 6. 检查用户的 defaultTeamId 是否有效
    console.log('\n🔍 检查用户的默认团队设置:')
    const usersWithInvalidDefaultTeam = await prisma.user.findMany({
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

    let invalidDefaultTeams = 0
    for (const user of usersWithInvalidDefaultTeam) {
      if (user.defaultTeamId) {
        const teamExists = await prisma.team.findUnique({
          where: { id: user.defaultTeamId }
        })
        if (!teamExists) {
          console.log(`  ⚠️ 用户 ${user.name} (${user.id}) 的默认团队 ${user.defaultTeamId} 不存在`)
          invalidDefaultTeams++
        }
      }
    }

    if (invalidDefaultTeams === 0) {
      console.log('  ✅ 所有用户的默认团队设置都有效')
    }

    // 7. 检查数据库表大小
    console.log('\n📊 检查数据库表记录数:')
    const counts = {
      users: await prisma.user.count(),
      organizations: await prisma.organization.count(),
      teams: await prisma.team.count(),
      projects: await prisma.project.count(),
      tasks: await prisma.task.count(),
      teamMembers: await prisma.teamMember.count(),
      projectMembers: await prisma.projectMember.count(),
      taskAssignees: await prisma.taskAssignee.count(),
      notifications: await prisma.notification.count()
    }

    for (const [table, count] of Object.entries(counts)) {
      console.log(`  ${table}: ${count}`)
    }

    console.log('\n✅ 诊断完成!')

  } catch (error) {
    console.error('❌ 诊断过程中出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

diagnoseDatabaseIssues()
