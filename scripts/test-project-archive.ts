import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testProjectArchive() {
  try {
    console.log('🔍 检查项目归档功能...\n')

    // 1. 检查数据库字段是否存在
    console.log('1. 检查数据库字段...')
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        isArchived: true,
        archivedAt: true,
      },
      take: 5
    })
    
    console.log(`✅ 找到 ${projects.length} 个项目`)
    projects.forEach(p => {
      console.log(`   - ${p.name}: isArchived=${p.isArchived}, archivedAt=${p.archivedAt}`)
    })

    // 2. 统计归档项目数量
    console.log('\n2. 统计归档项目...')
    const archivedCount = await prisma.project.count({
      where: { isArchived: true }
    })
    const activeCount = await prisma.project.count({
      where: { isArchived: false }
    })
    
    console.log(`✅ 活跃项目: ${activeCount}`)
    console.log(`✅ 归档项目: ${archivedCount}`)

    // 3. 测试归档功能（如果有项目的话）
    if (projects.length > 0 && !projects[0].isArchived) {
      const testProject = projects[0]
      console.log(`\n3. 测试归档项目 "${testProject.name}"...`)
      
      const archived = await prisma.project.update({
        where: { id: testProject.id },
        data: {
          isArchived: true,
          archivedAt: new Date()
        }
      })
      
      console.log(`✅ 项目已归档: ${archived.name}`)
      console.log(`   归档时间: ${archived.archivedAt}`)

      // 4. 测试取消归档
      console.log(`\n4. 测试取消归档...`)
      const unarchived = await prisma.project.update({
        where: { id: testProject.id },
        data: {
          isArchived: false,
          archivedAt: null
        }
      })
      
      console.log(`✅ 项目已恢复: ${unarchived.name}`)
      console.log(`   isArchived: ${unarchived.isArchived}`)
    }

    console.log('\n✅ 所有测试通过！')
  } catch (error) {
    console.error('❌ 测试失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testProjectArchive()
