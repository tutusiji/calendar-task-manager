import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('检查组织数据...\n')

  // 1. 检查所有组织
  const organizations = await prisma.organization.findMany({
    include: {
      _count: {
        select: {
          members: true,
          teams: true,
          projects: true,
        },
      },
    },
  })

  console.log(`找到 ${organizations.length} 个组织:`)
  organizations.forEach((org) => {
    console.log(`  - ${org.name} (ID: ${org.id})`)
    console.log(`    成员数: ${org._count.members}`)
    console.log(`    团队数: ${org._count.teams}`)
    console.log(`    项目数: ${org._count.projects}`)
    console.log()
  })

  // 2. 检查所有用户的组织关系
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      currentOrganizationId: true,
      organizationMembers: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  console.log(`\n找到 ${users.length} 个用户:`)
  users.forEach((user) => {
    console.log(`  - ${user.name} (${user.email})`)
    console.log(`    当前组织ID: ${user.currentOrganizationId || '未设置'}`)
    console.log(`    所属组织:`)
    if (user.organizationMembers.length === 0) {
      console.log(`      无`)
    } else {
      user.organizationMembers.forEach((membership) => {
        console.log(`      - ${membership.organization.name} (${membership.role})`)
      })
    }
    console.log()
  })
}

main()
  .catch((e) => {
    console.error('错误:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
