# 手动构建并通过 FTP 上传 Docker 镜像部署指南

## 前置条件

- 本地已安装 Docker 与 Docker Compose
- 已配置好 FTP 客户端（如 FileZilla、WinSCP）并拥有服务器的 FTP 账户
- 服务器已安装 Docker 与 Docker Compose，且有足够的磁盘空间
- 项目已完成代码提交，确保 `prisma/migrations` 包含最新的迁移（新增 `color` 与 `progress` 字段）

## 1. 本地构建 Docker 镜像

```bash
# 进入项目根目录
cd d:/CodeLab/calendar-task-manager

# 构建镜像（使用最新的 tag，例如 2025.11.26）
# Dockerfile 已在项目根目录，使用默认上下文
docker build -t calendar-task-manager:2025.11.26 .
```

> **提示**：如果构建过程报错，请先确保 `node_modules` 已通过 `pnpm install` 完成，并且 `prisma generate` 已运行。

## 2. 将镜像导出为 tar 文件

```bash
# 导出镜像到本地文件
docker save -o calendar-task-manager_2025.11.26.tar calendar-task-manager:2025.11.26
```

此文件约几百 MB，后续会通过 FTP 上传到服务器。

## 3. 使用 FTP 客户端上传镜像文件

1. 打开 FTP 客户端，连接到服务器的 FTP 地址（如 `ftp://your-server-ip`）
2. 在服务器上创建目录（如 `/opt/docker-images`）
3. 将 `calendar-task-manager_2025.11.26.tar` 上传到该目录
4. 上传完成后，确认文件大小与本地一致（可在 FTP 客户端查看）

## 4. 在服务器上加载镜像并启动容器

```bash
# 通过 SSH 登录服务器
ssh your-username@your-server-ip

# 切换到存放镜像的目录
cd /opt/docker-images

# 加载镜像
docker load -i calendar-task-manager_2025.11.26.tar

# 查看已加载的镜像
docker images | grep calendar-task-manager
```

## 5. 更新 `docker-compose.yml`（如有需要）

如果想使用新镜像 tag，编辑 `docker-compose.yml` 中的 `image` 字段：

```yaml
services:
  app:
    image: calendar-task-manager:2025.11.26 # <-- 更新为新 tag
    # 其余保持不变
```

保存后，重新启动服务。

## 6. 重新启动容器

```bash
# 在项目根目录（或放置 docker-compose.yml 的目录）
cd /opt/calendar-task-manager   # 假设已克隆项目代码到此目录

# 拉取最新代码（可选）
git pull origin main

# 停止旧容器
docker-compose down

# 启动新容器（使用新镜像）
docker-compose up -d --build
```

> **注意**：`--build` 会重新构建本地的 `Dockerfile`（如果有改动），但主要使用我们刚加载的镜像。

## 7. 数据库迁移（首次或字段变更）

```bash
# 进入容器执行 Prisma 迁移
docker-compose exec app npx prisma migrate deploy
```

这一步会把 `prisma/migrations/20251125165512_add_task_color_and_progress` 中的 SQL 应用到 PostgreSQL 数据库。

## 8. 验证部署

```bash
# 查看容器运行状态
docker-compose ps

# 查看日志，确认没有错误
docker-compose logs -f app

# 通过浏览器访问域名或 IP，确认页面正常渍
curl -I http://your-server-ip:3000
```

如果一切正常，新的任务颜色与进度功能已经可用。

---

### 常见问题

- **镜像上传超时**：可以先压缩 tar（`gzip calendar-task-manager_2025.11.26.tar`），上传后在服务器上 `gunzip` 解压。
- **容器启动失败**：检查 `docker-compose.yml` 中的环境变量 `.env` 是否正确，尤其是 `DATABASE_URL` 与 `POSTGRES_PASSWORD`。
- **数据库迁移报错**：确认 PostgreSQL 容器已启动，且 `prisma migrate deploy` 能连接到 `postgres` 服务。

---

**完成**：按照上述步骤，你即可在本地构建 Docker 镜像、通过 FTP 上传并在服务器上手动加载运行，完成新功能的部署。
