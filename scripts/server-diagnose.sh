#!/bin/bash

echo "🔍 Calendar Task Manager 服务器诊断脚本"
echo "========================================"
echo ""

# 1. 检查容器状态
echo "📊 检查 Docker 容器状态:"
docker ps | grep calendar

echo ""
echo "📊 检查容器资源使用:"
docker stats --no-stream calendar-app

echo ""
echo "📊 检查容器日志 (最后50行):"
docker logs --tail 50 calendar-app

echo ""
echo "📊 检查数据库连接:"
docker exec calendar-app npx prisma db execute --stdin <<EOF
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;
EOF

echo ""
echo "📊 检查表记录数:"
docker exec calendar-app npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCounts() {
  const counts = {
    users: await prisma.user.count(),
    organizations: await prisma.organization.count(),
    teams: await prisma.team.count(),
    projects: await prisma.project.count(),
    tasks: await prisma.task.count(),
    teamMembers: await prisma.teamMember.count(),
    projectMembers: await prisma.projectMember.count(),
    notifications: await prisma.notification.count()
  };
  
  console.log('表记录数统计:');
  for (const [table, count] of Object.entries(counts)) {
    console.log(\`  \${table}: \${count}\`);
  }
  
  await prisma.\$disconnect();
}

checkCounts().catch(console.error);
"

echo ""
echo "✅ 诊断完成!"
