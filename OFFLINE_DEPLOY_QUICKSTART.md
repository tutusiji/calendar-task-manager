# 🚀 离线部署快速指南

## 📋 今天要做的事（制作部署包）

### 一键打包（推荐）

```powershell
# 在项目根目录执行
.\build-offline-deploy.ps1
```

这个脚本会自动完成：
- ✅ 构建应用镜像
- ✅ 拉取 PostgreSQL 镜像  
- ✅ 导出所有镜像为 tar 文件
- ✅ 复制配置文件和部署脚本
- ✅ 可选压缩成 ZIP 文件

**预计耗时**: 10-15 分钟（取决于网络和磁盘速度）  
**生成文件**: `offline-deploy/` 文件夹 或 `calendar-offline-deploy.zip`（约 2.5GB）

---

## 📦 明天要做的事（公司内网部署）

### 方式 1: Linux 服务器（推荐）

```bash
# 1. 上传部署包到服务器
# 通过 U 盘或内网文件服务器

# 2. 解压（如果压缩了）
unzip calendar-offline-deploy.zip
cd offline-deploy

# 3. 一键部署
chmod +x scripts/*.sh
./scripts/deploy-all.sh

# 部署完成后访问
# http://服务器IP:8100
```

### 方式 2: Windows 服务器

```batch
REM 1. 复制 offline-deploy 文件夹到服务器

REM 2. 加载镜像
cd offline-deploy
scripts\1-load-images.bat

REM 3. 编辑配置
REM 打开 config\.env 文件，设置数据库密码

REM 4. 启动应用
scripts\2-start-app.bat

REM 访问 http://localhost:8100
```

---

## 📁 部署包结构

```
offline-deploy/
├── images/
│   ├── calendar-app.tar       # 应用镜像 (~2GB)
│   └── postgres.tar            # 数据库镜像 (~90MB)
├── config/
│   ├── docker-compose.yml      # 容器编排配置
│   ├── database-full-update.sql # 数据库初始化脚本
│   └── .env.example            # 环境变量模板
├── scripts/
│   ├── deploy-all.sh           # Linux 一键部署
│   ├── 1-load-images.sh        # Linux 加载镜像
│   ├── 2-init-database.sh      # Linux 初始化数据库
│   ├── 3-start-app.sh          # Linux 启动应用
│   ├── 1-load-images.bat       # Windows 加载镜像
│   └── 2-start-app.bat         # Windows 启动应用
└── README.md                   # 详细部署文档
```

---

## ⚠️ 内网服务器要求

必须满足：
- ✅ 已安装 Docker Engine (20.10+)
- ✅ 已安装 Docker Compose (2.0+)
- ✅ 至少 10GB 可用磁盘空间
- ✅ 端口 8100、5432、5555 未被占用

检查命令：
```bash
docker --version          # 检查 Docker
docker-compose --version  # 检查 Docker Compose
df -h                     # 检查磁盘空间
netstat -tlnp | grep -E '8100|5432|5555'  # 检查端口
```

---

## 🔧 常见问题

### Q: 镜像加载失败？
```bash
# 检查 tar 文件是否完整
ls -lh images/*.tar

# 重新加载
docker load -i images/calendar-app.tar
```

### Q: 数据库连接失败？
```bash
# 检查数据库容器
docker ps | grep postgres

# 测试连接
docker exec -it calendar-postgres pg_isready -U postgres
```

### Q: 端口被占用？
```bash
# 查看占用情况
netstat -tlnp | grep 8100

# 修改 docker-compose.yml 中的端口映射
# 将 "8100:3000" 改为 "8888:3000"
```

---

## 📞 快速命令参考

```bash
# 查看容器状态
docker ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 备份数据库
docker exec calendar-postgres pg_dump -U postgres calendar_tasks > backup.sql

# 进入容器
docker exec -it calendar-app sh
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks
```

---

## ✅ 部署验证清单

部署完成后，请检查：
- [ ] 3 个容器都在运行 (`docker ps`)
- [ ] 应用可以访问 (http://IP:8100)
- [ ] 可以登录注册
- [ ] 数据库字段完整 (`\d "User"`)
- [ ] 通知类型完整 (14个枚举值)

---

**制作日期**: 2025年11月20日  
**应用版本**: calendar-task-manager:latest  
**数据库版本**: PostgreSQL 16 Alpine  
**完整文档**: README.md
