import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testApiResponseSize() {
  console.log('🔍 测试 API 响应大小...\n')

  try {
    // 模拟 /api/teams GET 请求的查询
    console.log('📊 模拟 /api/teams 查询:')
    
    const startTime = Date.now()
    
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

    const endTime = Date.now()
    const queryTime = endTime - startTime

    // 计算响应大小
    const responseData = {
      success: true,
      data: teams.map(team => {
        const { members, _count, ...teamData } = team
        return {
          ...teamData,
          memberIds: members.map(m => m.userId),
          members: members.map(m => m.user),
          memberCount: _count.members
        }
      })
    }

    const responseJson = JSON.stringify(responseData)
    const responseSizeKB = (responseJson.length / 1024).toFixed(2)

    console.log(`\n查询结果:`)
    console.log(`  团队数量: ${teams.length}`)
    console.log(`  查询耗时: ${queryTime}ms`)
    console.log(`  响应大小: ${responseSizeKB} KB`)
    console.log(`  响应字符数: ${responseJson.length}`)

    // 详细分析每个团队
    console.log(`\n团队详情:`)
    for (const team of teams) {
      const teamJson = JSON.stringify(team)
      const teamSizeKB = (teamJson.length / 1024).toFixed(2)
      console.log(`  - ${team.name}:`)
      console.log(`    成员数: ${team.members.length}`)
      console.log(`    数据大小: ${teamSizeKB} KB`)
    }

    // 检查是否有异常大的团队数据
    const maxTeamSize = Math.max(...teams.map(t => JSON.stringify(t).length))
    const avgTeamSize = teams.reduce((sum, t) => sum + JSON.stringify(t).length, 0) / teams.length

    console.log(`\n统计信息:`)
    console.log(`  最大团队数据: ${(maxTeamSize / 1024).toFixed(2)} KB`)
    console.log(`  平均团队数据: ${(avgTeamSize / 1024).toFixed(2)} KB`)

    if (maxTeamSize > avgTeamSize * 3) {
      console.log(`  ⚠️ 警告: 存在异常大的团队数据!`)
    }

    // 测试简化查询
    console.log(`\n\n📊 测试简化查询 (不包含成员详情):`)
    const startTime2 = Date.now()
    
    const teamsSimple = await prisma.team.findMany({
      include: {
        _count: {
          select: {
            members: true
          }
        }
      }
    })

    const endTime2 = Date.now()
    const queryTime2 = endTime2 - startTime2
    const responseJson2 = JSON.stringify({ success: true, data: teamsSimple })
    const responseSizeKB2 = (responseJson2.length / 1024).toFixed(2)

    console.log(`  团队数量: ${teamsSimple.length}`)
    console.log(`  查询耗时: ${queryTime2}ms`)
    console.log(`  响应大小: ${responseSizeKB2} KB`)
    console.log(`  大小差异: ${(parseFloat(responseSizeKB) - parseFloat(responseSizeKB2)).toFixed(2)} KB`)

  } catch (error) {
    console.error('❌ 测试过程中出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testApiResponseSize()
