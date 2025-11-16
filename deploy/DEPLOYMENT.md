# 阿里云服务器部署完整指南

## 📋 前置准备

### 1. 服务器信息
- ✅ 阿里云服务器
- ✅ 域名：souxy.com 和 joox.cc
- ✅ SSL 证书（已准备）
- ✅ GitHub 仓库

### 2. 本地准备
- Git
- SSH 客户端

---

## 🚀 首次部署步骤

### 步骤 1: 连接服务器

```bash
# SSH 连接到服务器
ssh root@your-server-ip
# 或
ssh your-username@your-server-ip
```

### 步骤 2: 下载并运行初始化脚本

```bash
# 下载脚本（方式一：如果已有项目）
cd /opt
git clone https://github.com/tutusiji/calendar-task-manager.git
cd calendar-task-manager
chmod +x deploy/setup-server.sh
./deploy/setup-server.sh

# 或（方式二：直接下载脚本）
wget https://raw.githubusercontent.com/tutusiji/calendar-task-manager/main/deploy/setup-server.sh
chmod +x setup-server.sh
./setup-server.sh
```

### 步骤 3: 配置环境变量

```bash
# 编辑 .env 文件
cd /opt/calendar-task-manager
nano .env
```

修改以下内容：
```env
# 设置强密码
POSTGRES_PASSWORD=your_very_secure_password_here

# 数据库连接（密码要与上面一致）
DATABASE_URL="postgresql://postgres:your_very_secure_password_here@postgres:5432/calendar_tasks?schema=public"

# JWT 密钥（已自动生成，也可以自己修改）
JWT_SECRET=your_jwt_secret_here
```

### 步骤 4: 上传 SSL 证书

```bash
# 在服务器上创建证书目录
sudo mkdir -p /etc/nginx/ssl/souxy.com
sudo mkdir -p /etc/nginx/ssl/joox.cc

# 从本地上传证书（在本地电脑执行）
scp /path/to/souxy.com/fullchain.pem root@your-server-ip:/etc/nginx/ssl/souxy.com/
scp /path/to/souxy.com/privkey.pem root@your-server-ip:/etc/nginx/ssl/souxy.com/
scp /path/to/joox.cc/fullchain.pem root@your-server-ip:/etc/nginx/ssl/joox.cc/
scp /path/to/joox.cc/privkey.pem root@your-server-ip:/etc/nginx/ssl/joox.cc/
```

### 步骤 5: 配置域名解析

在阿里云域名控制台添加 A 记录：

```
souxy.com       A    your-server-ip
www.souxy.com   A    your-server-ip
joox.cc         A    your-server-ip
www.joox.cc     A    your-server-ip
```

### 步骤 6: 启动应用

```bash
cd /opt/calendar-task-manager
docker-compose up -d
```

### 步骤 7: 验证部署

```bash
# 检查容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 测试访问
curl http://localhost:3000
curl https://souxy.com
```

---

## 🔄 配置 GitHub Actions 自动部署

### 步骤 1: 生成 SSH 密钥（在服务器上）

```bash
# 生成 SSH 密钥对
ssh-keygen -t rsa -b 4096 -C "github-actions" -f ~/.ssh/github_actions
# 不设置密码，直接回车

# 将公钥添加到 authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys

# 查看私钥（稍后需要添加到 GitHub）
cat ~/.ssh/github_actions
```

### 步骤 2: 在 GitHub 配置 Secrets

访问：`https://github.com/tutusiji/calendar-task-manager/settings/secrets/actions`

添加以下 Secrets：

| Name | Value | 说明 |
|------|-------|------|
| `SERVER_HOST` | `your-server-ip` | 服务器 IP 地址 |
| `SERVER_USER` | `root` 或你的用户名 | SSH 用户名 |
| `SSH_PRIVATE_KEY` | 复制上面的私钥内容 | SSH 私钥 |
| `SERVER_PORT` | `22` | SSH 端口（可选） |

### 步骤 3: 测试自动部署

```bash
# 本地修改代码
git add .
git commit -m "test: trigger deployment"
git push origin main

# 在 GitHub 查看 Actions 执行状态
# https://github.com/tutusiji/calendar-task-manager/actions
```

---

## 📝 日常操作

### 查看应用状态

```bash
cd /opt/calendar-task-manager
docker-compose ps
```

### 查看日志

```bash
# 查看所有日志
docker-compose logs -f

# 只看应用日志
docker-compose logs -f app

# 只看数据库日志
docker-compose logs -f postgres
```

### 手动更新应用

```bash
cd /opt/calendar-task-manager
./deploy/update.sh
```

### 重启应用

```bash
docker-compose restart app
```

### 重启 Nginx

```bash
sudo systemctl restart nginx
```

### 备份数据库

```bash
# 手动备份
docker exec calendar-postgres pg_dump -U postgres calendar_tasks > backup_$(date +%Y%m%d).sql

# 使用脚本备份
./deploy/backup.sh
```

### 恢复数据库

```bash
# 停止应用
docker-compose stop app

# 恢复数据库
docker exec -i calendar-postgres psql -U postgres calendar_tasks < backup_20250116.sql

# 启动应用
docker-compose start app
```

---

## 🔧 常见问题排查

### 问题 1: 容器无法启动

```bash
# 查看详细日志
docker-compose logs

# 检查容器状态
docker ps -a

# 重新构建
docker-compose down
docker-compose up -d --build
```

### 问题 2: 数据库连接失败

```bash
# 进入数据库容器
docker exec -it calendar-postgres psql -U postgres

# 检查数据库
\l
\c calendar_tasks
\dt
```

### 问题 3: Nginx 配置错误

```bash
# 测试配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 重新加载配置
sudo systemctl reload nginx
```

### 问题 4: 端口被占用

```bash
# 查看端口占用
sudo lsof -i :3000
sudo lsof -i :5432

# 修改 docker-compose.yml 中的端口映射
```

### 问题 5: SSL 证书问题

```bash
# 检查证书文件
ls -la /etc/nginx/ssl/souxy.com/
ls -la /etc/nginx/ssl/joox.cc/

# 检查证书有效期
openssl x509 -in /etc/nginx/ssl/souxy.com/fullchain.pem -noout -dates

# 重新加载 Nginx
sudo systemctl reload nginx
```

---

## 🔐 安全建议

1. **更改默认端口**
   ```yaml
   # docker-compose.yml
   ports:
     - "127.0.0.1:3000:3000"  # 只监听本地
   ```

2. **配置防火墙**
   ```bash
   sudo ufw status
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

3. **定期更新系统**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

4. **设置 fail2ban**
   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

5. **禁用 root 登录**
   ```bash
   sudo nano /etc/ssh/sshd_config
   # 修改: PermitRootLogin no
   sudo systemctl restart sshd
   ```

---

## 📊 监控和日志

### 设置日志轮转

```bash
sudo nano /etc/logrotate.d/calendar-app

# 添加以下内容
/var/log/nginx/souxy.com*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1
    endscript
}
```

### 监控容器资源

```bash
# 实时监控
docker stats

# 查看资源使用
docker-compose top
```

---

## 📞 支持

遇到问题？

1. 查看日志：`docker-compose logs -f`
2. 检查 GitHub Issues
3. 查看 Nginx 错误日志：`sudo tail -f /var/log/nginx/error.log`

---

## 🎉 部署完成

访问你的应用：
- https://souxy.com
- https://joox.cc

后续每次推送代码到 GitHub main 分支，将自动触发部署！
