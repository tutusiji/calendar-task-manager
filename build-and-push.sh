#!/bin/bash

# 本地构建 Docker 镜像并推送到 Docker Hub
# 使用方法: ./build-and-push.sh [版本号]

set -e

# 获取版本号参数，默认为 latest
VERSION=${1:-latest}

# Docker Hub 用户名和仓库名
DOCKER_USERNAME="tutusiji"
IMAGE_NAME="calendar-task-manager"
FULL_IMAGE_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}"

echo "====================================="
echo "构建并推送 Docker 镜像"
echo "====================================="
echo "镜像名称: ${FULL_IMAGE_NAME}:${VERSION}"
echo ""

# 1. 构建镜像
echo "1. 构建 Docker 镜像..."
docker build -t ${FULL_IMAGE_NAME}:${VERSION} .

# 如果版本不是 latest，也打上 latest 标签
if [ "$VERSION" != "latest" ]; then
    echo "2. 添加 latest 标签..."
    docker tag ${FULL_IMAGE_NAME}:${VERSION} ${FULL_IMAGE_NAME}:latest
fi

# 3. 登录 Docker Hub（如果还未登录）
echo "3. 登录 Docker Hub..."
echo "请输入 Docker Hub 凭据（如果已登录则跳过）"
docker login || {
    echo "登录失败，请检查凭据"
    exit 1
}

# 4. 推送镜像
echo "4. 推送镜像到 Docker Hub..."
docker push ${FULL_IMAGE_NAME}:${VERSION}

if [ "$VERSION" != "latest" ]; then
    docker push ${FULL_IMAGE_NAME}:latest
fi

echo ""
echo "====================================="
echo "✅ 构建并推送完成！"
echo "====================================="
echo ""
echo "镜像已推送:"
echo "  ${FULL_IMAGE_NAME}:${VERSION}"
if [ "$VERSION" != "latest" ]; then
    echo "  ${FULL_IMAGE_NAME}:latest"
fi
echo ""
echo "在服务器上使用以下命令拉取:"
echo "  docker pull ${FULL_IMAGE_NAME}:${VERSION}"
echo ""
echo "或更新 docker-compose.yml 中的镜像版本后运行:"
echo "  docker-compose pull"
echo "  docker-compose up -d"
echo ""
