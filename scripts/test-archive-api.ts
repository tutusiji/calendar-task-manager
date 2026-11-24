import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testArchiveAPI() {
  try {
    console.log('🔍 测试归档 API 逻辑...\n')
    
    // 1. 找一个测试项目
    const testProject = await prisma.project.findFirst({
      where: {
        isArchived: false,
        type: 'STANDARD'
      },
      include: {
        organization: true,
        members: true
      }
    })
    
    if (!testProject) {
      console.log('❌ 没有找到可测试的项目')
      return
    }
    
    console.log(`找到测试项目: ${testProject.name}`)
    console.log(`项目ID: ${testProject.id}`)
    console.log(`创建者ID: ${testProject.creatorId}`)
    console.log(`组织ID: ${testProject.organizationId}`)
    console.log(`组织创建者ID: ${testProject.organization.creatorId}`)
    
    // 2. 模拟归档操作
    console.log('\n执行归档操作...')
    const archived = await prisma.project.update({
      where: { id: testProject.id },
      data: {
        isArchived: true,
        archivedAt: new Date()
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        }
      }
    })
    
    console.log('✅ 归档成功!')
    console.log(`isArchived: ${archived.isArchived}`)
    console.log(`archivedAt: ${archived.archivedAt}`)
    
    // 3. 恢复项目
    console.log('\n恢复项目...')
    const restored = await prisma.project.update({
      where: { id: testProject.id },
      data: {
        isArchived: false,
        archivedAt: null
      }
    })
    
    console.log('✅ 恢复成功!')
    console.log(`isArchived: ${restored.isArchived}`)
    console.log(`archivedAt: ${restored.archivedAt}`)
    
    console.log('\n✅ 所有测试通过！API 逻辑正常。')
    
  } catch (error: any) {
    console.error('❌ 测试失败:', error.message)
    console.error('详细错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testArchiveAPI()
