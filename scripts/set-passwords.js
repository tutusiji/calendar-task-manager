const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('开始为用户设置密码...\n')

  // 获取所有密码为空的用户
  const users = await prisma.user.findMany({
    where: {
      password: ''
    }
  })

  console.log(`找到 ${users.length} 个需要设置密码的用户\n`)

  if (users.length === 0) {
    console.log('所有用户都已有密码！')
    return
  }

  // 默认密码: Test123
  const defaultPassword = 'Test123'
  const hashedPassword = await bcrypt.hash(defaultPassword, 10)

  // 为每个用户设置密码
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    })
    console.log(`✓ 用户: ${user.username.padEnd(15)} 姓名: ${user.name}`)
  }

  console.log(`\n✅ 完成！所有用户的默认密码为: ${defaultPassword}`)
  console.log('\n可以使用以下账号登录:')
  
  const allUsers = await prisma.user.findMany({
    select: {
      username: true,
      name: true,
      email: true
    },
    orderBy: {
      username: 'asc'
    }
  })

  console.log('\n用户列表:')
  console.log('─'.repeat(60))
  allUsers.forEach(user => {
    console.log(`  用户名: ${user.username.padEnd(15)} 姓名: ${user.name.padEnd(10)} 邮箱: ${user.email}`)
  })
  console.log('─'.repeat(60))
  console.log(`\n默认密码: ${defaultPassword}`)
  console.log('\n登录地址: http://localhost:3000/login\n')
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
