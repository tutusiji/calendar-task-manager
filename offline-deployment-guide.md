# 离线部署指南 - 内网环境部署

## 📦 部署包内容

本部署包包含以下文件：
```
calendar-offline-deploy/
├── images/
│   ├── calendar-app.tar           # 应用镜像 (~2GB)
│   └── postgres.tar                # PostgreSQL 镜像 (~90MB)
├── config/
│   ├── docker-compose.yml          # Docker Compose 配置
│   ├── database-full-update.sql    # 数据库更新脚本
│   └── .env.example                # 环境变量示例
├── scripts/
│   ├── 1-load-images.sh           # 加载镜像脚本
│   ├── 2-init-database.sh         # 初始化数据库脚本
│   └── 3-start-app.sh             # 启动应用脚本
└── README.md                       # 本文件
```

## 🔧 前置要求

内网服务器需要已安装：
- ✅ Docker Engine (20.10+)
- ✅ Docker Compose (2.0+)
- ✅ 至少 10GB 可用磁盘空间
- ✅ 端口 8100、5432、5555 未被占用

## 📥 第一步：准备部署包（在外网环境执行）

### 1.1 构建应用镜像

```powershell
# 在项目根目录执行
docker build -t calendar-task-manager:latest .
```

### 1.2 拉取 PostgreSQL 镜像

```powershell
docker pull postgres:16-alpine
```

### 1.3 导出镜像为 tar 文件

```powershell
# 创建部署目录结构
New-Item -ItemType Directory -Force -Path .\offline-deploy\images
New-Item -ItemType Directory -Force -Path .\offline-deploy\config
New-Item -ItemType Directory -Force -Path .\offline-deploy\scripts

# 导出应用镜像（约2GB，需要几分钟）
docker save -o .\offline-deploy\images\calendar-app.tar calendar-task-manager:latest

# 导出 PostgreSQL 镜像（约90MB）
docker save -o .\offline-deploy\images\postgres.tar postgres:16-alpine

# 复制配置文件
Copy-Item .\docker-compose.yml .\offline-deploy\config\
Copy-Item .\database-full-update.sql .\offline-deploy\config\
Copy-Item .\offline-deployment-guide.md .\offline-deploy\README.md
```

### 1.4 创建 Linux 部署脚本

```powershell
# 这些脚本会自动创建（见下方）
```

### 1.5 打包整个目录

```powershell
# 使用 7-Zip 或其他工具打包
# 或者直接复制 offline-deploy 文件夹到 U 盘
Compress-Archive -Path .\offline-deploy\* -DestinationPath calendar-offline-deploy.zip
```

## 🚀 第二步：在内网服务器部署（Linux）

### 2.1 上传部署包

```bash
# 通过 U 盘、内网文件服务器等方式上传 offline-deploy 文件夹到服务器
# 假设上传到 /opt/calendar-deploy

cd /opt/calendar-deploy
```

### 2.2 加载 Docker 镜像

```bash
# 执行镜像加载脚本
chmod +x scripts/*.sh
./scripts/1-load-images.sh

# 或手动执行
docker load -i images/calendar-app.tar
docker load -i images/postgres.tar

# 验证镜像已加载
docker images
```

预期输出：
```
REPOSITORY               TAG       IMAGE ID       CREATED        SIZE
calendar-task-manager    latest    xxxxx          X hours ago    2.42GB
postgres                 16-alpine xxxxx          X weeks ago    242MB
```

### 2.3 配置环境变量

```bash
# 进入配置目录
cd config

# 创建 .env 文件（根据实际情况修改密码）
cat > .env << 'EOF'
POSTGRES_PASSWORD=your_strong_password_here
DOCKER_IMAGE=calendar-task-manager:latest
EOF

# 设置文件权限
chmod 600 .env
```

### 2.4 启动服务

```bash
# 启动所有容器
docker-compose up -d

# 查看容器状态
docker ps

# 查看日志
docker-compose logs -f
```

预期看到 3 个容器运行：
- calendar-postgres (健康)
- calendar-app (运行中)
- calendar-prisma-studio (运行中)

### 2.5 初始化数据库

```bash
# 等待数据库启动（约10秒）
sleep 10

# 执行数据库更新脚本
docker exec -i calendar-postgres psql -U postgres -d calendar_tasks < database-full-update.sql

# 验证数据库更新
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c "SELECT enum_range(NULL::\"NotificationType\");"
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c "\d \"User\""
```

### 2.6 验证部署

```bash
# 检查容器健康状态
docker ps

# 测试应用访问（替换为实际内网 IP）
curl http://localhost:8100

# 访问 Web 界面
# 浏览器打开: http://内网IP:8100

# 访问 Prisma Studio（数据库管理）
# 浏览器打开: http://内网IP:5555
```

## 🔍 故障排查

### 问题 1: 容器启动失败

```bash
# 查看详细日志
docker-compose logs app
docker-compose logs postgres

# 检查端口占用
netstat -tlnp | grep -E '8100|5432|5555'
```

### 问题 2: 数据库连接失败

```bash
# 检查数据库是否健康
docker exec -it calendar-postgres pg_isready -U postgres

# 手动测试连接
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c "SELECT 1;"
```

### 问题 3: 镜像加载失败

```bash
# 检查 tar 文件完整性
ls -lh images/*.tar

# 重新加载
docker load -i images/calendar-app.tar
```

## 📊 数据库备份和恢复

### 备份数据库

```bash
# 导出整个数据库
docker exec calendar-postgres pg_dump -U postgres calendar_tasks > backup-$(date +%Y%m%d).sql

# 或使用 Docker 卷备份
docker run --rm \
  -v calendar-task-manager_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-data-$(date +%Y%m%d).tar.gz /data
```

### 恢复数据库

```bash
# 从 SQL 文件恢复
docker exec -i calendar-postgres psql -U postgres -d calendar_tasks < backup-20251120.sql

# 从卷备份恢复
docker run --rm \
  -v calendar-task-manager_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres-data-20251120.tar.gz -C /
```

## 🔄 更新应用

当有新版本需要部署时：

```bash
# 1. 停止当前应用（保留数据库）
docker stop calendar-app calendar-prisma-studio

# 2. 加载新镜像
docker load -i new-calendar-app.tar

# 3. 启动新版本
docker-compose up -d

# 4. 执行数据库迁移（如果有）
docker exec -i calendar-postgres psql -U postgres -d calendar_tasks < new-migration.sql
```

## 🛡️ 安全建议

1. **修改默认密码**
   ```bash
   # 在 .env 文件中设置强密码
   POSTGRES_PASSWORD=使用复杂密码
   ```

2. **限制访问端口**
   ```bash
   # 如果不需要外部访问 Prisma Studio，可以注释掉 docker-compose.yml 中的端口映射
   # ports:
   #   - "5555:5555"  # 注释这行
   ```

3. **定期备份**
   ```bash
   # 设置定时任务每天备份
   crontab -e
   # 添加：0 2 * * * /opt/calendar-deploy/scripts/backup.sh
   ```

## 📞 技术支持

如遇到问题，请检查：
1. Docker 和 Docker Compose 版本是否满足要求
2. 所有镜像是否正确加载
3. 端口是否被其他服务占用
4. 数据库更新脚本是否执行成功
5. 容器日志中的错误信息

---

**部署包版本**: 2025.11.20  
**应用版本**: calendar-task-manager:latest  
**数据库版本**: PostgreSQL 16 Alpine  
