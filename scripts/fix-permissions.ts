import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixPermissions() {
  console.log('🔧 正在修复数据库权限...')

  try {
    // 授予对所有表的权限
    await prisma.$executeRawUnsafe(`
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
    `)
    console.log('✅ 授予表权限')

    await prisma.$executeRawUnsafe(`
      GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
    `)
    console.log('✅ 授予序列权限')

    await prisma.$executeRawUnsafe(`
      GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;
    `)
    console.log('✅ 授予模式权限')

    // 授予对未来创建的对象的权限
    await prisma.$executeRawUnsafe(`
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
    `)
    console.log('✅ 设置默认表权限')

    await prisma.$executeRawUnsafe(`
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
    `)
    console.log('✅ 设置默认序列权限')

    console.log('\n✅ 权限修复完成！')
    console.log('现在请在 pgAdmin 4 中：')
    console.log('1. 右键点击你的数据库连接 → Disconnect')
    console.log('2. 右键点击 → Connect')
    console.log('3. 重新展开 Schemas → public → Tables')
    console.log('4. 右键点击任意表 → View/Edit Data → All Rows')

  } catch (error) {
    console.error('❌ 错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixPermissions()
