import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyUserProjects() {
  const user = await prisma.user.findUnique({
    where: { username: 'huangkun' },
    include: {
      projectMembers: {
        include: {
          project: true
        }
      }
    }
  })

  console.log('用户:', user?.name)
  console.log('项目成员记录数:', user?.projectMembers.length)
  user?.projectMembers.forEach(m => {
    console.log('  - 项目:', m.project.name, '颜色:', m.project.color)
  })

  await prisma.$disconnect()
}

verifyUserProjects()
