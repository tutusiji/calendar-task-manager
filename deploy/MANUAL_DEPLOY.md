# 手动打包上传部署指南

## 🎯 适用场景

服务器资源有限，无法构建镜像，通过本地构建 + FTP 上传 + 服务器加载的方式部署。

---

## 📋 部署流程

### 步骤 1: 本地构建镜像

在项目根目录执行：

```powershell
# 构建 Docker 镜像
docker build -t calendar-task-manager:latest .
```

> ⏱️ 预计耗时：5-10 分钟（首次构建）

### 步骤 2: 保存镜像为文件

```powershell
# 将镜像保存为 tar 文件
docker save calendar-task-manager:latest -o calendar-app.tar
```

> 📦 生成文件：`calendar-app.tar`（约 500MB-1GB）
> 
> 💡 文件位置：当前项目根目录 `D:\CodeLab\calendar-task-manager\calendar-app.tar`

### 步骤 3: 上传到服务器

使用 FTP 工具（如 FileZilla、WinSCP）上传 `calendar-app.tar` 到服务器：

**推荐上传路径：**
```
/opt/calendar-task-manager/calendar-app.tar
```

> ⏱️ 上传时间取决于网络速度

---

## 🚀 服务器端部署

### 步骤 1: 连接到服务器

```bash
ssh root@your-server-ip
```

### 步骤 2: 进入项目目录

```bash
cd /opt/calendar-task-manager
```

### 步骤 3: 备份数据库（可选但推荐）

```bash
# 创建备份目录
mkdir -p backups

# 备份数据库
docker exec calendar-postgres pg_dump -U postgres calendar_tasks > backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### 步骤 4: 加载新镜像

```bash
# 加载镜像文件
docker load -i calendar-app.tar
```

> ✅ 成功提示：`Loaded image: calendar-task-manager:latest`

### 步骤 5: 验证镜像

```bash
# 查看镜像列表
docker images | grep calendar
```

应该看到类似输出：
```
calendar-task-manager    latest    xxxxxxxxx    刚刚    xxxMB
```

### 步骤 6: 停止旧容器

```bash
docker-compose down
```

### 步骤 7: 启动新容器

```bash
docker-compose up -d
```

### 步骤 8: 查看服务状态

```bash
# 查看容器状态
docker-compose ps

# 查看启动日志
docker-compose logs -f app
```

> 💡 按 `Ctrl+C` 退出日志查看

### 步骤 9: 验证部署

```bash
# 测试应用是否响应
curl http://localhost:8100

# 查看所有服务状态
docker-compose ps
```

应该看到：
- `calendar-app` - Up
- `calendar-postgres` - Up
- `calendar-prisma-studio` - Up

### 步骤 10: 清理 tar 文件（可选）

```bash
# 删除镜像文件节省空间
rm calendar-app.tar
```

---

## 🌐 访问应用

部署成功后访问：
- **主应用**: https://souxy.com 或 https://joox.cc
- **Prisma Studio**: http://your-server-ip:5555

---

## 🔄 后续更新流程

### 更新代码后重新部署

**本地操作：**
```powershell
# 1. 提交代码（可选）
git add .
git commit -m "更新说明"
git push

# 2. 重新构建镜像
docker build -t calendar-task-manager:latest .

# 3. 保存为 tar 文件
docker save calendar-task-manager:latest -o calendar-app.tar

# 4. 使用 FTP 上传 calendar-app.tar 到服务器
```

**服务器操作：**
```bash
# 1. 连接服务器
ssh root@your-server-ip

# 2. 进入目录
cd /opt/calendar-task-manager

# 3. 备份数据库
docker exec calendar-postgres pg_dump -U postgres calendar_tasks > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# 4. 加载新镜像
docker load -i calendar-app.tar

# 5. 重启服务
docker-compose down
docker-compose up -d

# 6. 查看日志
docker-compose logs -f

# 7. 清理文件
rm calendar-app.tar
```

---

## 📝 快速命令参考

### 本地常用命令

```powershell
# 查看本地镜像
docker images

# 删除旧镜像
docker rmi calendar-task-manager:latest

# 重新构建（不使用缓存）
docker build --no-cache -t calendar-task-manager:latest .

# 查看镜像大小
docker images calendar-task-manager
```

### 服务器常用命令

```bash
# 查看容器状态
docker-compose ps

# 查看所有日志
docker-compose logs -f

# 只看应用日志
docker-compose logs -f app

# 重启应用
docker-compose restart app

# 重启所有服务
docker-compose restart

# 停止所有服务
docker-compose down

