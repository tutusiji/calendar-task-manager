# 本地打包并通过 FTP 部署到服务器指南

## 📋 部署流程概述

本指南将指导你完成以下步骤:
1. 本地构建 Docker 镜像
2. 导出镜像为 tar 文件
3. 通过 FTP 上传镜像到服务器
4. 在服务器上加载并部署新镜像

---

## 🔧 准备工作

### 本地环境要求
- ✅ Docker Desktop 已安装并运行
- ✅ PowerShell 7+ (Windows)
- ✅ FTP 客户端工具 (FileZilla 或命令行工具)
- ✅ 项目代码已更新到最新版本

### 服务器环境要求
- ✅ Docker 和 Docker Compose 已安装
- ✅ FTP 服务已开启
- ✅ 有 SSH 访问权限

---

## 📦 步骤 1: 本地构建 Docker 镜像

### 方法一: 使用现有脚本 (推荐)

打开 PowerShell,进入项目目录:

```powershell
cd D:\CodeLab\calendar-task-manager

# 构建镜像(版本号可自定义,如 v1.0.0)
docker build -t calendar-task-manager:latest .

# 或者指定版本号
docker build -t calendar-task-manager:v1.0.0 .
```

**构建参数说明:**
- `-t`: 指定镜像名称和标签
- `.`: 当前目录为构建上下文

**预计构建时间:** 5-10 分钟(首次构建会更久)

### 验证镜像构建成功

```powershell
# 查看本地镜像
docker images | Select-String "calendar-task-manager"
```

**预期输出:**
```
calendar-task-manager   latest   abc123def456   2 minutes ago   500MB
```

---

## 💾 步骤 2: 导出镜像为 tar 文件

### 2.1 导出镜像

```powershell
# 导出为 tar 文件
docker save -o calendar-app.tar calendar-task-manager:latest

# 验证文件大小
Get-Item calendar-app.tar | Select-Object Name, Length
```

**注意事项:**
- 文件大小通常在 300-600 MB
- 确保磁盘空间充足
- 导出时间约 1-2 分钟

### 2.2 压缩 tar 文件 (可选,节省传输时间)

```powershell
# 使用 7-Zip 压缩(如果已安装)
7z a -tgzip calendar-app.tar.gz calendar-app.tar

# 或者使用 PowerShell 压缩
Compress-Archive -Path calendar-app.tar -DestinationPath calendar-app.tar.gz
```

**压缩效果:**
- 原始大小: ~500 MB
- 压缩后: ~200 MB (节省 60%)
- 压缩时间: 2-3 分钟

---

## 📤 步骤 3: 通过 FTP 上传到服务器

### 方法一: 使用 FileZilla (推荐,有图形界面)

1. **打开 FileZilla**
2. **连接服务器:**
   - 主机: `你的服务器IP`
   - 用户名: `root` 或其他用户
   - 密码: `你的密码`
   - 端口: `21` (FTP) 或 `22` (SFTP)

3. **上传文件:**
   - 本地目录: `D:\CodeLab\calendar-task-manager\`
   - 远程目录: `/tmp/` 或 `/opt/`
   - 拖拽 `calendar-app.tar` 到远程目录

**上传时间估算:**
- 100 Mbps 网络: ~40 秒(500MB)
- 10 Mbps 网络: ~7 分钟

### 方法二: 使用 PowerShell FTP 上传

```powershell
# FTP 上传脚本
$FtpServer = "ftp://你的服务器IP"
$Username = "root"
$Password = "你的密码"
$LocalFile = "D:\CodeLab\calendar-task-manager\calendar-app.tar"
$RemoteFile = "/tmp/calendar-app.tar"

# 创建 FTP 请求
$FtpRequest = [System.Net.FtpWebRequest]::Create("$FtpServer$RemoteFile")
$FtpRequest.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
$FtpRequest.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
$FtpRequest.UseBinary = $true
$FtpRequest.UsePassive = $true

# 读取文件并上传
$FileStream = [System.IO.File]::OpenRead($LocalFile)
$FtpStream = $FtpRequest.GetRequestStream()
$FileStream.CopyTo($FtpStream)

