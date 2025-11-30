#!/bin/bash
# 检查服务器数据库重复数据的脚本

echo "🔍 检查数据库重复数据..."
echo ""

# 检查重复的团队成员关系
echo "📊 检查重复的团队成员关系:"
docker exec calendar-app npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const dups = await prisma.\$queryRaw\`
    SELECT \"userId\", \"teamId\", COUNT(*) as count
    FROM \"TeamMember\"
    GROUP BY \"userId\", \"teamId\"
    HAVING COUNT(*) > 1
  \`;
  console.log('重复的团队成员:', dups.length > 0 ? dups : '无');
  await prisma.\$disconnect();
})();
"

echo ""
echo "📊 检查重复的项目成员关系:"
docker exec calendar-app npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const dups = await prisma.\$queryRaw\`
    SELECT \"userId\", \"projectId\", COUNT(*) as count
    FROM \"ProjectMember\"
    GROUP BY \"userId\", \"projectId\"
    HAVING COUNT(*) > 1
  \`;
  console.log('重复的项目成员:', dups.length > 0 ? dups : '无');
  await prisma.\$disconnect();
})();
"

echo ""
echo "📊 检查重复的任务负责人关系:"
docker exec calendar-app npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const dups = await prisma.\$queryRaw\`
    SELECT \"taskId\", \"userId\", COUNT(*) as count
    FROM \"TaskAssignee\"
    GROUP BY \"taskId\", \"userId\"
    HAVING COUNT(*) > 1
  \`;
  console.log('重复的任务负责人:', dups.length > 0 ? dups : '无');
  await prisma.\$disconnect();
})();
"

echo ""
echo "✅ 检查完成!"
