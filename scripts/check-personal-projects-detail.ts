import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPersonalProjects() {
  console.log('检查个人事务项目...\n');

  // 获取所有用户
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      currentOrganizationId: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log(`总用户数: ${users.length}\n`);

  // 获取所有个人事务项目
  const personalProjects = await prisma.project.findMany({
    where: {
      name: { contains: '个人事务' },
    },
    select: {
      id: true,
      name: true,
      organizationId: true,
      creatorId: true,
      members: {
        select: {
          userId: true,
        },
      },
    },
  });

  console.log(`现有个人事务项目数: ${personalProjects.length}\n`);

  // 检查每个用户的个人事务项目
  for (const user of users) {
    const userPersonalProject = personalProjects.find(
      (p) => p.name === `${user.name}的个人事务` && p.organizationId === user.currentOrganizationId
    );

    if (userPersonalProject) {
      const isMember = userPersonalProject.members.some((m) => m.userId === user.id);
      const isCreator = userPersonalProject.creatorId === user.id;
      console.log(`✅ ${user.name} (${user.username}): 有个人事务项目`);
      console.log(`   项目ID: ${userPersonalProject.id}`);
      console.log(`   是否创建者: ${isCreator ? '是' : '否'}`);
      console.log(`   是否成员: ${isMember ? '是' : '否'}`);
    } else {
      console.log(`❌ ${user.name} (${user.username}): 缺少个人事务项目`);
      console.log(`   组织ID: ${user.currentOrganizationId}`);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

checkPersonalProjects().catch(console.error);
