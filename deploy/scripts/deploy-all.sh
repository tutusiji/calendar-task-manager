#!/bin/bash
# ========================================
# 一键部署脚本 - deploy-all.sh
# ========================================

echo "=========================================="
echo "  Calendar Task Manager - 离线部署"
echo "=========================================="
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未安装 Docker"
    echo "请先安装 Docker Engine"
    exit 1
fi

# 检查 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ 错误: 未安装 Docker Compose"
    echo "请先安装 Docker Compose"
    exit 1
fi

echo "✅ Docker 环境检查通过"
echo ""

# 执行部署步骤
echo "步骤 1/3: 加载镜像"
echo "----------------------------------------"
./scripts/1-load-images.sh
if [ $? -ne 0 ]; then
    echo "部署失败: 镜像加载错误"
    exit 1
fi

echo ""
echo "步骤 2/3: 初始化数据库"
echo "----------------------------------------"
./scripts/2-init-database.sh
if [ $? -ne 0 ]; then
    echo "部署失败: 数据库初始化错误"
    exit 1
fi

echo ""
echo "步骤 3/3: 启动应用"
echo "----------------------------------------"
./scripts/3-start-app.sh
if [ $? -ne 0 ]; then
    echo "部署失败: 应用启动错误"
    exit 1
fi

echo ""
echo "=========================================="
echo "  🎉 部署成功完成！"
echo "=========================================="
