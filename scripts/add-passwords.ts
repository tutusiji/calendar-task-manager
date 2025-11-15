/**
 * 脚本：为现有用户添加密码
 * 运行: npx ts-node --compiler-options {"module":"CommonJS"} scripts/add-passwords.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('开始为现有用户添加密码...')

  // 获取所有没有密码的用户
  const users = await prisma.user.findMany({
    where: {
      password: ''
    }
  })

  console.log(`找到 ${users.length} 个需要设置密码的用户`)

  // 默认密码: Test123
  const defaultPassword = 'Test123'
  const hashedPassword = await bcrypt.hash(defaultPassword, 10)

  // 为每个用户设置密码
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    })
    console.log(`✓ 用户 ${user.username} (${user.name}) 密码已设置为: ${defaultPassword}`)
  }

  console.log('\n完成！所有用户的默认密码为: Test123')
  console.log('用户列表:')
  
  const allUsers = await prisma.user.findMany({
    select: {
      username: true,
      name: true,
      email: true
    }
  })

  allUsers.forEach(user => {
    console.log(`  - 用户名: ${user.username}, 姓名: ${user.name}, 邮箱: ${user.email}`)
  })
}

main()
  .catch((e) => {
    console.error('错误:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