# 关闭流
$FtpStream.Close()
$FileStream.Close()

Write-Host "✅ 上传完成!" -ForegroundColor Green
```

### 方法三: 使用 SCP (更安全)

```powershell
# 需要安装 OpenSSH Client
scp calendar-app.tar root@你的服务器IP:/tmp/
```

---

## 🚀 步骤 4: 在服务器上部署新镜像

### 4.1 SSH 连接到服务器

```powershell
# 使用 PowerShell SSH
ssh root@你的服务器IP

# 或使用 PuTTY / MobaXterm
```

### 4.2 停止当前运行的容器

```bash
# 进入项目目录
cd /opt/calendar-task-manager

# 查看当前运行的容器
docker ps

# 停止并删除旧容器
docker-compose down

# 或者直接停止容器
docker stop calendar-app
docker rm calendar-app
```

**确认容器已停止:**
```bash
docker ps | grep calendar
# 应该没有输出
```

### 4.3 加载新镜像

```bash
# 进入 tar 文件所在目录
cd /tmp

# 加载镜像
docker load -i calendar-app.tar

# 验证镜像加载成功
docker images | grep calendar-task-manager
```

**预期输出:**
```
calendar-task-manager   latest   abc123def456   10 minutes ago   500MB
```

### 4.4 更新 docker-compose.yml (如果需要)

```bash
cd /opt/calendar-task-manager

# 编辑 docker-compose.yml
nano docker-compose.yml
```

**修改镜像名称 (如果不同):**
```yaml
services:
  app:
    image: calendar-task-manager:latest  # 确保与加载的镜像名一致
    container_name: calendar-app
    # ... 其他配置
```

### 4.5 启动新容器

```bash
# 首次部署需要拉取数据库镜像
docker pull postgres:16-alpine

# 启动服务
docker-compose up -d

# 查看启动日志
docker-compose logs -f app

# 按 Ctrl+C 退出日志查看
```

**注意事项:**
- 应用镜像只包含 Next.js 代码,不包含数据库
- PostgreSQL 数据库是独立容器(`postgres:16-alpine`)
- 数据存储在 Docker Volume `postgres_data` 中
- 更新应用不会影响数据库数据

**检查服务状态:**
```bash
# 查看容器状态
docker-compose ps

# 预期输出:
# NAME            STATUS          PORTS
# calendar-app    Up 30 seconds   0.0.0.0:3000->3000/tcp
```

### 4.6 运行数据库迁移 (如果有新的迁移)

```bash
docker exec calendar-app npx prisma migrate deploy
```

### 4.7 验证部署成功

```bash
# 检查应用健康状态
curl http://localhost:3000

# 或在浏览器访问
# http://你的服务器IP:3000
```

---

## 🧹 步骤 5: 清理工作

### 5.1 删除旧镜像 (释放空间)

```bash
# 查看所有镜像
docker images

# 删除未使用的镜像
docker image prune -a -f

# 或手动删除旧镜像
docker rmi <旧镜像ID>
```

### 5.2 删除 tar 文件

```bash
# 删除服务器上的 tar 文件
rm /tmp/calendar-app.tar

# 删除本地 tar 文件 (可选)
# 回到本地 PowerShell
Remove-Item D:\CodeLab\calendar-task-manager\calendar-app.tar
```

---

## 💾 数据库迁移 (可选)

### 场景一: 本地有测试数据想迁移到服务器

**本地导出数据:**
```powershell
# 导出数据库
docker exec calendar-postgres pg_dump -U postgres calendar_tasks > local_data.sql

# 上传到服务器
scp local_data.sql root@你的服务器IP:/tmp/
```

**服务器导入数据:**
```bash
# 导入数据到数据库
docker exec calendar-postgres psql -U postgres calendar_tasks < /tmp/local_data.sql

# 为旧数据补充邀请码(新注册用户会自动生成,不需要这步)
docker exec -i calendar-postgres psql -U postgres -d calendar_tasks << 'EOF'
UPDATE "OrganizationMember"
SET "inviteCode" = LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0')
WHERE "inviteCode" IS NULL;
EOF

