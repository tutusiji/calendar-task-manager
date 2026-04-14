# 全新服务器首次部署指南

本指南专门用于在全新服务器上首次部署 Calendar Task Manager,使用本地打包 + FTP/SCP 上传的方式。

---

## 📋 部署流程概览

```
本地电脑                     服务器
   │                          │
   ├─ 1. 构建镜像              │
   ├─ 2. 导出 tar             │
   ├─ 3. 上传文件 ──────────► │
   │                          ├─ 4. 安装 Docker
   │                          ├─ 5. 加载镜像
   │                          ├─ 6. 配置环境
   │                          ├─ 7. 启动服务
   │                          └─ 8. 初始化数据
```

---

## 第一部分: 服务器环境准备

### 1️⃣ 安装 Docker

SSH 连接到服务器后执行:

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动并设置开机自启
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
# 输出: Docker version 24.0.7, build ...
```

### 2️⃣ 安装 Docker Compose

```bash
# 下载 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
# 输出: Docker Compose version v2.23.0
```

### 3️⃣ 创建项目目录

```bash
# 创建项目根目录
mkdir -p /opt/calendar-task-manager
cd /opt/calendar-task-manager

# 创建子目录
mkdir -p backups logs uploads
```

---

## 第二部分: 本地打包

在你的本地 Windows 电脑上执行:

### 1️⃣ 构建最新镜像

```powershell
# 进入项目目录
cd D:\CodeLab\calendar-task-manager

# 确保代码是最新的
git status
git pull

# 构建镜像
docker build -t calendar-task-manager:latest .
```

**构建时间:** 约 5-10 分钟

### 2️⃣ 导出镜像

```powershell
# 导出为 tar 文件
docker save -o calendar-app.tar calendar-task-manager:latest

# 查看文件大小
Get-Item calendar-app.tar | Select-Object Name, @{Name="SizeMB";Expression={[math]::Round($_.Length/1MB,2)}}
```

**文件大小:** 约 450-550 MB

---

## 第三部分: 上传文件到服务器

### 需要上传的文件清单:

```
✅ calendar-app.tar          # 应用镜像(必需)
✅ docker-compose.yml        # 容器编排配置(必需)
✅ .env.example              # 环境变量模板(必需)
```

### 方法一: 使用 SCP (推荐)

```powershell
# 上传镜像
scp calendar-app.tar root@你的服务器IP:/opt/calendar-task-manager/

# 上传配置文件
scp docker-compose.yml root@你的服务器IP:/opt/calendar-task-manager/
scp .env.example root@你的服务器IP:/opt/calendar-task-manager/
```

### 方法二: 使用 FileZilla

1. **打开 FileZilla**
2. **连接设置:**
   - 协议: SFTP
   - 主机: 你的服务器 IP
   - 端口: 22
   - 用户名: root
   - 密码: 你的密码
3. **上传文件:**
   - 本地目录: `D:\CodeLab\calendar-task-manager`
   - 远程目录: `/opt/calendar-task-manager`
   - 拖拽文件上传

**上传时间:** 根据网速,约 5-15 分钟

---

## 第四部分: 服务器端部署

重新 SSH 连接到服务器:

### 1️⃣ 验证文件上传成功

```bash
cd /opt/calendar-task-manager
ls -lh
```

**应该看到:**

```
-rw-r--r-- 1 root root 480M Nov 19 10:00 calendar-app.tar
-rw-r--r-- 1 root root 2.1K Nov 19 10:00 docker-compose.yml
-rw-r--r-- 1 root root  512 Nov 19 10:00 .env.example
```

### 2️⃣ 加载 Docker 镜像

```bash
# 加载应用镜像
docker load -i calendar-app.tar

# 验证加载成功
docker images | grep calendar-task-manager
```

**预期输出:**

```
calendar-task-manager   latest   abc123def456   10 minutes ago   500MB
```

### 3️⃣ 拉取 PostgreSQL 镜像

```bash
# 拉取官方数据库镜像
docker pull postgres:16-alpine

# 验证
docker images | grep postgres
```

**预期输出:**

```
postgres   16-alpine   xyz789abc123   2 weeks ago   238MB
```

### 4️⃣ 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置
nano .env
```

**必须修改的配置:**

```bash
# 数据库密码(必须修改!)
POSTGRES_PASSWORD=你的超强密码

# 数据库连接(密码要和上面一致)
DATABASE_URL="postgresql://postgres:你的超强密码@postgres:5432/calendar_tasks?schema=public"

# JWT 密钥(必须生成!)
JWT_SECRET=运行下面的命令生成
```

**生成随机密钥:**

