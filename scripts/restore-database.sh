#!/bin/bash
# 数据库还原脚本

BACKUP_FILE="/opt/calendar-task-manager/backups/calendar_tasks_backup_20251130_125213.sql"
DB_NAME="calendar_db"
DB_USER="postgres"
CONTAINER_NAME="calendar-postgres"

echo "🔄 开始还原数据库..."
echo "备份文件: $BACKUP_FILE"
echo ""

# 1. 检查备份文件是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 错误: 备份文件不存在!"
    exit 1
fi

echo "✅ 备份文件存在"
echo ""

# 2. 停止应用容器(避免数据库连接冲突)
echo "📊 停止应用容器..."
docker stop calendar-app
echo "✅ 应用容器已停止"
echo ""

# 3. 删除现有数据库
echo "🗑️  删除现有数据库..."
docker exec -i $CONTAINER_NAME psql -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
echo "✅ 现有数据库已删除"
echo ""

# 4. 创建新数据库
echo "📊 创建新数据库..."
docker exec -i $CONTAINER_NAME psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
echo "✅ 新数据库已创建"
echo ""

# 5. 还原备份
echo "📥 还原备份数据..."
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < $BACKUP_FILE
echo "✅ 备份数据已还原"
echo ""

# 6. 启动应用容器
echo "🚀 启动应用容器..."
docker start calendar-app
echo "✅ 应用容器已启动"
echo ""

# 7. 等待应用启动
echo "⏳ 等待应用启动(10秒)..."
sleep 10
echo ""

# 8. 检查容器状态
echo "📊 检查容器状态:"
docker ps | grep calendar
echo ""

echo "✅ 数据库还原完成!"
echo ""
echo "请访问 https://souxy.com 测试问题是否解决"
