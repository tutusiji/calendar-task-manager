# Docker 部署指南

## 前置要求

- Docker 20.10+
- Docker Compose 2.0+

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd calendar-task-manager
```

### 2. 配置环境变量

复制环境变量模板：

```bash
cp .env.docker .env
```

编辑 `.env` 文件，修改数据库密码（可选）：

```env
POSTGRES_PASSWORD=your_secure_password
DATABASE_URL=postgresql://postgres:your_secure_password@postgres:5432/calendar_tasks?schema=public
```

### 3. 构建并启动服务

```bash
docker-compose up -d
```

这将启动两个服务：
- PostgreSQL 数据库（端口 5432）
- Next.js 应用（端口 3000）

### 4. 初始化数据库

首次启动时，数据库表会自动创建。如果需要初始化测试数据：

```bash
# 进入应用容器
docker exec -it calendar-app sh

# 运行种子脚本
npx tsx prisma/seed.ts

# 退出容器
exit
```

### 5. 访问应用

打开浏览器访问：`http://localhost:3000`

## 常用命令

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 只查看应用日志
docker-compose logs -f app

# 只查看数据库日志
docker-compose logs -f postgres
```

### 停止服务

```bash
docker-compose down
```

### 重启服务

```bash
docker-compose restart
```

### 重新构建并启动

```bash
docker-compose up -d --build
```

### 清理所有数据（包括数据库）

```bash
docker-compose down -v
```

## 生产环境部署

### 1. 使用自定义域名

编辑 `docker-compose.yml`，添加环境变量：

```yaml
services:
  app:
    environment:
      NEXT_PUBLIC_BASE_URL: https://your-domain.com
```

### 2. 使用 Nginx 反向代理

创建 `nginx.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. 配置 HTTPS

使用 Let's Encrypt 和 Certbot：

```bash
sudo certbot --nginx -d your-domain.com
```

### 4. 定期备份数据库

```bash
# 创建备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec calendar-postgres pg_dump -U postgres calendar_tasks > backup_$DATE.sql
EOF

chmod +x backup.sh

# 设置定时任务
crontab -e
# 添加：每天凌晨 2 点备份
0 2 * * * /path/to/backup.sh
```

## 故障排查

### 问题 1: 容器无法启动

```bash
# 查看详细日志
docker-compose logs

# 检查容器状态
docker ps -a
```

### 问题 2: 数据库连接失败

```bash
# 进入数据库容器检查
docker exec -it calendar-postgres psql -U postgres

# 测试连接
\l
\c calendar_tasks
\dt
```

### 问题 3: 端口冲突

编辑 `docker-compose.yml` 修改端口映射：

```yaml
ports:
  - "8080:3000"  # 将 3000 改为 8080
```

### 问题 4: 内存不足

增加 Docker 内存限制：

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

## 性能优化

### 1. 使用多阶段构建

Dockerfile 已经使用多阶段构建，最小化镜像大小。

### 2. 启用构建缓存

```bash
docker-compose build --no-cache  # 禁用缓存（首次构建）
docker-compose build             # 启用缓存（后续构建）
```

### 3. 资源限制

在 `docker-compose.yml` 中配置：

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 512M
```

## 监控

### 使用 Docker Stats

```bash
docker stats calendar-app calendar-postgres
```

### 健康检查

应用已配置健康检查，查看状态：

```bash
docker inspect calendar-app | grep -A 10 Health
```

## 更新应用

### 1. 拉取最新代码

```bash
git pull origin master
```

### 2. 重新构建并启动

```bash
docker-compose up -d --build
```

### 3. 运行数据库迁移（如有）

```bash
docker exec -it calendar-app npx prisma migrate deploy
```

## 开发模式

如果需要在 Docker 中运行开发模式：

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  postgres:
    # ... 数据库配置同上

  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      NODE_ENV: development
    command: pnpm dev
```

运行：

```bash
docker-compose -f docker-compose.dev.yml up
```

## 安全建议

1. **修改默认密码**：不要使用默认的数据库密码
2. **限制端口暴露**：生产环境只暴露必要的端口
3. **使用环境变量**：敏感信息使用环境变量，不要硬编码
4. **定期更新**：保持 Docker 镜像和依赖包最新
5. **网络隔离**：使用 Docker 网络隔离服务

## 相关文档

- [Docker 官方文档](https://docs.docker.com/)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [Prisma 部署指南](https://www.prisma.io/docs/guides/deployment)

## 支持

如有问题，请查看：
- [项目 Issues](https://github.com/your-repo/issues)
- [API 文档](./API_DOCUMENTATION.md)
- [后端架构](./backend-architecture.md)
