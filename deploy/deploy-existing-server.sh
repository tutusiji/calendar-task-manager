#!/bin/bash

# 适用于已有 Docker 和 Nginx 的服务器部署脚本
# 使用方法: chmod +x deploy-existing-server.sh && ./deploy-existing-server.sh

set -e

echo "====================================="
echo "部署 Calendar Task Manager"
echo "====================================="

# 检查 Docker
echo "1. 检查 Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi
echo "✅ Docker 已安装: $(docker --version)"

# 检查 Docker Compose
echo "2. 检查 Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装"
    exit 1
fi
echo "✅ Docker Compose 已安装: $(docker-compose --version)"

# 进入项目目录
echo "3. 进入项目目录..."
cd /opt/calendar-task-manager || {
    echo "❌ 项目目录不存在，请先克隆项目到 /opt/calendar-task-manager"
    exit 1
}

# 创建 .env 文件
echo "4. 配置环境变量..."

if [ -f .env ]; then
    echo "⚠️  .env 文件已存在"
    read -p "是否重新配置? (y/N): " RECONFIG
    if [[ ! $RECONFIG =~ ^[Yy]$ ]]; then
        echo "跳过环境变量配置"
    else
        rm .env
    fi
fi

if [ ! -f .env ]; then
    echo ""
    read -sp "请输入数据库密码: " DB_PASSWORD
    echo ""
    read -sp "请再次确认密码: " DB_PASSWORD_CONFIRM
    echo ""

    if [ "$DB_PASSWORD" != "$DB_PASSWORD_CONFIRM" ]; then
        echo "❌ 两次输入的密码不一致"
        exit 1
    fi

    # URL 编码密码（使用 Python 或 jq）
    if command -v python3 &> /dev/null; then
        ENCODED_PASSWORD=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$DB_PASSWORD'))")
    elif command -v jq &> /dev/null; then
        ENCODED_PASSWORD=$(echo -n "$DB_PASSWORD" | jq -sRr @uri)
    else
        echo "⚠️  警告：无法 URL 编码密码，如果密码包含特殊字符可能会出错"
        ENCODED_PASSWORD="$DB_PASSWORD"
    fi

    cat > .env << EOF
# Database
DATABASE_URL="postgresql://postgres:${ENCODED_PASSWORD}@postgres:5432/calendar_tasks?schema=public"
POSTGRES_PASSWORD=${DB_PASSWORD}

# JWT Secret
JWT_SECRET=$(openssl rand -base64 32)

# Production
NODE_ENV=production
EOF
    echo "✅ .env 文件已创建"
fi

# 更新 Nginx 配置
echo "5. 更新 Nginx 配置..."

# 备份旧配置
if [ -f /etc/nginx/sites-enabled/souxy.com.conf ]; then
    sudo cp /etc/nginx/sites-enabled/souxy.com.conf /etc/nginx/sites-enabled/souxy.com.conf.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ 已备份 souxy.com 配置"
fi

if [ -f /etc/nginx/sites-enabled/joox.cc.conf ]; then
    sudo cp /etc/nginx/sites-enabled/joox.cc.conf /etc/nginx/sites-enabled/joox.cc.conf.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ 已备份 joox.cc 配置"
fi

# 复制新配置
sudo cp souxy.com.conf /etc/nginx/sites-enabled/souxy.com.conf
sudo cp joox.cc.conf /etc/nginx/sites-enabled/joox.cc.conf
echo "✅ 已更新 Nginx 配置"

# 测试 Nginx 配置
echo "6. 测试 Nginx 配置..."
sudo nginx -t

# 停止旧容器（如果存在）
echo "7. 停止旧容器..."
docker-compose down 2>/dev/null || echo "没有运行中的容器"

# 构建并启动容器
echo "8. 启动应用..."
docker-compose up -d --build

# 重载 Nginx
echo "9. 重载 Nginx..."
sudo nginx -s reload

# 等待服务启动
echo "10. 等待服务启动..."
sleep 10

# 检查状态
echo "11. 检查服务状态..."
docker-compose ps

echo ""
echo "====================================="
echo "✅ 部署完成！"
echo "====================================="
echo ""
echo "访问地址："
echo "  https://souxy.com"
echo "  https://joox.cc"
echo ""
echo "查看日志："
echo "  docker-compose logs -f"
echo ""
echo "重启应用："
echo "  docker-compose restart"
echo ""
