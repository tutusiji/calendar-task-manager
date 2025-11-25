# 内网服务器部署指南

**适用场景**：内网服务器无法访问外网，需要离线部署

---

## 📦 准备工作（在有网络的电脑上）

### 1. 构建 Docker 镜像

```bash
# 在项目根目录
cd d:\CodeLab\calendar-task-manager

# 确保 .dockerignore 已修改（允许迁移文件）
# 第18行应该是注释状态：# prisma/migrations/*_*

# 构建镜像
docker build -t calendar-task-manager:2025.11.26 .
```

### 2. 导出镜像和依赖镜像

```bash
# 导出应用镜像
docker save -o calendar-task-manager_2025.11.26.tar calendar-task-manager:2025.11.26

# 导出 PostgreSQL 镜像（如果内网服务器没有）
docker pull postgres:16-alpine
docker save -o postgres_16-alpine.tar postgres:16-alpine

# 导出 Node.js 基础镜像（可选，如果需要重新构建）
docker pull node:20-alpine
docker save -o node_20-alpine.tar node:20-alpine
```

### 3. 准备项目文件

```bash
# 打包项目文件（包含 docker-compose.yml 和 .env）
# 方式一：使用 git
git archive -o calendar-task-manager.zip HEAD

# 方式二：手动打包
# 将以下文件/目录打包：
# - docker-compose.yml
# - .env.example（需要在内网服务器上重命名为 .env 并配置）
# - nginx 配置文件（如果有）
# - 部署脚本（如果有）
```

### 4. 传输到内网服务器

使用 U 盘、内网文件共享或其他方式传输以下文件到内网服务器：

- `calendar-task-manager_2025.11.26.tar`
- `postgres_16-alpine.tar`
- `calendar-task-manager.zip`（或项目文件夹）

---

## 🚀 内网服务器部署步骤

### 步骤 1: 加载 Docker 镜像

```bash
# 创建工作目录
mkdir -p /opt/docker-images
cd /opt/docker-images

# 上传镜像文件到这个目录后，加载镜像
docker load -i postgres_16-alpine.tar
docker load -i calendar-task-manager_2025.11.26.tar

# 验证镜像已加载
docker images | grep -E "calendar-task-manager|postgres"
```

### 步骤 2: 解压项目文件

```bash
# 创建项目目录
mkdir -p /opt/calendar-task-manager
cd /opt/calendar-task-manager

# 解压项目文件
unzip /opt/docker-images/calendar-task-manager.zip

# 或者如果是 tar.gz
tar -xzf /opt/docker-images/calendar-task-manager.tar.gz
```

### 步骤 3: 配置环境变量

```bash
# 复制并编辑 .env 文件
cp .env.example .env
nano .env

# 修改以下内容：
# POSTGRES_PASSWORD=your_secure_password
# DATABASE_URL="postgresql://postgres:your_secure_password@postgres:5432/calendar_tasks?schema=public"
# JWT_SECRET=your_jwt_secret
```

### 步骤 4: 修改 docker-compose.yml

```bash
nano docker-compose.yml

# 确保镜像版本正确：
# app:
#   image: calendar-task-manager:2025.11.26

# 重要：修改启动命令，避免迁移问题
# command: sh -c "node server.js"  # 先不执行迁移
```

### 步骤 5: 启动服务

```bash
# 启动 PostgreSQL 和应用
docker-compose up -d postgres app

# 查看容器状态
docker-compose ps

# 等待 PostgreSQL 启动（约10秒）
sleep 10
```

### 步骤 6: 初始化数据库

**如果是全新部署**（数据库为空）：

```bash
# 执行所有迁移
docker-compose exec app npx prisma migrate deploy

# 查看日志确认成功
docker-compose logs -f app
```

**如果是从旧版本升级**（数据库已有数据）：

```bash
# 方式一：只添加新字段（推荐）
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c "ALTER TABLE \"Task\" ADD COLUMN IF NOT EXISTS \"color\" TEXT; ALTER TABLE \"Task\" ADD COLUMN IF NOT EXISTS \"progress\" INTEGER NOT NULL DEFAULT 0;"

# 方式二：标记旧迁移为已应用，只执行新迁移
# 先清理可能的失败记录
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c "DELETE FROM \"_prisma_migrations\" WHERE finished_at IS NULL OR success = false;"

# 然后执行迁移
docker-compose exec app npx prisma migrate deploy
```

### 步骤 7: 验证部署

```bash
# 查看应用日志
docker-compose logs -f app

# 应该看到类似输出：
# ✨ Ready on http://localhost:3000

# 测试访问
curl http://localhost:7049

# 或在浏览器访问
# http://内网服务器IP:7049
```

---

## 🔧 常见问题处理

### 问题 1: 迁移失败

```bash
# 停止应用
docker-compose stop app

# 清理失败的迁移记录
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c "DELETE FROM \"_prisma_migrations\" WHERE finished_at IS NULL OR success = false;"

# 手动添加字段
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c "ALTER TABLE \"Task\" ADD COLUMN IF NOT EXISTS \"color\" TEXT; ALTER TABLE \"Task\" ADD COLUMN IF NOT EXISTS \"progress\" INTEGER NOT NULL DEFAULT 0;"

# 重新启动
docker-compose up -d app
```

### 问题 2: 端口冲突

```bash
# 修改 docker-compose.yml 中的端口映射
# ports:
#   - "8080:3000"  # 改为其他端口
```

### 问题 3: 数据库连接失败

```bash
# 检查 PostgreSQL 是否启动
docker-compose ps postgres

# 检查 .env 中的 DATABASE_URL 是否正确
cat .env | grep DATABASE_URL

# 测试数据库连接
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c "SELECT 1;"
```

---

## 📋 部署检查清单

- [ ] Docker 镜像已加载（`docker images`）
- [ ] 项目文件已解压到 `/opt/calendar-task-manager`
- [ ] `.env` 文件已配置（密码、JWT 密钥）
- [ ] `docker-compose.yml` 镜像版本正确
- [ ] PostgreSQL 容器启动成功（`docker-compose ps`）
- [ ] 数据库迁移已完成或字段已手动添加
- [ ] 应用容器启动成功，无错误日志
- [ ] 可以通过浏览器访问应用
- [ ] 可以正常登录和创建任务
- [ ] 新功能（颜色、进度）可用

---

## 🔄 后续更新流程

下次更新时：

```bash
# 1. 在有网络的电脑上构建新镜像
docker build -t calendar-task-manager:2025.12.01 .
docker save -o calendar-task-manager_2025.12.01.tar calendar-task-manager:2025.12.01

# 2. 传输到内网服务器并加载
docker load -i calendar-task-manager_2025.12.01.tar

# 3. 修改 docker-compose.yml 中的镜像版本
# image: calendar-task-manager:2025.12.01

# 4. 重启容器
docker-compose down
docker-compose up -d

# 5. 如有新的数据库变更，执行迁移或手动添加字段
```

---

## 📞 技术支持

遇到问题？

1. 查看日志：`docker-compose logs -f`
2. 检查容器状态：`docker-compose ps`
3. 进入容器调试：`docker exec -it calendar-app sh`
4. 查看数据库：`docker exec -it calendar-postgres psql -U postgres -d calendar_tasks`

---

**部署完成后，记得删除服务器上的镜像 tar 文件以节省空间！**
