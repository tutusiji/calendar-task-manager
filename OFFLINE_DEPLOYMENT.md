# 离线部署指南 (Ubuntu 22.04)

本指南适用于无法连接外网、无 Docker 环境的 Ubuntu 22.04 服务器。

## 1. 准备工作 (在有网机器上操作)

你需要一台可以上网的电脑（Windows/Mac/Linux 均可）来下载所需文件。

### 1.1 下载 Node.js

1. 访问 [Node.js 官网下载页](https://nodejs.org/en/download/prebuilt-binaries)。
2. 选择 **Linux Binaries (x64)**。
3. 下载 `.tar.xz` 文件 (例如 `node-v20.18.0-linux-x64.tar.xz`)。

### 1.2 下载 PostgreSQL (离线安装包)

由于 Ubuntu 离线安装依赖极其复杂，推荐使用 **PostgreSQL 二进制压缩包** 或 **APT 离线包**。

**方案 A：下载 APT 离线包 (推荐，如果在同系统机器上操作)**
如果你有一台联网的 Ubuntu 22.04 机器，可以使用以下命令下载所有依赖：

```bash
# 创建目录
mkdir postgres_debs && cd postgres_debs

# 下载 PostgreSQL 14 及其依赖
apt-get download postgresql-14 postgresql-client-14 postgresql-common postgresql-client-common libpq5 libllvm14
```

_注意：如果服务器是纯净版，可能还需要 `libssl` 等基础库，建议尽可能多下载相关依赖。_

**方案 B：下载 EDB 安装包 (如果能找到)**
EnterpriseDB 已停止提供 Linux 完整安装包。

**方案 C：源码编译 (不推荐，太慢且需要 gcc 环境)**

**建议**：如果实在无法解决依赖问题，请联系运维人员协助安装 PostgreSQL，或者使用内网中已有的数据库。

### 1.3 下载项目代码

1. 在本地项目根目录执行打包（排除 `node_modules`）：
   ```bash
   # Windows
   tar -cvf project.tar --exclude=node_modules --exclude=.git .
   ```

### 1.4 准备文件清单

将以下文件通过 SFTP/U 盘 传输到内网服务器：

1. `node-v20.xx.x-linux-x64.tar.xz`
2. `postgres_debs/` (包含所有 .deb 文件)
3. `project.tar`

---

## 2. 服务器安装 (在内网服务器操作)

假设所有文件上传到了 `/home/user/downloads`。

### 2.1 安装 Node.js

```bash
cd /home/user/downloads

# 解压
tar -xvf node-v20.*-linux-x64.tar.xz

# 移动到通用目录
sudo mv node-v20.*-linux-x64 /usr/local/nodejs

# 创建软链接 (使 node 和 npm 全局可用)
sudo ln -s /usr/local/nodejs/bin/node /usr/bin/node
sudo ln -s /usr/local/nodejs/bin/npm /usr/bin/npm
sudo ln -s /usr/local/nodejs/bin/npx /usr/bin/npx

# 验证
node -v
npm -v
```

### 2.2 安装 PostgreSQL

```bash
cd /home/user/downloads/postgres_debs

# 批量安装 deb 包
sudo dpkg -i *.deb

# 如果报错缺依赖，需要记下缺失的包名，回有网机器下载后再传进来安装。

# 验证安装
sudo systemctl status postgresql
```

**配置数据库：**

```bash
# 切换到 postgres 用户
sudo su - postgres

# 进入数据库命令行
psql

# 创建用户和数据库
CREATE USER myuser WITH PASSWORD 'mypassword';
CREATE DATABASE calendar_db OWNER myuser;
\q

# 退出 postgres 用户
exit
```

### 2.3 部署应用

#### 1. 解压代码

```bash
# 创建项目目录
mkdir -p /var/www/calendar-app
tar -xvf /home/user/downloads/project.tar -C /var/www/calendar-app
cd /var/www/calendar-app
```

#### 2. 配置环境变量

复制并修改环境变量文件：

```bash
cp .env.example .env
nano .env
```

修改数据库连接串：

```env
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/calendar_db?schema=public"
```

#### 3. 安装依赖 (使用内网镜像)

假设内网镜像地址为 `http://npm.internal.com`：

```bash
# 设置镜像源
npm config set registry http://npm.internal.com

# 安装依赖
npm install

# 如果 npm install 失败 (例如缺少 C++ 编译环境导致某些包编译失败)，
# 尝试忽略脚本安装: npm install --ignore-scripts
```

#### 4. 数据库迁移

```bash
npx prisma generate
npx prisma migrate deploy
```

#### 5. 构建项目

```bash
npm run build
```

#### 6. 启动服务

**方式 A：直接启动 (测试用)**

```bash
npm start
# 访问 http://服务器IP:3000
```

**方式 B：使用 PM2 后台运行 (推荐)**

```bash
# 全局安装 PM2
npm install -g pm2
sudo ln -s /usr/local/nodejs/bin/pm2 /usr/bin/pm2

# 启动
pm2 start npm --name "calendar-app" -- start

# 保存当前进程列表，开机自启
pm2 save
pm2 startup
```

## 3. 常见问题

**Q: `npm install` 报错 `node-gyp` 编译失败？**
A: 这是因为服务器缺少 `python3`, `make`, `g++` 等编译工具。

- **解决**：尝试安装纯 JS 版本的依赖，或者在有网机器 `npm install` 后，将整个 `node_modules` 打包上传（注意：系统架构必须一致，且不能跨操作系统，Windows 的 node_modules 无法在 Linux 用）。
- **最佳实践**：在另一台 **相同架构(Ubuntu 22.04)** 的机器上执行 `npm install`，然后打包 `node_modules` 上传。

**Q: 数据库连接失败？**
A: 检查 `pg_hba.conf` 配置，确保允许密码登录。
编辑 `/etc/postgresql/14/main/pg_hba.conf`，将 `local all all peer` 改为 `local all all md5`，然后重启 postgresql 服务。

**Q: 端口 3000 无法访问？**
A: 检查服务器防火墙：

```bash
sudo ufw allow 3000
```
