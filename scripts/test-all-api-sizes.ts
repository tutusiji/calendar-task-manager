import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testAllApiResponseSizes() {
  console.log('🔍 测试所有 API 响应大小...\n')

  try {
    // 测试 /api/users
    console.log('📊 测试 /api/users:')
    const startTime1 = Date.now()
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        isAdmin: true,
        currentOrganizationId: true,
        createdAt: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    const endTime1 = Date.now()
    const usersResponse = JSON.stringify({ success: true, data: users })
    const usersSizeKB = (usersResponse.length / 1024).toFixed(2)

    console.log(`  用户数量: ${users.length}`)
    console.log(`  查询耗时: ${endTime1 - startTime1}ms`)
    console.log(`  响应大小: ${usersSizeKB} KB`)
    console.log(`  响应字符数: ${usersResponse.length}`)

    // 测试 /api/teams
    console.log('\n📊 测试 /api/teams:')
    const startTime2 = Date.now()
    
    const teams = await prisma.team.findMany({
      include: {
        organization: {
          select: {
            name: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    const endTime2 = Date.now()
    const formattedTeams = teams.map(team => {
      const { members, _count, ...teamData } = team
      return {
        ...teamData,
        memberIds: members.map(m => m.userId),
        members: members.map(m => m.user),
        memberCount: _count.members
      }
    })
    const teamsResponse = JSON.stringify({ success: true, data: formattedTeams })
    const teamsSizeKB = (teamsResponse.length / 1024).toFixed(2)

    console.log(`  团队数量: ${teams.length}`)
    console.log(`  查询耗时: ${endTime2 - startTime2}ms`)
    console.log(`  响应大小: ${teamsSizeKB} KB`)
    console.log(`  响应字符数: ${teamsResponse.length}`)

    // 测试 /api/projects
    console.log('\n📊 测试 /api/projects:')
    const startTime3 = Date.now()
    
    const projects = await prisma.project.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    const endTime3 = Date.now()
    const formattedProjects = projects.map(project => {
      const { members, _count, ...projectData } = project
      return {
        ...projectData,
        memberIds: members.map(m => m.userId),
        members: members.map(m => m.user),
        memberCount: _count.members
      }
    })
    const projectsResponse = JSON.stringify({ success: true, data: formattedProjects })
    const projectsSizeKB = (projectsResponse.length / 1024).toFixed(2)

    console.log(`  项目数量: ${projects.length}`)
    console.log(`  查询耗时: ${endTime3 - startTime3}ms`)
    console.log(`  响应大小: ${projectsSizeKB} KB`)
    console.log(`  响应字符数: ${projectsResponse.length}`)

    // 总结
    console.log('\n📊 总结:')
    const totalSize = parseFloat(usersSizeKB) + parseFloat(teamsSizeKB) + parseFloat(projectsSizeKB)
    console.log(`  总响应大小: ${totalSize.toFixed(2)} KB`)
    console.log(`  总查询耗时: ${(endTime1 - startTime1) + (endTime2 - startTime2) + (endTime3 - startTime3)}ms`)

    if (totalSize > 100) {
      console.log('\n  ⚠️ 警告: 总响应大小超过 100KB,可能需要优化!')
    } else {
      console.log('\n  ✅ 响应大小正常')
    }

    // 检查是否有异常大的数据
    console.log('\n📊 详细分析:')
    
    // 检查用户数据
    if (users.length > 0) {
      const avgUserSize = usersResponse.length / users.length
      console.log(`  平均每个用户数据: ${(avgUserSize / 1024).toFixed(2)} KB`)
    }

    // 检查团队数据
    if (teams.length > 0) {
      const maxTeamSize = Math.max(...teams.map(t => JSON.stringify(t).length))
      const avgTeamSize = teams.reduce((sum, t) => sum + JSON.stringify(t).length, 0) / teams.length
      console.log(`  最大团队数据: ${(maxTeamSize / 1024).toFixed(2)} KB`)
      console.log(`  平均团队数据: ${(avgTeamSize / 1024).toFixed(2)} KB`)
      
      if (maxTeamSize > avgTeamSize * 3) {
        console.log(`  ⚠️ 警告: 存在异常大的团队数据!`)
        // 找出最大的团队
        const largestTeam = teams.reduce((max, t) => 
          JSON.stringify(t).length > JSON.stringify(max).length ? t : max
        )
        console.log(`  最大团队: ${largestTeam.name}, 成员数: ${largestTeam.members.length}`)
      }
    }

    // 检查项目数据
    if (projects.length > 0) {
      const maxProjectSize = Math.max(...projects.map(p => JSON.stringify(p).length))
      const avgProjectSize = projects.reduce((sum, p) => sum + JSON.stringify(p).length, 0) / projects.length
      console.log(`  最大项目数据: ${(maxProjectSize / 1024).toFixed(2)} KB`)
      console.log(`  平均项目数据: ${(avgProjectSize / 1024).toFixed(2)} KB`)
      
      if (maxProjectSize > avgProjectSize * 3) {
        console.log(`  ⚠️ 警告: 存在异常大的项目数据!`)
        const largestProject = projects.reduce((max, p) => 
          JSON.stringify(p).length > JSON.stringify(max).length ? p : max
        )
        console.log(`  最大项目: ${largestProject.name}, 成员数: ${largestProject.members.length}`)
      }
    }

  } catch (error) {
    console.error('❌ 测试过程中出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAllApiResponseSizes()
