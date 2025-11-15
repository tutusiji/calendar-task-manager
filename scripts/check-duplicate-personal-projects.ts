import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicates() {
  console.log('检查重复的个人事务项目...\n');

  const projects = await prisma.project.findMany({
    where: {
      name: { contains: '的个人事务' },
    },
    select: {
      id: true,
      name: true,
      organizationId: true,
      createdAt: true,
    },
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
  });

  console.log(`总共 ${projects.length} 个个人事务项目\n`);

  // 按名称分组
  const byName = new Map<string, typeof projects>();
  projects.forEach((p) => {
    if (!byName.has(p.name)) {
      byName.set(p.name, []);
    }
    byName.get(p.name)!.push(p);
  });

  // 显示重复项
  let hasDuplicates = false;
  byName.forEach((items, name) => {
    if (items.length > 1) {
      hasDuplicates = true;
      console.log(`❌ 重复: ${name} (${items.length} 个)`);
      items.forEach((p, idx) => {
        console.log(`  ${idx + 1}. ID: ${p.id}`);
        console.log(`     组织: ${p.organizationId}`);
        console.log(`     创建时间: ${p.createdAt.toISOString()}`);
      });
      console.log('');
    }
  });

  if (!hasDuplicates) {
    console.log('✅ 没有重复项\n');
  }

  // 按organizationId+name分组检查
  console.log('按组织检查重复...\n');
  const byOrgAndName = new Map<string, typeof projects>();
  projects.forEach((p) => {
    const key = `${p.organizationId}||${p.name}`;
    if (!byOrgAndName.has(key)) {
      byOrgAndName.set(key, []);
    }
    byOrgAndName.get(key)!.push(p);
  });

  let hasOrgDuplicates = false;
  byOrgAndName.forEach((items, key) => {
    if (items.length > 1) {
      hasOrgDuplicates = true;
      const [orgId, name] = key.split('||');
      console.log(`❌ 同一组织内重复: ${name}`);
      console.log(`   组织ID: ${orgId}`);
      items.forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.id} (${p.createdAt.toISOString()})`);
      });
      console.log('');
    }
  });

  if (!hasOrgDuplicates) {
    console.log('✅ 同一组织内没有重复项');
  }

  await prisma.$disconnect();
}

checkDuplicates().catch(console.error);
