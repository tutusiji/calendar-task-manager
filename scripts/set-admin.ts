import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // 从命令行参数获取用户名，默认为张三
    const userName = process.argv[2] || '张三'
    
    // 查找用户账号
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: userName.toLowerCase() },
          { name: { contains: userName } }
        ]
      }
    })

    if (!user) {
      console.log(`❌ 未找到 ${userName} 的账号`)
      console.log('正在查找所有用户...')
      const allUsers = await prisma.user.findMany({
        select: { id: true, username: true, name: true, isAdmin: true }
      })
      console.table(allUsers)
      return
    }

    console.log(`✅ 找到用户: ${user.name} (${user.username})`)

    // 设置为超级管理员
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: true },
      select: {
        id: true,
        username: true,
        name: true,
        isAdmin: true,
        role: true
      }
    })

    console.log('\n🎉 成功设置为超级管理员！')
    console.log('用户信息:')
    console.log(`  ID: ${updated.id}`)
    console.log(`  用户名: ${updated.username}`)
    console.log(`  姓名: ${updated.name}`)
    console.log(`  职业: ${updated.role}`)
    console.log(`  超级管理员: ${updated.isAdmin ? '是' : '否'}`)

  } catch (error) {
    console.error('❌ 错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
