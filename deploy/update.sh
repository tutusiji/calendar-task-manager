#!/bin/bash

# 应用更新脚本
# 使用方法: ./deploy/update.sh

set -e

echo "====================================="
echo "开始更新应用"
echo "====================================="

# 进入项目目录
cd /opt/calendar-task-manager

# 备份数据库
echo "1. 备份数据库..."
BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
docker exec calendar-postgres pg_dump -U postgres calendar_tasks > "$BACKUP_DIR/backup_$DATE.sql"
echo "数据库已备份到: $BACKUP_DIR/backup_$DATE.sql"

# 拉取最新代码
echo "2. 拉取最新代码..."
git fetch origin
git pull origin main

# 停止服务
echo "3. 停止当前服务..."
docker-compose down

# 重新构建
echo "4. 重新构建应用..."
docker-compose build --no-cache

# 启动服务
echo "5. 启动服务..."
docker-compose up -d

# 等待服务启动
echo "6. 等待服务启动..."
sleep 15

# 运行数据库迁移
echo "7. 运行数据库迁移..."
docker exec calendar-app npx prisma migrate deploy

# 检查服务状态
echo "8. 检查服务状态..."
docker-compose ps

# 清理未使用的镜像
echo "9. 清理未使用的镜像..."
docker image prune -f

echo "====================================="
echo "更新完成！"
echo "====================================="
echo ""
echo "查看日志: docker-compose logs -f app"
