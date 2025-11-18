import { prisma } from '../lib/prisma'

async function testInviteCodes() {
  console.log('=== 邀请码系统测试 ===\n')

  // 1. 验证每个用户在每个组织都有独立的邀请码
  console.log('1️⃣ 测试: 每个用户在每个组织有不同的邀请码')
  const zhang = await prisma.user.findFirst({
    where: { name: '张三' },
    include: {
      organizationMembers: {
        include: {
          organization: {
            select: { name: true }
          }
        }
      }
    }
  })

  if (zhang) {
    console.log(`\n用户: ${zhang.name}`)
    const inviteCodes = zhang.organizationMembers.map(m => m.inviteCode)
    const uniqueCodes = new Set(inviteCodes.filter(c => c !== null))
    
    zhang.organizationMembers.forEach(member => {
      console.log(`  - ${member.organization.name}: ${member.inviteCode}`)
    })
    
    console.log(`  ✅ 邀请码是否全部不同: ${uniqueCodes.size === inviteCodes.length ? '是' : '否'}`)
  }

  // 2. 测试邀请码的组织隔离性
  console.log('\n\n2️⃣ 测试: 邀请码只能加入对应的组织')
  
  const org1 = await prisma.organization.findFirst({
    where: { name: '牛马科技有限公司' }
  })
  
  const org2 = await prisma.organization.findFirst({
    where: { name: '吧啦吧啦小魔仙科技' }
  })

  if (org1 && org2 && zhang) {
    const memberInOrg1 = await prisma.organizationMember.findFirst({
      where: {
        userId: zhang.id,
        organizationId: org1.id
      },
      select: { inviteCode: true }
    })

    if (memberInOrg1?.inviteCode) {
      console.log(`\n张三在"牛马科技有限公司"的邀请码: ${memberInOrg1.inviteCode}`)
      
      // 尝试用这个邀请码在另一个组织中查找
      const wrongOrgMember = await prisma.organizationMember.findFirst({
        where: {
          inviteCode: memberInOrg1.inviteCode,
          organizationId: org2.id
        }
      })
      
      console.log(`  ✅ 该邀请码在"吧啦吧啦小魔仙科技"中查找: ${wrongOrgMember ? '❌ 找到了(错误!)' : '✅ 未找到(正确!)'}`)
    }
  }

  // 3. 测试邀请码唯一性
  console.log('\n\n3️⃣ 测试: 所有邀请码全局唯一')
  const allMembers = await prisma.organizationMember.findMany({
    where: {
      inviteCode: { not: null }
    },
    select: {
      inviteCode: true
    }
  })

  const allCodes = allMembers.map(m => m.inviteCode).filter(c => c !== null) as string[]
  const uniqueAllCodes = new Set(allCodes)
  
  console.log(`  - 总邀请码数: ${allCodes.length}`)
  console.log(`  - 唯一邀请码数: ${uniqueAllCodes.size}`)
  console.log(`  ✅ 所有邀请码是否全局唯一: ${allCodes.length === uniqueAllCodes.size ? '是' : '否'}`)

  // 4. 测试 API 验证逻辑
  console.log('\n\n4️⃣ 模拟 API 验证逻辑')
  if (org1 && zhang) {
    const memberInOrg1Check = await prisma.organizationMember.findFirst({
      where: {
        userId: zhang.id,
        organizationId: org1.id
      },
      select: { inviteCode: true }
    })
    
    if (memberInOrg1Check?.inviteCode) {
      // 正确的组织
      const validMember = await prisma.organizationMember.findFirst({
        where: {
          inviteCode: memberInOrg1Check.inviteCode,
          organizationId: org1.id
        },
        select: {
          user: {
            select: { name: true }
          }
        }
      })
      console.log(`  - 在正确的组织验证邀请码: ${validMember ? `✅ 通过 (邀请人: ${validMember.user.name})` : '❌ 失败'}`)

      // 错误的组织
      if (org2) {
        const invalidMember = await prisma.organizationMember.findFirst({
          where: {
            inviteCode: memberInOrg1Check.inviteCode,
            organizationId: org2.id
          }
        })
        console.log(`  - 在错误的组织验证邀请码: ${invalidMember ? '❌ 通过(错误!)' : '✅ 失败(正确!)'}`)
      }
    }
  }

  console.log('\n\n=== 测试完成 ===\n')
  await prisma.$disconnect()
}

testInviteCodes().catch(console.error)
