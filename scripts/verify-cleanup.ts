import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('验证清理结果...\n');

  // 查询所有团队
  const teams = await prisma.team.findMany({
    select: {
      id: true,
      name: true,
      organizationId: true,
    },
    orderBy: { name: 'asc' },
  });

  // 查询所有项目
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      organizationId: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log(`团队总数: ${teams.length}`);
  console.log(`项目总数: ${projects.length}\n`);

  // 检查是否有重复的团队名称(同一组织内)
  const teamsByOrg = new Map<string, Map<string, number>>();
  teams.forEach((team) => {
    if (!teamsByOrg.has(team.organizationId)) {
      teamsByOrg.set(team.organizationId, new Map());
    }
    const orgTeams = teamsByOrg.get(team.organizationId)!;
    orgTeams.set(team.name, (orgTeams.get(team.name) || 0) + 1);
  });

  // 检查是否有重复的项目名称(同一组织内)
  const projectsByOrg = new Map<string, Map<string, number>>();
  projects.forEach((project) => {
    if (!projectsByOrg.has(project.organizationId)) {
      projectsByOrg.set(project.organizationId, new Map());
    }
    const orgProjects = projectsByOrg.get(project.organizationId)!;
    orgProjects.set(project.name, (orgProjects.get(project.name) || 0) + 1);
  });

  // 检查重复
  let hasDuplicates = false;

  teamsByOrg.forEach((orgTeams, orgId) => {
    orgTeams.forEach((count, name) => {
      if (count > 1) {
        console.log(`❌ 发现重复团队: ${name} (组织 ${orgId}) - ${count} 次`);
        hasDuplicates = true;
      }
    });
  });

  projectsByOrg.forEach((orgProjects, orgId) => {
    orgProjects.forEach((count, name) => {
      if (count > 1) {
        console.log(`❌ 发现重复项目: ${name} (组织 ${orgId}) - ${count} 次`);
        hasDuplicates = true;
      }
    });
  });

  if (!hasDuplicates) {
    console.log('✅ 所有数据都是唯一的,没有重复!');
  }

  // 显示每个组织的数据
  console.log('\n各组织的团队和项目:');
  const allOrgIds = new Set([
    ...teamsByOrg.keys(),
    ...projectsByOrg.keys(),
  ]);

  allOrgIds.forEach((orgId) => {
    const orgTeams = teamsByOrg.get(orgId);
    const orgProjects = projectsByOrg.get(orgId);

    console.log(`\n组织 ID: ${orgId}`);
    if (orgTeams && orgTeams.size > 0) {
      console.log(`  团队 (${orgTeams.size}): ${Array.from(orgTeams.keys()).join(', ')}`);
    }
    if (orgProjects && orgProjects.size > 0) {
      console.log(`  项目 (${orgProjects.size}): ${Array.from(orgProjects.keys()).join(', ')}`);
    }
  });

  await prisma.$disconnect();
}

verify().catch(console.error);
