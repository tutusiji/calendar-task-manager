import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('开始迁移 defaultTeamId 字段...')

  try {
    // 步骤 1: 检查字段是否存在
    console.log('\n步骤 1: 检查 defaultTeamId 字段是否存在...')
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'defaultTeamId'
    `
    
    if (Array.isArray(result) && result.length > 0) {
      console.log('✓ defaultTeamId 字段已存在')
    } else {
      console.log('✗ defaultTeamId 字段不存在，需要先运行 Prisma 迁移')
      console.log('请运行: npx prisma migrate dev')
      return
    }

    // 步骤 2: 初始化 defaultTeamId
    console.log('\n步骤 2: 初始化 defaultTeamId...')
    
    // 获取所有用户
    const users = await prisma.user.findMany({
      select: { id: true, username: true }
    })

    console.log(`找到 ${users.length} 个用户`)

    let updatedCount = 0

    for (const user of users) {
      // 获取用户所在的第一个团队
      const firstTeam = await prisma.teamMember.findFirst({
        where: { userId: user.id },
        include: { team: true },
        orderBy: { team: { createdAt: 'asc' } }
      })

      if (firstTeam) {
        // 更新用户的 defaultTeamId
        await prisma.user.update({
          where: { id: user.id },
          data: { defaultTeamId: firstTeam.teamId }
        })
        console.log(`✓ 用户 ${user.username} 的 defaultTeamId 设置为 ${firstTeam.teamId}`)
        updatedCount++
      } else {
        console.log(`- 用户 ${user.username} 没有所属团队，defaultTeamId 保持为 null`)
      }
    }

    console.log(`\n✓ 迁移完成！共更新 ${updatedCount} 个用户`)

    // 步骤 3: 验证结果
    console.log('\n步骤 3: 验证结果...')
    const verifyUsers = await prisma.user.findMany({
      select: { id: true, username: true, defaultTeamId: true },
      take: 5
    })

    console.log('前 5 个用户的 defaultTeamId:')
    verifyUsers.forEach(u => {
      console.log(`  ${u.username}: ${u.defaultTeamId || 'null'}`)
    })

  } catch (error) {
    console.error('迁移失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
