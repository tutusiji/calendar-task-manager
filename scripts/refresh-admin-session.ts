import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('正在获取超级管理员信息...\n')

    // 获取所有超级管理员
    const admins = await prisma.user.findMany({
      where: { isAdmin: true },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        avatar: true,
        gender: true,
        role: true,
        isAdmin: true
      }
    })

    if (admins.length === 0) {
      console.log('❌ 没有找到超级管理员')
      return
    }

    console.log(`✅ 找到 ${admins.length} 个超级管理员:\n`)
    
    admins.forEach((admin) => {
      console.log('超级管理员信息:')
      console.log(`  ID: ${admin.id}`)
      console.log(`  用户名: ${admin.username}`)
      console.log(`  姓名: ${admin.name}`)
      console.log(`  邮箱: ${admin.email}`)
      console.log(`  职业: ${admin.role}`)
      console.log(`  超级管理员: ${admin.isAdmin ? '是' : '否'}`)
      console.log('\n用于更新 localStorage 的 JSON:')
      console.log(JSON.stringify(admin, null, 2))
      console.log('\n' + '='.repeat(60) + '\n')
    })

    console.log('📝 请执行以下步骤来刷新会话:')
    console.log('1. 在浏览器中打开开发者工具 (F12)')
    console.log('2. 进入 Console 标签页')
    console.log('3. 复制上方的 JSON 数据')
    console.log('4. 执行: localStorage.setItem("currentUser", \'复制的JSON\')')
    console.log('5. 刷新页面 (F5)')
    console.log('\n或者，最简单的方法：重新登录即可自动获取最新的用户信息（包括 isAdmin 字段）')

  } catch (error) {
    console.error('❌ 错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
