# 本地构建镜像部署指南

## 🎯 适用场景

当服务器资源有限，无法在服务器上构建 Docker 镜像时，可以在本地构建好镜像，推送到 Docker Hub，然后在服务器上拉取部署。

## 📋 前置准备

### 本地环境
- ✅ Docker Desktop 已安装并运行
- ✅ Docker Hub 账号（tutusiji）
- ✅ Git

### 服务器环境
- ✅ Docker 和 Docker Compose 已安装
- ✅ 项目代码已克隆到 `/opt/calendar-task-manager`
- ✅ Nginx 已配置
- ✅ SSL 证书已上传

---

## 🚀 部署流程

### 步骤 1: 本地构建并推送镜像

在本地项目目录执行：

**Windows (PowerShell):**
```powershell
# 构建并推送最新版本
.\build-and-push.ps1

# 或指定版本号
.\build-and-push.ps1 v1.0.0
```

**Linux/Mac (Bash):**
```bash
# 添加执行权限
chmod +x build-and-push.sh

# 构建并推送最新版本
./build-and-push.sh

# 或指定版本号
./build-and-push.sh v1.0.0
```

脚本会自动：
1. 构建 Docker 镜像
2. 打上版本标签和 latest 标签
3. 登录 Docker Hub（首次需要输入用户名和密码）
4. 推送镜像到 Docker Hub

### 步骤 2: 在服务器上部署

连接到服务器：

```bash
ssh root@your-server-ip
```

执行部署脚本：

```bash
cd /opt/calendar-task-manager

# 赋予执行权限
chmod +x deploy/pull-and-deploy.sh

# 拉取并部署最新版本
./deploy/pull-and-deploy.sh

# 或指定版本号
./deploy/pull-and-deploy.sh v1.0.0
```

脚本会自动：
1. 备份当前数据库
2. 拉取最新镜像
3. 停止旧容器
4. 启动新容器
5. 清理旧镜像

---

## 🔍 服务说明

### 应用服务（app）
- **容器名**: calendar-app
- **端口**: 8100:3000
- **功能**: Next.js 主应用
- **访问**: https://souxy.com 或 https://joox.cc

### Prisma Studio（数据库管理）
- **容器名**: calendar-prisma-studio
- **端口**: 5555:5555
- **功能**: 可视化数据库管理界面
- **访问**: http://your-server-ip:5555

> ⚠️ **安全提示**: Prisma Studio 暴露了数据库管理界面，建议：
> 1. 只在需要时启动
> 2. 配置防火墙限制访问
> 3. 或使用 SSH 隧道访问

### PostgreSQL（数据库）
- **容器名**: calendar-postgres
- **端口**: 5432:5432
- **数据卷**: postgres_data

---

## 📝 常用命令

### 查看服务状态
```bash
docker-compose ps
```

### 查看日志
```bash
# 查看所有日志
docker-compose logs -f

# 只看应用日志
docker-compose logs -f app

# 只看 Prisma Studio 日志
docker-compose logs -f prisma-studio

# 只看数据库日志
docker-compose logs -f postgres
```

### 重启服务
```bash
# 重启应用
docker-compose restart app

# 重启 Prisma Studio
docker-compose restart prisma-studio

# 重启所有服务
docker-compose restart
```

### 停止/启动 Prisma Studio
```bash
# 停止 Prisma Studio（节省资源）
docker-compose stop prisma-studio

# 启动 Prisma Studio
docker-compose start prisma-studio
```

### 进入容器
```bash
# 进入应用容器
docker exec -it calendar-app sh

# 进入数据库容器
docker exec -it calendar-postgres psql -U postgres calendar_tasks
```

### 手动运行数据库迁移
```bash
docker exec calendar-app npx prisma migrate deploy
```

---

## 🔐 使用 SSH 隧道访问 Prisma Studio

如果不想暴露 5555 端口到公网，可以使用 SSH 隧道：

```bash
# 在本地执行
ssh -L 5555:localhost:5555 root@your-server-ip

# 然后在本地浏览器访问
http://localhost:5555
```

---

## 🔄 更新流程

### 快速更新（代码无变化，只更新配置）
```bash
cd /opt/calendar-task-manager
docker-compose restart
```

### 完整更新（有代码变更）

1. **本地构建新镜像**
```powershell
# Windows
.\build-and-push.ps1 v1.0.1
```

2. **服务器部署新版本**
```bash
ssh root@your-server-ip
cd /opt/calendar-task-manager
./deploy/pull-and-deploy.sh v1.0.1
```

---

## 🛠️ 故障排查

### 问题 1: 本地构建失败

**检查 Docker Desktop 是否运行:**
```powershell
docker ps
```

**清理缓存重新构建:**
```powershell
docker build --no-cache -t tutusiji/calendar-task-manager:latest .
```

### 问题 2: 推送失败

**重新登录 Docker Hub:**
```bash
docker logout
docker login
```

### 问题 3: 服务器拉取镜像失败

**检查网络连接:**
```bash
docker pull tutusiji/calendar-task-manager:latest
```

**使用代理:**
```bash
# 编辑 /etc/docker/daemon.json
{
  "registry-mirrors": ["https://your-mirror.com"]
}

sudo systemctl restart docker
```

### 问题 4: Prisma Studio 无法访问

**检查容器状态:**
```bash
docker-compose ps prisma-studio
```

**查看日志:**
```bash
docker-compose logs prisma-studio
```

**检查防火墙:**
```bash
sudo ufw status
sudo ufw allow 5555/tcp
```

### 问题 5: 数据库连接失败

**检查数据库容器:**
```bash
docker exec -it calendar-postgres psql -U postgres -c "\l"
```

**重启数据库:**
```bash
docker-compose restart postgres
```

---

## 📊 镜像版本管理

### 查看本地镜像
```bash
docker images | grep calendar-task-manager
```

### 删除旧版本镜像
```bash
# 删除特定版本
docker rmi tutusiji/calendar-task-manager:v1.0.0

# 清理未使用的镜像
docker image prune -f
```

### 在服务器上切换版本
```bash
# 回滚到特定版本
./deploy/pull-and-deploy.sh v1.0.0

# 升级到最新版本
./deploy/pull-and-deploy.sh latest
```

---

## 🔐 安全建议

1. **限制 Prisma Studio 访问**
   ```bash
   # 只在需要时启动
   docker-compose up -d postgres app
   
   # 需要时才启动 Prisma Studio
   docker-compose up -d prisma-studio
   ```

2. **使用防火墙**
   ```bash
   # 只允许特定 IP 访问 5555 端口
   sudo ufw allow from your-ip-address to any port 5555
   ```

3. **定期备份数据库**
   ```bash
   # 创建自动备份脚本
   crontab -e
   # 每天凌晨 2 点备份
   0 2 * * * /opt/calendar-task-manager/deploy/backup.sh
   ```

4. **监控容器资源**
   ```bash
   docker stats
   ```

---

## 📞 支持

遇到问题？

1. 查看日志：`docker-compose logs -f`
2. 检查容器状态：`docker-compose ps`
3. 查看 GitHub Issues
4. 查看 Nginx 错误日志：`sudo tail -f /var/log/nginx/error.log`

---

## 🎉 完成

现在你可以：
- ✅ 访问应用：https://souxy.com 或 https://joox.cc
- ✅ 管理数据库：http://your-server-ip:5555
- ✅ 在本地构建镜像，无需在服务器上编译

每次代码更新：
1. 本地运行 `.\build-and-push.ps1`
2. 服务器运行 `./deploy/pull-and-deploy.sh`
3. 完成！
