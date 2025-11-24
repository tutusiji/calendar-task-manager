# Docker 环境离线迁移指南

本指南详细说明如何将阿里云服务器上已部署的 Docker 环境（包含 Docker 引擎、镜像、容器数据）打包迁移到内网离线服务器。

## 1. 阿里云服务器操作 (在线环境)

### 1.1 下载 Docker 离线安装包

我们需要下载 Docker 及其依赖的 `.deb` 包，以便在内网服务器安装。

```bash
# 创建目录存放安装包
mkdir -p ~/docker-migration/debs
cd ~/docker-migration/debs

# 下载 Docker 相关包 (适用于 Ubuntu 22.04)
# 注意：如果云服务器也是 Ubuntu 22.04，可以直接用 apt-get download
apt-get download docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 如果缺少依赖 (如 iptables, libseccomp2 等)，也建议一并下载：
# apt-get download iptables libseccomp2
```

### 1.2 导出 Docker 镜像

将当前运行的项目镜像和数据库镜像导出为文件。

```bash
cd ~/docker-migration

# 1. 查看当前镜像列表
docker images

# 2. 导出应用镜像 (假设镜像名为 calendar-app:latest)
docker save -o calendar-app.tar calendar-app:latest

# 3. 导出 PostgreSQL 镜像 (假设使用 postgres:14)
docker save -o postgres.tar postgres:14

# 4. 导出其他依赖镜像 (如有 Redis 等)
# docker save -o redis.tar redis:alpine
```

### 1.3 导出数据库数据

为了保证数据完整性，建议使用 `pg_dump` 从运行中的容器导出数据，而不是直接拷贝 volume 文件。

```bash
# 假设数据库容器名为 calendar-db-1，数据库用户为 myuser，数据库名为 calendar_db
docker exec -t calendar-db-1 pg_dumpall -c -U myuser > dump.sql
```

### 1.4 打包项目配置文件

将运行所需的配置文件打包。

```bash
# 回到项目目录
cd /path/to/your/project

# 打包配置文件
tar -cvf ~/docker-migration/configs.tar docker-compose.yml .env
```

### 1.5 汇总文件

现在 `~/docker-migration` 目录下应该有以下内容，请将整个目录下载到本地，然后上传到内网服务器：

1. `debs/` (包含 docker-ce 等 .deb 文件)
2. `calendar-app.tar` (应用镜像)
3. `postgres.tar` (数据库镜像)
4. `dump.sql` (数据库数据)
5. `configs.tar` (配置文件)

---

## 2. 内网服务器操作 (离线环境)

假设所有文件已上传到 `/home/user/docker-migration`。

### 2.1 安装 Docker

```bash
cd /home/user/docker-migration/debs

# 批量安装 deb 包
sudo dpkg -i *.deb

# 验证安装
sudo systemctl start docker
sudo systemctl enable docker
docker -v
```

### 2.2 导入 Docker 镜像

```bash
cd /home/user/docker-migration

# 导入镜像
docker load -i calendar-app.tar
docker load -i postgres.tar

# 验证镜像
docker images
```

### 2.3 部署容器

```bash
# 创建部署目录
mkdir -p /var/www/calendar-app
cd /var/www/calendar-app

# 解压配置文件
tar -xvf /home/user/docker-migration/configs.tar

# 启动容器
# 注意：确保 .env 中的配置正确，特别是数据库密码等
docker compose up -d

# 查看运行状态
docker compose ps
```

### 2.4 恢复数据库数据

容器启动后，数据库是空的（或者只有初始化结构），需要导入之前备份的数据。

```bash
# 1. 确认数据库容器名称
docker compose ps
# 假设容器名为 calendar-task-manager-db-1

# 2. 拷贝 SQL 文件到容器内 (可选，也可以直接管道导入)
docker cp /home/user/docker-migration/dump.sql calendar-task-manager-db-1:/tmp/dump.sql

# 3. 执行导入
# 注意：如果 dump.sql 包含了创建数据库的语句，可能需要先删除自动创建的空库，或者使用 psql -f 执行
docker exec -i calendar-task-manager-db-1 psql -U myuser -d calendar_db -f /tmp/dump.sql

# 或者使用管道直接导入 (推荐)
cat /home/user/docker-migration/dump.sql | docker exec -i calendar-task-manager-db-1 psql -U myuser -d calendar_db
```

## 3. 验证部署

1. 检查日志：`docker compose logs -f app`
2. 访问应用：`http://内网IP:3000`
3. 登录验证数据是否完整。

## 4. 常见问题

- **权限问题**：如果 `docker load` 提示权限不足，请使用 `sudo` 或将用户加入 docker 组 (`sudo usermod -aG docker $USER`)。
- **架构不一致**：确保云服务器和内网服务器的 CPU 架构一致（通常都是 x86_64/amd64）。如果是 ARM 架构（如鲲鹏服务器），则需要在 ARM 机器上下载对应的 deb 包和镜像。
