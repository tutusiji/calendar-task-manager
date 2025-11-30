# 离线部署指南 - Calendar Task Manager

## 📋 部署概览

本指南适用于**完全离线/手动部署**场景：

- ✅ 本地构建 Docker 镜像
- ✅ 导出镜像为 tar 文件
- ✅ 手动上传到服务器（FTP/SCP）
- ✅ 手动导入镜像
- ✅ 手动执行数据库迁移
- ✅ 手动重启容器
- ❌ 不使用 Docker Hub
- ❌ 不使用 GitHub

---

## 🔧 第一步：本地构建镜像

### 1.1 确认环境

```bash
# 进入项目目录
cd d:\CodeLab\calendar-task-manager

# 确认 Docker 正在运行
docker --version

# 确认当前代码是最新的
git status
```

### 1.2 构建 Docker 镜像

```bash
# 构建镜像（使用日期作为版本号）
docker build -t calendar-task-manager:2025-11-29 .

# 验证镜像已创建
docker images | grep calendar-task-manager
```

**预期输出**：

```
calendar-task-manager   2025-11-29   abc123def456   2 minutes ago   XXX MB
```

---

## 📦 第二步：导出镜像

### 2.1 导出为 tar 文件

```bash
# 导出镜像（注意：文件名使用下划线，不是冒号）
docker save -o calendar-task-manager_2025-11-29.tar calendar-task-manager:2025-11-29

# 验证文件已创建
dir calendar-task-manager_2025-11-29.tar
```

**文件大小**：约 500MB - 1GB（取决于依赖）

### 2.2 压缩文件（可选，节省上传时间）

```bash
# 使用 7-Zip 或 WinRAR 压缩
# 或使用 PowerShell
Compress-Archive -Path calendar-task-manager_2025-11-29.tar -DestinationPath calendar-task-manager_2025-11-29.tar.zip
```

---

## 🚀 第三步：上传到服务器

### 3.1 使用 FTP 上传

```bash
# 使用 FileZilla 或其他 FTP 客户端
# 服务器地址: your-server.com
# 端口: 21
# 上传文件到: /home/your-user/docker-images/
```

### 3.2 使用 SCP 上传（推荐）

```bash
# Windows PowerShell 或 Git Bash
scp calendar-task-manager_2025-11-29.tar user@your-server.com:/home/user/docker-images/

# 如果压缩了
scp calendar-task-manager_2025-11-29.tar.zip user@your-server.com:/home/user/docker-images/
```

### 3.3 使用 WinSCP（图形界面）

1. 打开 WinSCP
2. 连接到服务器
3. 拖拽文件到 `/home/user/docker-images/`

---

## 🖥️ 第四步：服务器端操作

### 4.1 SSH 登录服务器

```bash
ssh user@your-server.com
```

### 4.2 解压文件（如果压缩了）

```bash
cd /home/user/docker-images/

# 如果使用了 zip 压缩
unzip calendar-task-manager_2025-11-29.tar.zip

# 验证 tar 文件存在
ls -lh calendar-task-manager_2025-11-29.tar
```

### 4.3 导入 Docker 镜像

```bash
# 导入镜像
docker load -i calendar-task-manager_2025-11-29.tar

# 验证镜像已导入
docker images | grep calendar-task-manager
```

**预期输出**：

```
calendar-task-manager   2025-11-29   abc123def456   10 minutes ago   XXX MB
```

---

## 🗄️ 第五步：数据库迁移（重要！）

### 5.1 备份现有数据库

```bash
# 连接到 PostgreSQL 容器
docker exec -it postgres-db bash

# 在容器内执行备份
pg_dump -U your_user -d calendar_db > /tmp/backup_$(date +%Y%m%d_%H%M%S).sql

# 退出容器
exit

# 复制备份到宿主机
docker cp postgres-db:/tmp/backup_*.sql ./
```

### 5.2 手动添加数据库字段

#### 方式一：使用 psql 命令行

```bash
# 连接到数据库
docker exec -it postgres-db psql -U your_user -d calendar_db

# 执行 SQL
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultTeamId" TEXT;

# 验证字段已添加
\d "User"

# 退出
\q
```

#### 方式二：使用 SQL 文件

创建迁移文件 `migration_2025-11-29.sql`：

```sql
-- 添加 defaultTeamId 字段
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultTeamId" TEXT;

-- 验证字段
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'User' AND column_name = 'defaultTeamId';
```

执行迁移：

```bash
# 复制 SQL 文件到容器
docker cp migration_2025-11-29.sql postgres-db:/tmp/

# 执行迁移
docker exec -it postgres-db psql -U your_user -d calendar_db -f /tmp/migration_2025-11-29.sql
```

### 5.3 验证数据库更新

```bash
# 查询新字段
docker exec -it postgres-db psql -U your_user -d calendar_db -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'defaultTeamId';"
```

**预期输出**：

```
 column_name  | data_type
--------------+-----------
 defaultTeamId | text
(1 row)
```

---

## 🔄 第六步：停止旧容器

### 6.1 查看当前运行的容器

```bash
docker ps | grep calendar-task-manager
```

### 6.2 停止并删除旧容器

```bash
# 停止容器
docker stop calendar-task-manager

# 删除容器
docker rm calendar-task-manager

# 验证已删除
docker ps -a | grep calendar-task-manager
```

---

## 🚀 第七步：启动新容器

### 7.1 使用 docker run 启动

```bash
docker run -d \
  --name calendar-task-manager \
  --network calendar-network \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://your_user:your_password@postgres-db:5432/calendar_db" \
  -e NEXTAUTH_URL="http://your-server.com:3000" \
  -e NEXTAUTH_SECRET="your-secret-key-here" \
  --restart unless-stopped \
  calendar-task-manager:2025-11-29
```

