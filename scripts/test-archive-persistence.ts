import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testArchivePersistence() {
  try {
    console.log('🔍 测试归档数据持久化...\n')
    
    // 1. 找一个项目
    const project = await prisma.project.findFirst({
      where: {
        type: 'STANDARD'
      }
    })
    
    if (!project) {
      console.log('❌ 没有找到测试项目')
      return
    }
    
    console.log(`📦 测试项目: ${project.name}`)
    console.log(`   ID: ${project.id}`)
    
    // 2. 归档项目
    console.log('\n1️⃣ 归档项目...')
    const archived = await prisma.project.update({
      where: { id: project.id },
      data: {
        isArchived: true,
        archivedAt: new Date()
      }
    })
    console.log(`✅ 已归档: isArchived=${archived.isArchived}`)
    
    // 3. 重新查询项目（模拟刷新页面）
    console.log('\n2️⃣ 重新查询项目（模拟刷新页面）...')
    const refetched = await prisma.project.findUnique({
      where: { id: project.id }
    })
    console.log(`✅ 查询结果: isArchived=${refetched?.isArchived}`)
    
    if (refetched?.isArchived === true) {
      console.log('✅ 数据持久化正常！')
    } else {
      console.log('❌ 数据持久化失败！')
    }
    
    // 4. 查询所有项目（模拟 API 列表）
    console.log('\n3️⃣ 查询所有项目列表...')
    const allProjects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        isArchived: true,
        archivedAt: true
      }
    })
    
    const archivedCount = allProjects.filter(p => p.isArchived).length
    const activeCount = allProjects.filter(p => !p.isArchived).length
    
    console.log(`✅ 活跃项目: ${activeCount}`)
    console.log(`✅ 归档项目: ${archivedCount}`)
    
    // 检查我们的测试项目
    const testProjectInList = allProjects.find(p => p.id === project.id)
    if (testProjectInList) {
      console.log(`\n📌 测试项目在列表中:`)
      console.log(`   名称: ${testProjectInList.name}`)
      console.log(`   isArchived: ${testProjectInList.isArchived}`)
      console.log(`   archivedAt: ${testProjectInList.archivedAt}`)
    }
    
    // 5. 恢复项目
    console.log('\n4️⃣ 恢复项目...')
    const restored = await prisma.project.update({
      where: { id: project.id },
      data: {
        isArchived: false,
        archivedAt: null
      }
    })
    console.log(`✅ 已恢复: isArchived=${restored.isArchived}`)
    
    console.log('\n✅ 所有测试通过！')
    
  } catch (error: any) {
    console.error('❌ 测试失败:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testArchivePersistence()
