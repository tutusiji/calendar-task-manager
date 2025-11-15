import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanDuplicates() {
  console.log('开始清理重复数据...\n')

  // 清理重复的团队（保留每个组织中每个名称的第一条记录）
  const teams = await prisma.team.findMany({
    orderBy: { createdAt: 'asc' }
  })

  const teamsByOrgAndName = new Map<string, string>()
  const teamsToDelete: string[] = []

  for (const team of teams) {
    const key = `${team.organizationId}-${team.name}`
    if (teamsByOrgAndName.has(key)) {
      teamsToDelete.push(team.id)
      console.log(`标记删除重复团队: ${team.name} (ID: ${team.id})`)
    } else {
      teamsByOrgAndName.set(key, team.id)
    }
  }

  // 删除重复的团队
  if (teamsToDelete.length > 0) {
    // 先删除关联的 TeamMember
    await prisma.teamMember.deleteMany({
      where: { teamId: { in: teamsToDelete } }
    })
    
    // 更新引用该团队的任务，设置 teamId 为 null
    await prisma.task.updateMany({
      where: { teamId: { in: teamsToDelete } },
      data: { teamId: null }
    })
    
    // 删除团队
    await prisma.team.deleteMany({
      where: { id: { in: teamsToDelete } }
    })
    console.log(`✓ 已删除 ${teamsToDelete.length} 个重复团队\n`)
  } else {
    console.log('✓ 没有重复的团队\n')
  }

  // 清理重复的项目（保留每个组织中每个名称的第一条记录）
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'asc' }
  })

  const projectsByOrgAndName = new Map<string, string>()
  const projectsToDelete: string[] = []

  for (const project of projects) {
    const key = `${project.organizationId}-${project.name}`
    if (projectsByOrgAndName.has(key)) {
      projectsToDelete.push(project.id)
      console.log(`标记删除重复项目: ${project.name} (ID: ${project.id})`)
    } else {
      projectsByOrgAndName.set(key, project.id)
    }
  }

  // 删除重复的项目
  if (projectsToDelete.length > 0) {
    // 先删除关联的 ProjectMember
    await prisma.projectMember.deleteMany({
      where: { projectId: { in: projectsToDelete } }
    })
    
    // 删除该项目下的任务
    await prisma.task.deleteMany({
      where: { projectId: { in: projectsToDelete } }
    })
    
    // 删除项目
    await prisma.project.deleteMany({
      where: { id: { in: projectsToDelete } }
    })
    console.log(`✓ 已删除 ${projectsToDelete.length} 个重复项目\n`)
  } else {
    console.log('✓ 没有重复的项目\n')
  }

  console.log('清理完成！')
}

cleanDuplicates()
  .catch((error) => {
    console.error('清理失败:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
