import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('验证个人事务项目...\n');

  // 获取所有个人事务项目
  const personalProjects = await prisma.project.findMany({
    where: {
      name: { contains: '的个人事务' },
    },
    select: {
      id: true,
      name: true,
      creatorId: true,
      organizationId: true,
    },
    orderBy: { name: 'asc' },
  });

  // 获取用户总数
  const userCount = await prisma.user.count();

  console.log(`个人事务项目总数: ${personalProjects.length}`);
  console.log(`用户总数: ${userCount}\n`);

  if (userCount === personalProjects.length) {
    console.log('✅ 每个用户都有个人事务项目！\n');
  } else {
    console.log(`❌ 个人事务项目数量不匹配 (应该有 ${userCount} 个)\n`);
  }

  console.log('个人事务项目列表:');
  personalProjects.forEach((p) => {
    console.log(`  - ${p.name} (ID: ${p.id.substring(0, 8)}...)`);
  });

  await prisma.$disconnect();
}

verify().catch(console.error);
