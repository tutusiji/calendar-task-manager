#!/bin/bash

# 服务器端拉取镜像并部署
# 使用方法: ./deploy/pull-and-deploy.sh [版本号]

set -e

VERSION=${1:-latest}
DOCKER_USERNAME="tutusiji"
IMAGE_NAME="calendar-task-manager"
FULL_IMAGE_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}"

echo "====================================="
echo "拉取镜像并部署"
echo "====================================="
echo "镜像: ${FULL_IMAGE_NAME}:${VERSION}"
echo ""

# 进入项目目录
cd /opt/calendar-task-manager

# 1. 备份数据库
echo "1. 备份数据库..."
BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
docker exec calendar-postgres pg_dump -U postgres calendar_tasks > "$BACKUP_DIR/backup_$DATE.sql" 2>/dev/null || echo "跳过数据库备份（容器可能未运行）"

# 2. 设置镜像环境变量
echo "2. 设置镜像版本..."
export DOCKER_IMAGE="${FULL_IMAGE_NAME}:${VERSION}"

# 3. 拉取最新镜像
echo "3. 拉取镜像..."
docker pull ${FULL_IMAGE_NAME}:${VERSION}

# 4. 停止旧容器
echo "4. 停止旧容器..."
docker-compose down

# 5. 启动新容器
echo "5. 启动新容器..."
docker-compose up -d

# 6. 等待服务启动
echo "6. 等待服务启动..."
sleep 10

# 7. 检查服务状态
echo "7. 检查服务状态..."
docker-compose ps

# 8. 清理未使用的镜像
echo "8. 清理旧镜像..."
docker image prune -f

echo ""
echo "====================================="
echo "✅ 部署完成！"
echo "====================================="
echo ""
echo "查看应用日志: docker-compose logs -f app"
echo "查看 Prisma Studio 日志: docker-compose logs -f prisma-studio"
echo ""
echo "访问地址:"
echo "  应用: https://souxy.com 或 https://joox.cc"
echo "  Prisma Studio: http://your-server-ip:5555"
echo ""
