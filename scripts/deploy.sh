#!/bin/bash

# 部署脚本 - 支持多环境构建（基于 docker-compose）
# 使用方式: bash scripts/deploy.sh [company|personal|team]

set -e

# 获取环境参数，默认为 company
ENV_TYPE=${1:-company}

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting deployment for: $ENV_TYPE${NC}"

# 检查 .env 文件是否存在
if [ ! -f ".env.$ENV_TYPE" ]; then
  echo -e "${RED}❌ Error: .env.$ENV_TYPE not found${NC}"
  echo "Available environments:"
  ls -1 .env.* 2>/dev/null | sed 's/.env./  - /' || echo "  No .env files found"
  exit 1
fi

echo -e "${GREEN}✅ Found .env.$ENV_TYPE${NC}"

# 显示配置信息
echo -e "${YELLOW}📋 Configuration:${NC}"
grep "NEXT_PUBLIC_" ".env.$ENV_TYPE" | sed 's/^/  /'

# 构建 Docker 镜像（使用 --build-arg 传递 ENV_TYPE）
echo -e "${YELLOW}🔨 Building Docker image with ENV_TYPE=$ENV_TYPE...${NC}"
docker-compose build --build-arg ENV_TYPE=$ENV_TYPE --no-cache

# 启动容器
echo -e "${YELLOW}🐳 Starting containers...${NC}"
docker-compose up -d

# 等待服务启动
echo -e "${YELLOW}⏳ Waiting for service to start...${NC}"
sleep 5

# 检查服务状态
if docker-compose ps | grep -q "Up"; then
  echo -e "${GREEN}✅ Service is running${NC}"
  echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
  echo ""
  echo "Service URL: http://localhost:7049"
else
  echo -e "${RED}❌ Service failed to start${NC}"
  docker-compose logs app
  exit 1
fi
