import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicates() {
  const duplicates = await prisma.project.groupBy({
    by: ['organizationId', 'creatorId'],
    where: { type: 'PERSONAL' },
    _count: { _all: true },
    having: { creatorId: { _count: { gt: 1 } } },
  });

  if (duplicates.length === 0) {
    console.log('✅ 同一组织内没有重复的个人项目');
  } else {
    for (const { organizationId, creatorId, _count } of duplicates) {
      console.log(`❌ 组织 ${organizationId} 中用户 ${creatorId} 有 ${_count._all} 个个人项目`);
    }
  }
}

checkDuplicates().catch(console.error).finally(() => prisma.$disconnect());
