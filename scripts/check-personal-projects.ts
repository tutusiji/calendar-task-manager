import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkPersonalProjects() {
  const projects = await prisma.project.findMany({
    where: {
      name: { contains: '个人事务' }
    },
    include: {
      creator: { select: { id: true, name: true, username: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, username: true } }
        }
      }
    },
    orderBy: { name: 'asc' }
  })

  console.log(`\n找到 ${projects.length} 个个人事务项目:\n`)

  projects.forEach(p => {
    console.log(`📁 项目: ${p.name}`)
    console.log(`   创建者: ${p.creator.name} (${p.creator.username})`)
    console.log(`   成员数量: ${p.members.length}`)
    p.members.forEach(m => {
      const isSelf = m.user.id === p.creatorId
      console.log(`     - ${m.user.name} (${m.user.username}) ${isSelf ? '✓ 创建者' : '⚠️ 其他人'}`)
    })
    console.log()
  })

  await prisma.$disconnect()
}

checkPersonalProjects()
