#!/bin/bash

# 本地构建 Docker 镜像（不推送到 Docker Hub）
# 使用方法: ./build-local.sh

set -e

IMAGE_NAME="calendar-task-manager"
VERSION="latest"

echo "====================================="
echo "本地构建 Docker 镜像"
echo "====================================="
echo "镜像名称: ${IMAGE_NAME}:${VERSION}"
echo ""

# 构建镜像
echo "1. 构建 Docker 镜像..."
docker build -t ${IMAGE_NAME}:${VERSION} .

echo ""
echo "====================================="
echo "✅ 构建完成！"
echo "====================================="
echo ""
echo "镜像信息:"
docker images | grep ${IMAGE_NAME}
echo ""
echo "启动服务:"
echo "  docker-compose up -d"
echo ""
echo "导出镜像（用于内网部署）:"
echo "  docker save -o ${IMAGE_NAME}.tar ${IMAGE_NAME}:${VERSION}"
echo ""
