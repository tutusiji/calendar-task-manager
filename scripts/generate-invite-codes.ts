import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

// 生成短邀请码（8位）
function generateInviteCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

async function main() {
  console.log('开始为现有用户生成邀请码...')

  // 获取所有没有邀请码的用户
  const users = await prisma.user.findMany({
    where: {
      inviteCode: null
    }
  })

  console.log(`找到 ${users.length} 个需要生成邀请码的用户`)

  for (const user of users) {
    // 生成唯一的邀请码，确保不重复
    let inviteCode = generateInviteCode()
    let exists = await prisma.user.findUnique({ where: { inviteCode } })
    
    while (exists) {
      inviteCode = generateInviteCode()
      exists = await prisma.user.findUnique({ where: { inviteCode } })
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: { inviteCode }
    })
    
    console.log(`✓ 用户 ${user.username} (${user.name}) 生成邀请码: ${inviteCode}`)
  }

  console.log('✓ 所有用户邀请码生成完成！')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
