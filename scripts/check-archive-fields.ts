import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkFields() {
  try {
    // 检查字段是否存在
    const result: any = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'Project' 
        AND column_name IN ('isArchived', 'archivedAt')
      ORDER BY column_name
    `
    
    console.log('数据库字段检查:')
    console.log(result)
    
    if (result.length === 0) {
      console.log('\n❌ 字段不存在！需要运行迁移。')
    } else {
      console.log('\n✅ 字段已存在')
      
      // 尝试查询项目
      console.log('\n尝试查询项目...')
      const project = await prisma.project.findFirst({
        select: {
          id: true,
          name: true,
          isArchived: true,
          archivedAt: true
        }
      })
      
      console.log('查询结果:', project)
    }
  } catch (error: any) {
    console.error('❌ 错误:', error.message)
    if (error.message.includes('Unknown field')) {
      console.log('\n提示: Prisma 客户端需要重新生成')
      console.log('请停止应用后运行: npx prisma generate')
    }
  } finally {
    await prisma.$disconnect()
  }
}

checkFields()