```bash
# 生成数据库密码
openssl rand -base64 32

# 生成 JWT 密钥
openssl rand -hex 64
```

**完整的 .env 示例:**

```bash
# 数据库配置
POSTGRES_PASSWORD=Ax8mK9pLq2Nm5Zr7Wt4Yv6
DATABASE_URL="postgresql://postgres:Ax8mK9pLq2Nm5Zr7Wt4Yv6@postgres:5432/calendar_tasks?schema=public"

# JWT 配置
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

# 应用配置
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://souxy.com
```

**保存并退出:** `Ctrl + O` → `Enter` → `Ctrl + X`

### 5️⃣ 检查 docker-compose.yml 配置

```bash
cat docker-compose.yml
```

**关键配置检查:**

```yaml
services:
  app:
    image: calendar-task-manager:latest # ✅ 确保镜像名正确
    ports:
      - "3000:3000" # ✅ 或改为 7049:3000
    environment:
      DATABASE_URL: ${DATABASE_URL} # ✅ 使用 .env 变量
```

如果需要修改端口:

```bash
nano docker-compose.yml
# 找到 app 服务的 ports:
# 改为: "7049:3000"  (外部访问 7049,容器内部 3000)
```

### 6️⃣ 启动所有服务

```bash
# 启动容器
docker-compose up -d

# 查看启动日志
docker-compose logs -f
```

**正常输出应该包含:**

```
✔ Network calendar-task-manager_calendar-network  Created
✔ Container calendar-postgres  Started
✔ Container calendar-app       Started
```

**按 Ctrl+C 退出日志查看**

### 7️⃣ 检查容器状态

```bash
docker ps
```

**应该看到 2 个容器运行:**

```
CONTAINER ID   IMAGE                          STATUS          PORTS
6f2f1c83b016   calendar-task-manager:latest   Up 30 seconds   0.0.0.0:3000->3000/tcp
6ed3c174be7f   postgres:16-alpine             Up 30 seconds   0.0.0.0:5432->5432/tcp
```

### 8️⃣ 等待服务启动

```bash
# 等待数据库完全启动
sleep 20

# 查看数据库日志,确认启动成功
docker logs calendar-postgres | tail -10
```

**应该看到:**

```
database system is ready to accept connections
```

---

## 第五部分: 初始化数据库

### 1️⃣ 同步数据库结构

```bash
# 推送 Prisma schema 到数据库(会自动创建所有表)
docker exec calendar-app npx prisma db push --accept-data-loss
```

**成功输出:**

```
🚀 Your database is now in sync with your Prisma schema.
✔ Generated Prisma Client
```

### 2️⃣ 验证表结构

```bash
# 查看所有表
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c "\dt"
```

**应该看到以下表:**

```
 Schema |        Name         | Type  |  Owner
--------+---------------------+-------+----------
 public | Notification        | table | postgres
 public | Organization        | table | postgres
 public | OrganizationMember  | table | postgres
 public | PersonalProject     | table | postgres
 public | Project             | table | postgres
 public | Task                | table | postgres
 public | TaskAssignee        | table | postgres
 public | TaskPermission      | table | postgres
 public | User                | table | postgres
 public | _prisma_migrations  | table | postgres
```

### 3️⃣ 创建第一个用户(管理员)

通过浏览器访问: `http://你的服务器IP:3000/login`

点击"注册"按钮,填写信息:

```
用户名: admin
邮箱: admin@yourdomain.com
密码: 你的管理员密码
确认密码: 你的管理员密码
```

**第一个注册的用户会自动成为管理员!**

### 4️⃣ 为组织成员生成邀请码 (仅旧数据迁移需要)

**注意:** 新用户注册时会自动生成邀请码,这一步只在从旧版本迁移数据时需要。

如果是全新部署,可以跳过此步骤。

如果是从旧数据库迁移,执行:

```bash
docker exec -i calendar-postgres psql -U postgres -d calendar_tasks << 'EOF'
-- 检查是否有缺失邀请码的成员
SELECT COUNT(*) as members_without_code FROM "OrganizationMember" WHERE "inviteCode" IS NULL;

-- 如果有缺失,为所有组织成员生成邀请码
UPDATE "OrganizationMember"
SET "inviteCode" = LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0')
WHERE "inviteCode" IS NULL;

-- 验证结果
SELECT COUNT(*) as total_members FROM "OrganizationMember";
SELECT COUNT(*) as members_with_code FROM "OrganizationMember" WHERE "inviteCode" IS NOT NULL;
EOF
```

---

## 第六部分: 验证部署

### 1️⃣ 测试应用响应