# 查看数据库
docker exec -it calendar-postgres psql -U postgres calendar_tasks

# 查看镜像列表
docker images

# 清理未使用的镜像
docker image prune -f
```

---

## 🛠️ 故障排查

### 问题 1: 构建失败

**检查 Docker 是否运行：**
```powershell
docker ps
```

**清理缓存重新构建：**
```powershell
docker build --no-cache -t calendar-task-manager:latest .
```

### 问题 2: 文件上传失败

- 检查网络连接
- 检查服务器磁盘空间：`df -h`
- 尝试分段上传或使用 rsync：
  ```bash
  rsync -avz --progress calendar-app.tar root@your-server-ip:/opt/calendar-task-manager/
  ```

### 问题 3: 加载镜像失败

**检查文件完整性：**
```bash
# 查看文件大小
ls -lh calendar-app.tar

# 重新上传文件
```

**查看错误信息：**
```bash
docker load -i calendar-app.tar
```

### 问题 4: 容器启动失败

**查看详细日志：**
```bash
docker-compose logs app
```

**检查数据库连接：**
```bash
docker exec -it calendar-postgres psql -U postgres -c "\l"
```

**重新运行迁移：**
```bash
docker exec calendar-app npx prisma migrate deploy
```

### 问题 5: 端口冲突

**检查端口占用：**
```bash
netstat -tulpn | grep 8100
netstat -tulpn | grep 5432
netstat -tulpn | grep 5555
```

**停止占用端口的进程或修改 docker-compose.yml 端口映射**

---

## 💡 优化建议

### 1. 使用 rsync 上传（更快更可靠）

**本地安装 rsync（Windows 需要 WSL 或 Git Bash）：**
```bash
rsync -avz --progress calendar-app.tar root@your-server-ip:/opt/calendar-task-manager/
```

优势：
- ✅ 断点续传
- ✅ 压缩传输
- ✅ 显示进度

### 2. 压缩 tar 文件

```powershell
# 本地压缩
gzip calendar-app.tar
# 生成 calendar-app.tar.gz

# 服务器解压并加载
gunzip calendar-app.tar.gz
docker load -i calendar-app.tar
```

### 3. 定期清理旧镜像

```bash
# 服务器上清理
docker image prune -a -f
```

### 4. 自动化脚本

创建本地脚本 `build.ps1`：
```powershell
docker build -t calendar-task-manager:latest .
docker save calendar-task-manager:latest -o calendar-app.tar
Write-Host "✅ 镜像已保存到 calendar-app.tar" -ForegroundColor Green
Write-Host "📤 请使用 FTP 工具上传到服务器" -ForegroundColor Yellow
```

创建服务器脚本 `deploy.sh`：
```bash
#!/bin/bash
cd /opt/calendar-task-manager
docker exec calendar-postgres pg_dump -U postgres calendar_tasks > backups/backup_$(date +%Y%m%d_%H%M%S).sql
docker load -i calendar-app.tar
docker-compose down
docker-compose up -d
docker-compose logs -f app
```

---

## 🔐 安全提醒

1. **备份很重要**：每次部署前备份数据库
2. **磁盘空间**：定期清理旧镜像和日志
3. **Prisma Studio**：生产环境建议关闭或限制访问
4. **环境变量**：确保 `.env` 文件安全，不要提交到 Git

---

## 📊 部署时间估算

| 步骤 | 耗时 |
|------|------|
| 本地构建镜像 | 5-10 分钟 |
| 保存为 tar | 1-2 分钟 |
| 上传到服务器 | 10-30 分钟（取决于网速） |
| 服务器加载镜像 | 1-2 分钟 |
| 重启服务 | 30 秒 |
| **总计** | **约 20-45 分钟** |

---

## 📞 支持

遇到问题？

1. 查看日志：`docker-compose logs -f`
2. 检查容器状态：`docker-compose ps`
3. 查看 Nginx 日志：`sudo tail -f /var/log/nginx/error.log`
4. 检查防火墙：`sudo ufw status`

---

## ✅ 完成清单

部署前检查：
- [ ] 本地 Docker 运行正常
- [ ] 代码已提交（可选）
- [ ] 磁盘空间足够（至少 2GB）
- [ ] FTP 工具已准备
- [ ] 服务器可以访问

部署后验证：
- [ ] 容器全部运行：`docker-compose ps`
- [ ] 应用可以访问：https://souxy.com
- [ ] Prisma Studio 可以访问：http://server-ip:5555
- [ ] 数据正常显示
- [ ] 日志无错误：`docker-compose logs`

🎉 **部署完成！**
