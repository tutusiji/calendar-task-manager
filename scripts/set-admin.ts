import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // 查找张三的账号
    const zhangsan = await prisma.user.findFirst({
      where: {
        OR: [
          { username: 'zhangsan' },
          { name: { contains: '张三' } }
        ]
      }
    })

    if (!zhangsan) {
      console.log('❌ 未找到张三的账号')
      console.log('正在查找所有用户...')
      const allUsers = await prisma.user.findMany({
        select: { id: true, username: true, name: true, isAdmin: true }
      })
      console.table(allUsers)
      return
    }

    console.log(`✅ 找到用户: ${zhangsan.name} (${zhangsan.username})`)

    // 设置为超级管理员
    const updated = await prisma.user.update({
      where: { id: zhangsan.id },
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