# 删除临时文件
rm /tmp/local_data.sql
```

### 场景二: 服务器已有数据

**不需要任何操作!** Docker Volume `postgres_data` 会自动保留数据。

### 场景三: 清空数据库重新开始

```bash
# 停止服务
docker-compose down

# 删除数据 volume
docker volume rm calendar-task-manager_postgres_data

# 重新启动(会创建空数据库)
docker-compose up -d
```

---

## 🔄 完整部署脚本 (一键执行)

### 本地脚本: deploy-local.ps1

创建文件 `deploy-local.ps1`:

```powershell
# 一键部署脚本
param(
    [string]$ServerIP = "你的服务器IP",
    [string]$Username = "root",
    [string]$Version = "latest"
)

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "开始本地打包和部署" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# 1. 构建镜像
Write-Host "1. 构建 Docker 镜像..." -ForegroundColor Green
docker build -t calendar-task-manager:$Version .

# 2. 导出镜像
Write-Host "2. 导出镜像为 tar 文件..." -ForegroundColor Green
docker save -o calendar-app.tar calendar-task-manager:$Version

# 3. 上传到服务器 (使用 SCP)
Write-Host "3. 上传镜像到服务器..." -ForegroundColor Green
scp calendar-app.tar ${Username}@${ServerIP}:/tmp/

# 4. 在服务器上部署
Write-Host "4. 在服务器上部署..." -ForegroundColor Green
ssh ${Username}@${ServerIP} @"
    cd /opt/calendar-task-manager
    docker-compose down
    docker load -i /tmp/calendar-app.tar
    docker-compose up -d
    docker exec calendar-app npx prisma migrate deploy
    rm /tmp/calendar-app.tar
"@

# 5. 清理本地文件
Write-Host "5. 清理本地文件..." -ForegroundColor Green
Remove-Item calendar-app.tar

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ 部署完成!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
```

**使用方法:**
```powershell
.\deploy-local.ps1 -ServerIP "192.168.1.100" -Username "root" -Version "v1.0.0"
```

### 服务器脚本: deploy-server.sh

在服务器上创建 `/opt/calendar-task-manager/deploy-server.sh`:

```bash
#!/bin/bash

# 服务器端部署脚本
# 使用方法: ./deploy-server.sh /tmp/calendar-app.tar

set -e

TAR_FILE=$1

if [ -z "$TAR_FILE" ]; then
    echo "错误: 请指定 tar 文件路径"
    echo "使用方法: ./deploy-server.sh /tmp/calendar-app.tar"
    exit 1
fi

echo "====================================="
echo "开始部署新版本"
echo "====================================="

# 1. 备份数据库
echo "1. 备份数据库..."
BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
docker exec calendar-postgres pg_dump -U postgres calendar_tasks > "$BACKUP_DIR/backup_$DATE.sql" 2>/dev/null || echo "⚠️  数据库容器未运行,跳过备份"
echo "✅ 数据库已备份: $BACKUP_DIR/backup_$DATE.sql"

# 2. 停止当前应用容器(保留数据库容器)
echo "2. 停止当前应用容器..."
docker stop calendar-app 2>/dev/null || echo "应用容器未运行"
docker rm calendar-app 2>/dev/null || echo "应用容器不存在"

# 3. 删除旧镜像
echo "3. 删除旧镜像..."
OLD_IMAGE=$(docker images | grep calendar-task-manager | awk '{print $3}')
if [ ! -z "$OLD_IMAGE" ]; then
    docker rmi $OLD_IMAGE || true
fi

# 4. 加载新镜像
echo "4. 加载新镜像..."
docker load -i $TAR_FILE

# 5. 确保数据库镜像存在
echo "5. 检查数据库镜像..."
if ! docker images | grep -q "postgres.*16-alpine"; then
    echo "拉取 PostgreSQL 镜像..."
    docker pull postgres:16-alpine
fi

# 6. 启动新容器
echo "6. 启动新容器..."
docker-compose up -d

# 7. 等待启动
echo "7. 等待服务启动..."
sleep 10

# 8. 运行数据库迁移
echo "8. 运行数据库迁移..."
docker exec calendar-app npx prisma migrate deploy

# 9. 检查服务状态
echo "9. 检查服务状态..."
docker-compose ps

