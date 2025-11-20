#!/bin/bash
# ========================================
# 镜像加载脚本 - 1-load-images.sh
# ========================================

echo "=================================="
echo "开始加载 Docker 镜像"
echo "=================================="

# 检查镜像文件是否存在
if [ ! -f "images/calendar-app.tar" ]; then
    echo "❌ 错误: 找不到 images/calendar-app.tar"
    exit 1
fi

if [ ! -f "images/postgres.tar" ]; then
    echo "❌ 错误: 找不到 images/postgres.tar"
    exit 1
fi

# 加载应用镜像
echo ""
echo "📦 正在加载应用镜像 (约2GB，需要几分钟)..."
docker load -i images/calendar-app.tar

if [ $? -eq 0 ]; then
    echo "✅ 应用镜像加载成功"
else
    echo "❌ 应用镜像加载失败"
    exit 1
fi

# 加载 PostgreSQL 镜像
echo ""
echo "📦 正在加载 PostgreSQL 镜像 (约90MB)..."
docker load -i images/postgres.tar

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL 镜像加载成功"
else
    echo "❌ PostgreSQL 镜像加载失败"
    exit 1
fi

# 验证镜像
echo ""
echo "🔍 验证加载的镜像："
docker images | grep -E "calendar-task-manager|postgres.*16-alpine"

echo ""
echo "=================================="
echo "✅ 所有镜像加载完成！"
echo "=================================="
echo ""
echo "下一步: 执行 ./2-init-database.sh 初始化数据库"
