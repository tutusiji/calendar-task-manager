#!/bin/bash

# 阿里云服务器初始化部署脚本
# 使用方法: chmod +x setup-server.sh && ./setup-server.sh

set -e

echo "====================================="
echo "开始初始化服务器环境"
echo "====================================="

# 更新系统
echo "1. 更新系统..."
sudo apt update && sudo apt upgrade -y

# 安装必要工具
echo "2. 安装必要工具..."
sudo apt install -y git curl wget vim ufw

# 安装 Docker
echo "3. 安装 Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "Docker 安装完成"
else
    echo "Docker 已安装"
fi

# 安装 Docker Compose
echo "4. 安装 Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "Docker Compose 安装完成"
else
    echo "Docker Compose 已安装"
fi

# 安装 Nginx
echo "5. 安装 Nginx..."
sudo apt install -y nginx

# 配置防火墙
echo "6. 配置防火墙..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 创建项目目录
echo "7. 创建项目目录..."
sudo mkdir -p /opt/calendar-task-manager
sudo chown -R $USER:$USER /opt/calendar-task-manager

# 克隆项目
echo "8. 克隆项目..."
read -p "请输入 GitHub 仓库地址: " REPO_URL
cd /opt
git clone $REPO_URL calendar-task-manager
cd calendar-task-manager

# 创建 .env 文件
echo "9. 配置环境变量..."
cat > .env << EOF
# Database
DATABASE_URL="postgresql://postgres:%40Heima968%21@postgres:5432/calendar_tasks?schema=public"
POSTGRES_PASSWORD=@Heima968!

# JWT Secret (已自动生成)
JWT_SECRET=$(openssl rand -base64 32)

# Production
NODE_ENV=production
EOF

echo ""
echo "✅ .env 文件已创建，密码已设置为: @Heima968!"
echo "注意: DATABASE_URL 中的密码已自动 URL 编码 (@ → %40, ! → %21)"
echo ""
echo "如需修改密码，请编辑 .env 文件："
echo "  nano .env"
echo ""
read -p "确认配置正确后，按回车继续..."

# 配置 SSL 证书目录
echo "10. 配置 SSL 证书目录..."
sudo mkdir -p /etc/nginx/ssl/souxy.com
sudo mkdir -p /etc/nginx/ssl/joox.cc

echo "请将 SSL 证书文件放置到以下目录："
echo "  souxy.com: /etc/nginx/ssl/souxy.com/fullchain.pem 和 privkey.pem"
echo "  joox.cc: /etc/nginx/ssl/joox.cc/fullchain.pem 和 privkey.pem"
read -p "证书已放置完成后，按回车继续..."

# 配置 Nginx
echo "11. 配置 Nginx..."
sudo cp deploy/nginx/nginx.conf /etc/nginx/sites-available/calendar-task-manager
sudo ln -sf /etc/nginx/sites-available/calendar-task-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 启动应用
echo "12. 启动应用..."
docker-compose up -d

# 等待服务启动
echo "等待服务启动..."
sleep 15

# 检查状态
echo "13. 检查服务状态..."
docker-compose ps

echo "====================================="
echo "部署完成！"
echo "====================================="
echo ""
echo "访问地址："
echo "  https://souxy.com"
echo "  https://joox.cc"
echo ""
echo "常用命令："
echo "  查看日志: docker-compose logs -f"
echo "  重启服务: docker-compose restart"
echo "  停止服务: docker-compose down"
echo "  更新应用: git pull && docker-compose up -d --build"
echo ""
echo "GitHub Actions 自动部署已配置，推送代码到 main 分支将自动部署"
