import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensurePersonalProjects() {
  console.log('开始修复个人事务项目...\n');

  // 获取所有用户及其组织
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      currentOrganizationId: true,
    },
  });

  console.log(`总用户数: ${users.length}\n`);

  let createdCount = 0;
  let existingCount = 0;

  for (const user of users) {
    if (!user.currentOrganizationId) {
      console.log(`⚠️  ${user.name} (${user.username}): 没有组织，跳过`);
      continue;
    }

    const personalProjectName = `${user.name}的个人事务`;

    // 检查是否已存在该用户的个人事务项目
    const existingProject = await prisma.project.findFirst({
      where: {
        organizationId: user.currentOrganizationId,
        creatorId: user.id,
        type: 'PERSONAL',
      },
    });

    if (existingProject) {
      console.log(`✅ ${user.name}: 个人事务项目已存在 (${existingProject.id})`);
      
      // 确保用户是项目成员
      const membership = await prisma.projectMember.findFirst({
        where: {
          projectId: existingProject.id,
          userId: user.id,
        },
      });

      if (!membership) {
        await prisma.projectMember.create({
          data: {
            projectId: existingProject.id,
            userId: user.id,
          },
        });
        console.log(`   ✓ 添加用户为项目成员`);
      }

      existingCount++;
    } else {
      // 创建个人事务项目
      const newProject = await prisma.project.create({
        data: {
          name: personalProjectName,
          type: 'PERSONAL',
          description: `${user.name}的个人事务管理`,
          color: '#8B5CF6', // 紫色
          organizationId: user.currentOrganizationId,
          creatorId: user.id,
          taskPermission: 'CREATOR_ONLY', // 只有创建者可以管理任务
          members: {
            create: {
              userId: user.id,
            },
          },
        },
      });

      console.log(`🆕 ${user.name}: 创建个人事务项目 (${newProject.id})`);
      createdCount++;
    }
  }

  console.log(`\n修复完成！`);
  console.log(`✅ 已存在: ${existingCount} 个`);
  console.log(`🆕 新创建: ${createdCount} 个`);
  console.log(`📊 总计: ${existingCount + createdCount} 个个人事务项目`);

  await prisma.$disconnect();
}

ensurePersonalProjects().catch(console.error);
