import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('验证个人事务项目...\n');

  // 获取所有个人事务项目
  const personalProjects = await prisma.project.findMany({
    where: {
      type: 'PERSONAL',
    },
    select: {
      id: true,
      name: true,
      creatorId: true,
      organizationId: true,
    },
    orderBy: { name: 'asc' },
  });

  const usersWithCurrentOrganization = await prisma.user.findMany({
    where: { currentOrganizationId: { not: null } },
    select: { id: true, currentOrganizationId: true },
  });
  const projectOwners = new Set(personalProjects.map(
    (project) => JSON.stringify([project.organizationId, project.creatorId]),
  ));
  const missingCount = usersWithCurrentOrganization.filter(
    (user) => !projectOwners.has(JSON.stringify([user.currentOrganizationId, user.id])),
  ).length;

  console.log(`个人事务项目总数: ${personalProjects.length}`);
  console.log(`当前组织内缺少个人事务项目的用户数: ${missingCount}\n`);

  console.log('个人事务项目列表:');
  personalProjects.forEach((p) => {
    console.log(`  - ${p.name} (ID: ${p.id.substring(0, 8)}...)`);
  });

  await prisma.$disconnect();
}

verify().catch(console.error);