```bash
# 测试首页
curl http://localhost:3000

# 应该返回 HTML 内容
```

### 2️⃣ 在浏览器访问

```
http://你的服务器IP:3000
```

**应该看到登录界面**

### 3️⃣ 测试登录

使用刚创建的管理员账号登录:

- 用户名: `admin`
- 密码: `你设置的密码`

### 4️⃣ 测试创建任务

1. 登录后点击"创建任务"
2. 填写任务信息
3. 点击保存

如果能成功创建,说明部署成功!

### 5️⃣ 查看应用日志

```bash
# 查看最新日志
docker logs --tail 50 calendar-app

# 实时查看日志
docker logs -f calendar-app
```

**正常日志应该包含:**

```
✓ Ready in 2.5s
○ Compiling / ...
✓ Compiled / in 1.2s
```

---

## 第七部分: 配置防火墙和域名

### 1️⃣ 配置防火墙

```bash
# 安装 UFW
sudo apt install ufw -y

# 允许 SSH(防止被锁在外面!)
sudo ufw allow 22/tcp

# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 允许应用端口
sudo ufw allow 3000/tcp

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### 2️⃣ 配置 Nginx 反向代理(可选)

```bash
# 安装 Nginx
sudo apt install nginx -y

# 创建配置文件
sudo nano /etc/nginx/sites-available/calendar-app
```

**粘贴以下配置:**

```nginx
server {
    listen 80;
    server_name souxy.com www.souxy.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**启用配置:**

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/calendar-app /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 3️⃣ 配置 SSL 证书(推荐)

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d souxy.com -d www.souxy.com

# 测试自动续期
sudo certbot renew --dry-run
```

配置完成后,可以通过 HTTPS 访问:

```
https://souxy.com
```

---

## 第八部分: 自动化脚本

### 创建更新部署脚本

```bash
cat > /opt/calendar-task-manager/update.sh << 'EOF'
#!/bin/bash
set -e

echo "========================================="
echo "开始更新应用"
echo "========================================="

# 检查 tar 文件
if [ ! -f calendar-app.tar ]; then
    echo "❌ 错误: 未找到 calendar-app.tar 文件"
    echo "请先上传新的镜像文件"
    exit 1
fi

# 1. 备份数据库
echo "📦 1. 备份数据库..."
mkdir -p backups
docker exec calendar-postgres pg_dump -U postgres calendar_tasks > "backups/backup_$(date +%Y%m%d_%H%M%S).sql"
echo "✅ 备份完成"

# 2. 停止旧容器
echo "🛑 2. 停止旧容器..."
docker stop calendar-app
docker rm calendar-app
echo "✅ 容器已停止"

# 3. 删除旧镜像
echo "🗑️  3. 删除旧镜像..."
docker rmi calendar-task-manager:latest || true
echo "✅ 旧镜像已删除"

# 4. 加载新镜像
echo "📥 4. 加载新镜像..."
docker load -i calendar-app.tar
echo "✅ 新镜像已加载"

# 5. 启动新容器
echo "🚀 5. 启动新容器..."
docker-compose up -d app
echo "✅ 容器已启动"

# 6. 等待启动
echo "⏳ 6. 等待服务启动..."
sleep 20

# 7. 同步数据库
echo "🔄 7. 同步数据库..."
docker exec calendar-app npx prisma db push --accept-data-loss
echo "✅ 数据库已同步"

# 8. 检查状态
echo "🔍 8. 检查服务状态..."
docker ps | grep calendar

# 9. 清理
echo "🧹 9. 清理临时文件..."
rm calendar-app.tar
docker image prune -f
echo "✅ 清理完成"

echo "========================================="
echo "✅ 更新完成!"
echo "========================================="
echo ""
echo "查看日志: docker logs -f calendar-app"
echo "访问应用: http://$(hostname -I | awk '{print $1}'):3000"
EOF

# 添加执行权限
chmod +x update.sh
```

### 创建备份脚本

```bash
cat > /opt/calendar-task-manager/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/calendar-task-manager/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
docker exec calendar-postgres pg_dump -U postgres calendar_tasks | gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"

# 删除 7 天前的备份
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "✅ 备份完成: backup_$DATE.sql.gz"
echo "📊 当前备份列表:"
ls -lh $BACKUP_DIR
EOF

chmod +x backup.sh

# 添加到 crontab (每天凌晨 2 点备份)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/calendar-task-manager/backup.sh >> /opt/calendar-task-manager/logs/backup.log 2>&1") | crontab -
```

### 创建监控脚本

```bash
cat > /opt/calendar-task-manager/monitor.sh << 'EOF'
#!/bin/bash

echo "========================================="
echo "服务监控面板"
echo "========================================="

# 容器状态
echo "📦 容器状态:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep calendar

echo ""

# 资源使用
echo "💻 资源使用:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep calendar

echo ""

# 磁盘使用
echo "💾 磁盘使用:"
df -h | grep -E "Filesystem|/opt"

echo ""

# 最新日志
echo "📝 最新日志(最近 5 条):"
docker logs --tail 5 calendar-app

echo ""
echo "========================================="
EOF

chmod +x monitor.sh
```

**使用脚本:**

```bash
# 更新应用(上传 calendar-app.tar 后执行)
./update.sh

# 手动备份数据库
./backup.sh

# 查看服务状态
./monitor.sh
```

---

## 🎯 部署完成检查清单

完成以下所有项目,确保部署成功:

### 服务器环境

- [ ] Docker 已安装并运行
- [ ] Docker Compose 已安装
- [ ] 项目目录已创建 (`/opt/calendar-task-manager`)

### 镜像和容器

- [ ] 应用镜像已加载 (`calendar-task-manager:latest`)
- [ ] PostgreSQL 镜像已拉取 (`postgres:16-alpine`)
- [ ] 两个容器都在运行 (`docker ps` 显示 2 个)

### 配置文件

- [ ] `.env` 文件已配置
- [ ] 数据库密码已设置(强密码)
- [ ] JWT 密钥已生成
- [ ] `docker-compose.yml` 端口配置正确

### 数据库

- [ ] 数据库迁移已执行
- [ ] 所有表已创建(9 个表)
- [ ] 管理员账号已创建
- [ ] 邀请码已生成(如果有组织成员)

### 网络访问

- [ ] 可以通过浏览器访问应用
- [ ] 可以正常登录
- [ ] 可以创建任务
- [ ] 防火墙规则已配置

### 可选配置

- [ ] Nginx 反向代理已配置
- [ ] SSL 证书已安装
- [ ] 自动备份已设置
- [ ] 监控脚本已创建

---

## 🛠️ 常见问题排查

### 问题 1: 容器无法启动

```bash
# 查看错误日志
docker logs calendar-app

# 检查端口占用
netstat -tulpn | grep :3000

# 检查环境变量
docker exec calendar-app env | grep DATABASE
```

### 问题 2: 数据库连接失败

```bash
# 检查数据库容器状态
docker ps | grep postgres

# 测试数据库连接
docker exec -it calendar-postgres psql -U postgres -c "SELECT version();"

# 检查 .env 中的 DATABASE_URL
cat .env | grep DATABASE_URL
```

### 问题 3: 创建任务失败 (creatorId 错误)

```bash
# 同步数据库结构
docker exec calendar-app npx prisma db push --accept-data-loss

# 如果有 NULL 值
docker exec -i calendar-postgres psql -U postgres -d calendar_tasks << 'EOF'
UPDATE "Task"
SET "creatorId" = (SELECT id FROM "User" LIMIT 1)
WHERE "creatorId" IS NULL;
EOF
```

### 问题 4: 邀请码 404 错误

```bash
# 为组织成员生成邀请码
docker exec -i calendar-postgres psql -U postgres -d calendar_tasks << 'EOF'
UPDATE "OrganizationMember"
SET "inviteCode" = LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0')
WHERE "inviteCode" IS NULL;
EOF
```

### 问题 5: 内存不足

```bash
# 查看资源使用
docker stats

# 限制容器内存(编辑 docker-compose.yml)
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

---

## 📞 获取支持

如果遇到无法解决的问题:

1. **查看日志:**

   ```bash
   docker logs -f calendar-app
   docker logs -f calendar-postgres
   ```

2. **检查容器状态:**

   ```bash
   docker ps -a
   docker inspect calendar-app
   ```

3. **重启服务:**

   ```bash
   docker-compose restart
   # 或完全重启
   docker-compose down
   docker-compose up -d
   ```

4. **恢复数据库备份:**
   ```bash
   docker exec -i calendar-postgres psql -U postgres calendar_tasks < backups/backup_20251119_020000.sql
   ```

---

## 🎉 恭喜!

如果所有检查项都完成了,你的应用已经成功部署!

**下一步:**

1. 创建组织和项目
2. 邀请团队成员
3. 开始管理任务

**后续更新:**

1. 本地构建新镜像
2. 导出 tar 文件
3. 上传到服务器
4. 执行 `./update.sh`

---

**文档版本:** v1.0.0  
**创建日期:** 2025-11-19  
**适用版本:** Docker 24.0+, Ubuntu 20.04+
