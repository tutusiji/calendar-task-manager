# 多环境部署指南

## 概述

本项目支持多环境部署，可以快速切换不同的站点配置（企业版、个人版、团队版等）。

## 环境配置文件

### 已有的环境配置

- `.env.company` - 企业版配置
- `.env.personal` - 个人版配置
- `.env.team` - 团队版配置

### 添加新环境

1. 复制现有的 `.env.xxx` 文件
2. 修改其中的 `NEXT_PUBLIC_*` 变量
3. 使用新的环境名称部署

```bash
# 创建新环境
cp .env.company .env.custom

# 编辑配置
vim .env.custom

# 部署
bash scripts/deploy.sh custom
```

## 部署方式

### 方式 1：使用部署脚本（推荐）✅

最简单的方式，一条命令完成构建和部署。

```bash
# 部署 company 版本
bash scripts/deploy.sh company

# 部署 personal 版本
bash scripts/deploy.sh personal

# 部署 team 版本
bash scripts/deploy.sh team
```

**脚本会自动：**
1. 检查 `.env.xxx` 文件是否存在
2. 显示配置信息
3. 构建 Docker 镜像
4. 启动容器
5. 验证服务状态

### 方式 2：手动构建

如果不想使用脚本，可以手动执行：

```bash
# 1. 复制配置文件
cp .env.company .env

# 2. 构建镜像
docker-compose build

# 3. 启动容器
docker-compose up -d
```

### 方式 3：Docker 构建参数

直接在构建时指定环境：

```bash
# 构建 company 版本
docker-compose build --build-arg ENV_TYPE=company

# 构建 personal 版本
docker-compose build --build-arg ENV_TYPE=personal

# 启动
docker-compose up -d
```

## 配置文件结构

每个 `.env.xxx` 文件包含：

```env
# 站点配置（NEXT_PUBLIC_* 前缀，在构建时注入）
NEXT_PUBLIC_APP_NAME=应用名称
NEXT_PUBLIC_APP_SUBTITLE=应用副标题
NEXT_PUBLIC_APP_SLOGAN=应用标语
NEXT_PUBLIC_PAGE_TITLE=页面标题

# 运行时配置（在容器启动时读取）
DATABASE_URL=postgresql://...
JWT_SECRET=...
NODE_ENV=production
AVATAR_API_URL=https://api.dicebear.com
```

## 环境变量说明

### 站点配置（NEXT_PUBLIC_*）

这些变量在构建时被注入到代码中，修改后需要重新构建镜像。

| 变量 | 说明 | 示例 |
|------|------|------|
| `NEXT_PUBLIC_APP_NAME` | 应用名称 | OxHorse Planner |
| `NEXT_PUBLIC_APP_SUBTITLE` | 应用副标题 | 牛马日记 |
| `NEXT_PUBLIC_APP_SLOGAN` | 应用标语 | 打工人必备的轻量任务管理工具 |
| `NEXT_PUBLIC_PAGE_TITLE` | 页面标题 | OxHorse Planner - 牛马日记 |

### 运行时配置

这些变量在容器启动时读取，修改后只需重启容器。

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `JWT_SECRET` | JWT 签名密钥 |
| `NODE_ENV` | 运行环境（production/development） |
| `AVATAR_API_URL` | 头像服务 API 地址 |

## 实际部署示例

### 场景 1：部署企业版

```bash
# 一条命令完成
bash scripts/deploy.sh company

# 或手动方式
cp .env.company .env
docker-compose build
docker-compose up -d
```

### 场景 2：部署个人版

```bash
bash scripts/deploy.sh personal
```

### 场景 3：部署团队版

```bash
bash scripts/deploy.sh team
```

### 场景 4：创建自定义版本

```bash
# 1. 创建新配置文件
cat > .env.custom << EOF
NEXT_PUBLIC_APP_NAME=我的应用
NEXT_PUBLIC_APP_SUBTITLE=自定义版
NEXT_PUBLIC_APP_SLOGAN=自定义标语
NEXT_PUBLIC_PAGE_TITLE=我的应用 - 自定义版
DATABASE_URL=postgresql://...
JWT_SECRET=...
NODE_ENV=production
AVATAR_API_URL=https://api.dicebear.com
EOF

# 2. 部署
bash scripts/deploy.sh custom
```

## 验证部署

### 检查服务状态

```bash
# 查看容器状态
docker-compose ps

# 查看应用日志
docker-compose logs app

# 查看实时日志
docker-compose logs -f app
```

### 访问应用

```
http://localhost:7049
```

### 验证配置是否生效

1. 打开浏览器访问应用
2. 查看页面标题（浏览器标签页）
3. 查看 Logo 旁边的应用名称
4. 查看 Logo 下方的应用标语
5. 查看登录页的完整标题

## 常见问题

### Q: 修改 `.env` 后需要重新构建吗？

**A:** 取决于修改的变量类型：

- **NEXT_PUBLIC_* 变量**：需要重新构建镜像
- **其他变量**（DATABASE_URL 等）：只需重启容器

### Q: 如何快速切换环境？

**A:** 使用部署脚本：

```bash
bash scripts/deploy.sh company  # 切换到企业版
bash scripts/deploy.sh personal # 切换到个人版
```

### Q: 构建失败怎么办？

**A:** 检查以下几点：

1. `.env.xxx` 文件是否存在
   ```bash
   ls -la .env.*
   ```

2. 查看构建日志
   ```bash
   docker-compose build --no-cache
   ```

3. 检查 Docker 是否正常运行
   ```bash
   docker ps
   ```

### Q: 如何回滚到之前的版本？

**A:** 保留之前的镜像，然后重新启动：

```bash
# 查看镜像列表
docker images | grep calendar

# 使用特定镜像启动
docker-compose up -d
```

## 最佳实践

1. **版本管理**：为每个环境的镜像添加标签
   ```bash
   docker tag calendar-task-manager:latest calendar-task-manager:company-v1.0
   docker tag calendar-task-manager:latest calendar-task-manager:personal-v1.0
   ```

2. **配置备份**：定期备份 `.env.xxx` 文件
   ```bash
   tar -czf env-backup-$(date +%Y%m%d).tar.gz .env.*
   ```

3. **测试部署**：在生产环境前在测试环境验证
   ```bash
   # 测试环境
   bash scripts/deploy.sh company
   
   # 验证后再部署到生产
   ```

4. **监控日志**：部署后监控应用日志
   ```bash
   docker-compose logs -f app
   ```

## 脚本说明

### deploy.sh

自动化部署脚本，支持以下功能：

- ✅ 检查配置文件是否存在
- ✅ 显示配置信息
- ✅ 构建 Docker 镜像
- ✅ 启动容器
- ✅ 验证服务状态
- ✅ 彩色输出

**使用方式：**
```bash
bash scripts/deploy.sh [company|personal|team|custom]
```

## 相关文件

- `Dockerfile` - Docker 构建配置
- `docker-compose.yml` - Docker Compose 配置
- `.env.company` - 企业版配置
- `.env.personal` - 个人版配置
- `.env.team` - 团队版配置
- `scripts/deploy.sh` - 部署脚本

## 下一步

1. 根据需要创建更多环境配置
2. 在 CI/CD 流程中集成部署脚本
3. 设置自动化部署流程
