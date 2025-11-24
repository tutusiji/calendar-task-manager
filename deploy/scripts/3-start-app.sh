#!/bin/bash
# ========================================
# 应用启动脚本 - 3-start-app.sh
# ========================================

echo "=================================="
echo "启动应用服务"
echo "=================================="

cd config

# 检查数据库是否运行
if ! docker ps | grep -q calendar-postgres; then
    echo "❌ 错误: 数据库未运行，请先执行 ./2-init-database.sh"
    exit 1
fi

# 启动所有服务
echo ""
echo "🚀 启动所有服务..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ 服务启动失败"
    exit 1
fi

# 等待应用启动
echo ""
echo "⏳ 等待应用启动 (约10秒)..."
sleep 10

# 检查容器状态
echo ""
echo "🔍 检查容器状态:"
docker-compose ps

# 获取服务器 IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "=================================="
echo "✅ 应用启动完成！"
echo "=================================="
echo ""
echo "📍 访问地址:"
echo "   应用: http://${SERVER_IP}:7049"
echo "   或者: http://localhost:7049"
echo ""
echo "   数据库管理 (Prisma Studio): http://${SERVER_IP}:5555"
echo ""
echo "📊 查看日志: docker-compose logs -f"
echo "🔄 重启服务: docker-compose restart"
echo "⏹️  停止服务: docker-compose down"
echo ""
