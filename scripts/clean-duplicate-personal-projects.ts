import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDuplicatePersonalProjects() {
  console.log('清理重复的个人事务项目...\n');

  // 获取所有个人事务项目
  const projects = await prisma.project.findMany({
    where: {
      name: { contains: '的个人事务' },
    },
    include: {
      members: true,
    },
    orderBy: { createdAt: 'asc' }, // 按创建时间排序，保留最早的
  });

  // 按 organizationId + name 分组
  const grouped = new Map<string, typeof projects>();

  projects.forEach((project) => {
    const key = `${project.organizationId}-${project.name}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(project);
  });

  let deletedCount = 0;

  // 查找并删除重复项
  for (const [key, items] of grouped) {
    if (items.length > 1) {
      console.log(`发现重复: ${items[0].name} (${items.length} 个)`);
      
      // 保留第一个（最早创建的），删除其余的
      for (let i = 1; i < items.length; i++) {
        const project = items[i];
        console.log(`  删除: ${project.id} (创建于 ${project.createdAt.toISOString()})`);
        
        // 删除项目成员关系
        await prisma.projectMember.deleteMany({
          where: { projectId: project.id },
        });
        
        // 更新或删除相关任务
        const tasksToUpdate = await prisma.task.findMany({
          where: { projectId: project.id },
        });
        
        if (tasksToUpdate.length > 0) {
          // 将任务移动到保留的项目
          await prisma.task.updateMany({
            where: { projectId: project.id },
            data: { projectId: items[0].id },
          });
          console.log(`    移动了 ${tasksToUpdate.length} 个任务到保留的项目`);
        }
        
        // 删除项目
        await prisma.project.delete({
          where: { id: project.id },
        });
        
        deletedCount++;
      }
      
      console.log(`  保留: ${items[0].id} (创建于 ${items[0].createdAt.toISOString()})\n`);
    }
  }

  if (deletedCount === 0) {
    console.log('✅ 没有发现重复的个人事务项目');
  } else {
    console.log(`\n✅ 已删除 ${deletedCount} 个重复项目`);
  }

  await prisma.$disconnect();
}

cleanDuplicatePersonalProjects().catch(console.error);