# 10. 清理
echo "10. 清理 tar 文件..."
rm -f $TAR_FILE

# 11. 清理未使用的镜像
echo "11. 清理未使用的镜像..."
docker image prune -f

echo "====================================="
echo "✅ 部署完成!"
echo "====================================="
echo ""
echo "查看日志: docker-compose logs -f app"
echo "访问应用: http://$(hostname -I | awk '{print $1}'):3000"
```

**使用方法:**
```bash
chmod +x deploy-server.sh
./deploy-server.sh /tmp/calendar-app.tar
```

---

## 📝 常见问题和解决方案

### Q1: 构建镜像时出现 "no space left on device" 错误

**解决方案:**
```powershell
# 清理 Docker 缓存
docker system prune -a -f

# 清理构建缓存
docker builder prune -a -f
```

### Q2: FTP 上传速度很慢

**解决方案:**
1. 先压缩 tar 文件再上传
2. 使用 rsync 代替 FTP (更快更可靠)
3. 考虑使用 Docker Hub 或私有镜像仓库

### Q3: 服务器上加载镜像失败

**解决方案:**
```bash
# 检查 tar 文件完整性
file calendar-app.tar

# 如果损坏,重新上传
# 确保上传使用二进制模式
```

### Q4: 新容器无法启动

**解决方案:**
```bash
# 查看详细日志
docker logs calendar-app

# 检查环境变量
docker exec calendar-app env

# 检查数据库连接
docker exec calendar-app npx prisma db pull
```

### Q5: 数据库迁移失败

**解决方案:**
```bash
# 先备份数据库
docker exec calendar-postgres pg_dump -U postgres calendar_tasks > backup.sql

# 检查迁移状态
docker exec calendar-app npx prisma migrate status

# 手动运行迁移
docker exec calendar-app npx prisma migrate deploy --skip-generate
```

---

## 🚀 进阶: 使用 Docker Hub (推荐)

如果你有稳定的网络,使用 Docker Hub 会更方便:

### 1. 推送到 Docker Hub

```powershell
# 登录 Docker Hub
docker login

# 打标签
docker tag calendar-task-manager:latest tutusiji/calendar-task-manager:latest

# 推送
docker push tutusiji/calendar-task-manager:latest
```

### 2. 在服务器上拉取

```bash
# 停止旧容器
docker-compose down

# 拉取新镜像
docker pull tutusiji/calendar-task-manager:latest

# 启动新容器
docker-compose up -d
```

**优势:**
- ✅ 不需要 FTP 传输
- ✅ 支持增量更新
- ✅ 可以回滚到任意版本
- ✅ 团队协作更方便

---

## 📊 性能对比

| 方法 | 传输时间 | 复杂度 | 稳定性 | 推荐度 |
|------|---------|--------|--------|--------|
| FTP 传输 | ~7 分钟 | ⭐⭐ | ⭐⭐ | ⭐⭐ |
| SCP 传输 | ~5 分钟 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Docker Hub | ~3 分钟 | ⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Git + 服务器构建 | ~10 分钟 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## ✅ 部署检查清单

### 部署前
- [ ] 本地代码已提交到 Git
- [ ] 环境变量已配置正确
- [ ] 数据库迁移文件已生成
- [ ] Docker Desktop 正在运行
- [ ] 服务器有足够的磁盘空间

### 部署中
- [ ] 镜像构建成功
- [ ] tar 文件导出成功
- [ ] 文件上传完成
- [ ] 旧容器已停止
- [ ] 新镜像加载成功

### 部署后
- [ ] 新容器正常运行
- [ ] 数据库迁移成功
- [ ] 应用可以正常访问
- [ ] 日志没有错误
- [ ] 清理了临时文件

---

## 📞 需要帮助?

如果遇到问题,可以:
1. 查看 Docker 日志: `docker logs calendar-app`
2. 查看服务状态: `docker-compose ps`
3. 检查网络连接: `docker network ls`
4. 重启 Docker: `systemctl restart docker`

---

**文档版本:** v1.0.0  
**最后更新:** 2025-11-19  
**适用版本:** Docker 20.10+, Next.js 16.0+
