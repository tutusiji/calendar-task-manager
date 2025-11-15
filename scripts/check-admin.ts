import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const zhangsan = await prisma.user.findFirst({
    where: { username: 'zhangsan' },
    select: {
      id: true,
      name: true,
      username: true,
      isAdmin: true,
      role: true
    }
  })

  console.log('张三的账号信息:')
  console.table(zhangsan)
  
  await prisma.$disconnect()
}

main()
