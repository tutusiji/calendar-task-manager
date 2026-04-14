# 多环境部署配置指南

## 概述

本项目已支持**运行时环境变量配置**，同一个 Docker 镜像可以在不同环境下使用不同的头像 API 服务地址。

## 配置方法

### 阿里云环境

在宿主机的 `.env` 文件中配置：

```bash
# 使用公网 DiceBear API
AVATAR_API_URL=https://api.dicebear.com
POSTGRES_PASSWORD=your_secure_password
```

### 内网环境

在宿主机的 `.env` 文件中配置：

```bash
# 使用内网头像服务
AVATAR_API_URL=http://10.9.43.61:4987
POSTGRES_PASSWORD=your_secure_password
```

## 部署步骤

### 1. 构建镜像（仅需一次）

```bash
# 在开发机上构建镜像
docker build -t calendar-task-manager:2025-12-01 .

# 导出镜像
docker save calendar-task-manager:2025-12-01 -o calendar-task-manager_2025-12-01.tar
```

### 2. 部署到阿里云

```bash
# 传输镜像到服务器
scp calendar-task-manager_2025-12-01.tar user@aliyun-server:/path/to/

# 在服务器上加载镜像
docker load -i calendar-task-manager_2025-12-01.tar

# 创建 .env 文件
cat > .env << EOF
AVATAR_API_URL=https://api.dicebear.com
POSTGRES_PASSWORD=your_secure_password
EOF

# 启动服务
docker-compose up -d
```

### 3. 部署到内网

```bash
# 传输镜像到内网服务器
# 方法1: 使用 U 盘或内网文件共享
# 方法2: 使用 scp（如果内网可达）

# 在内网服务器上加载镜像
docker load -i calendar-task-manager_2025-12-01.tar

# 创建 .env 文件
cat > .env << EOF
AVATAR_API_URL=http://10.9.43.61:4987
POSTGRES_PASSWORD=your_secure_password
EOF

# 启动服务
docker-compose up -d
```

## 修改配置

如果需要修改头像 API 地址：

```bash
# 1. 编辑 .env 文件
vim .env

# 2. 修改 AVATAR_API_URL 的值

# 3. 重启应用容器
docker-compose restart app
```

**无需重新构建镜像！**

## 验证配置

### 方法 1: 检查环境变量

```bash
# 进入容器
docker exec -it calendar-app sh

# 查看环境变量
echo $AVATAR_API_URL
```

### 方法 2: 测试 API 端点

```bash
# 访问配置 API
curl http://localhost:7049/api/config

# 应该返回类似：
# {"avatarApiUrl":"http://10.9.43.61:4987"}
```

### 方法 3: 测试魔法棒功能

1. 登录系统
2. 打开个人信息编辑对话框
3. 点击"魔法棒"按钮
4. 打开浏览器开发者工具 Network 面板
5. 查看生成的头像 URL 是否使用了正确的 API 地址

## 技术说明

### 工作原理

1. **服务端配置 API**：`/api/config` 端点从环境变量读取 `AVATAR_API_URL`
2. **客户端动态获取**：魔法棒功能调用 `/api/config` 获取当前环境的 API 地址
3. **降级策略**：如果 API 调用失败，自动降级使用默认公网地址

### 相关文件

- **API 端点**：[app/api/config/route.ts](file:///d:/CodeLab/calendar-task-manager/app/api/config/route.ts)
- **客户端组件**：[components/edit-profile-dialog.tsx](file:///d:/CodeLab/calendar-task-manager/components/edit-profile-dialog.tsx)
- **Docker 配置**：[docker-compose.yml](file:///d:/CodeLab/calendar-task-manager/docker-compose.yml)

## 常见问题

### Q: 修改 .env 后没有生效？

A: 确保执行了 `docker-compose restart app`，而不是只修改文件。

### Q: 可以在不同环境使用不同的镜像版本吗？

A: 可以，但不推荐。使用同一个镜像版本可以确保代码一致性，只需修改环境变量即可。

### Q: 如何回滚到之前的配置？

A: 修改 `.env` 文件中的 `AVATAR_API_URL` 值，然后重启容器即可。