### 7.2 使用 docker-compose 启动（推荐）

如果你有 `docker-compose.yml` 文件：

```bash
# 进入项目目录
cd /path/to/docker-compose-dir

# 更新 docker-compose.yml 中的镜像版本
# image: calendar-task-manager:2025-11-29

# 启动服务
docker-compose up -d app

# 或重启所有服务
docker-compose down
docker-compose up -d
```

---

## ✅ 第八步：验证部署

### 8.1 检查容器状态

```bash
# 查看容器是否运行
docker ps | grep calendar-task-manager

# 查看容器日志
docker logs -f calendar-task-manager

# 按 Ctrl+C 退出日志查看
```

### 8.2 检查应用健康状态

```bash
# 测试应用是否响应
curl http://localhost:3000

# 或在浏览器访问
# http://your-server.com:3000
```

### 8.3 检查数据库连接

```bash
# 进入容器
docker exec -it calendar-task-manager sh

# 测试数据库连接（如果有 psql）
# 或查看应用日志确认数据库连接成功

# 退出容器
exit
```

---

## 🧹 第九步：清理（可选）

### 9.1 删除旧镜像

```bash
# 查看所有镜像
docker images | grep calendar-task-manager

# 删除旧版本镜像
docker rmi calendar-task-manager:2025-11-26

# 删除未使用的镜像
docker image prune -a
```

### 9.2 清理服务器上的 tar 文件

```bash
# 删除导入后的 tar 文件
rm /home/user/docker-images/calendar-task-manager_2025-11-29.tar

# 或移动到归档目录
mkdir -p /home/user/docker-images/archive
mv /home/user/docker-images/calendar-task-manager_2025-11-29.tar /home/user/docker-images/archive/
```

---

## 📋 完整部署检查清单

### 本地操作

- [ ] 代码已提交并确认是最新版本
- [ ] Docker 镜像构建成功
- [ ] 镜像已导出为 tar 文件
- [ ] tar 文件已上传到服务器

### 服务器操作

- [ ] SSH 已登录服务器
- [ ] tar 文件已解压（如果压缩了）
- [ ] Docker 镜像已导入
- [ ] 数据库已备份
- [ ] 数据库字段已添加（defaultTeamId）
- [ ] 数据库更新已验证
- [ ] 旧容器已停止并删除
- [ ] 新容器已启动
- [ ] 容器状态正常
- [ ] 应用可访问
- [ ] 日志无错误

### 功能测试

- [ ] 用户可以登录
- [ ] 任务进度拖拽功能正常
- [ ] 人员选择器可以滚动
- [ ] 团队快捷选择功能正常
- [ ] 周视图今日高亮显示

---

## 🔧 故障排查

### 问题 1：容器无法启动

```bash
# 查看详细日志
docker logs calendar-task-manager

# 检查环境变量
docker inspect calendar-task-manager | grep -A 20 Env

# 检查网络连接
docker network ls
docker network inspect calendar-network
```

### 问题 2：数据库连接失败

```bash
# 检查数据库容器是否运行
docker ps | grep postgres

# 测试数据库连接
docker exec -it postgres-db psql -U your_user -d calendar_db -c "SELECT 1;"

# 检查 DATABASE_URL 环境变量格式
echo $DATABASE_URL
```

### 问题 3：镜像导入失败

```bash
# 检查 tar 文件完整性
md5sum calendar-task-manager_2025-11-29.tar

# 重新下载/上传文件
# 确保文件传输模式为二进制模式（FTP）
```

### 问题 4：端口被占用

```bash
# 检查端口占用
netstat -tulpn | grep 3000

# 停止占用端口的进程
kill -9 <PID>

# 或使用不同端口
docker run -p 3001:3000 ...
```

---

## 📝 快速命令参考

### 本地构建和导出

```bash
# 一键构建并导出
docker build -t calendar-task-manager:2025-11-29 . && \
docker save -o calendar-task-manager_2025-11-29.tar calendar-task-manager:2025-11-29
```

### 服务器导入和部署

```bash
# 一键导入、迁移和部署
docker load -i calendar-task-manager_2025-11-29.tar && \
docker exec -it postgres-db psql -U your_user -d calendar_db -c "ALTER TABLE \"User\" ADD COLUMN IF NOT EXISTS \"defaultTeamId\" TEXT;" && \
docker stop calendar-task-manager && \
docker rm calendar-task-manager && \
docker run -d --name calendar-task-manager --network calendar-network -p 3000:3000 \
  -e DATABASE_URL="postgresql://your_user:your_password@postgres-db:5432/calendar_db" \
  --restart unless-stopped calendar-task-manager:2025-11-29
```

---

## 📊 版本历史

| 版本       | 日期       | 主要变更                     | 数据库迁移 |
| ---------- | ---------- | ---------------------------- | ---------- |
| 2025-11-29 | 2025-11-29 | 任务进度拖拽、人员选择器增强 | ✅ 需要    |
| 2025-11-26 | 2025-11-26 | 之前的版本                   | -          |

---

## 🆘 紧急回滚

如果新版本出现问题，快速回滚到旧版本：

```bash
# 停止新容器
docker stop calendar-task-manager
docker rm calendar-task-manager

# 启动旧版本
docker run -d --name calendar-task-manager --network calendar-network -p 3000:3000 \
  -e DATABASE_URL="..." \
  --restart unless-stopped calendar-task-manager:2025-11-26

# 恢复数据库（如果需要）
docker exec -i postgres-db psql -U your_user -d calendar_db < backup_20251129_*.sql
```

---

**部署时间**: 2025-11-29  
**版本**: v2025.11.29  
**部署方式**: 完全离线/手动部署  
**状态**: ✅ 准备就绪
