# 快速部署指南

## 你的场景：使用 docker-compose build

### 最简单的方式 - 使用部署脚本

```bash
# 部署 company 版本
bash scripts/deploy.sh company

# 部署 personal 版本
bash scripts/deploy.sh personal

# 部署 team 版本
bash scripts/deploy.sh team
```

**脚本会自动：**
1. ✅ 检查 `.env.xxx` 文件
2. ✅ 显示配置信息
3. ✅ 执行 `docker-compose build --build-arg ENV_TYPE=xxx`
4. ✅ 启动容器
5. ✅ 验证服务状态

### 手动方式（如果不想用脚本）

```bash
# 方式 1：直接指定参数
docker-compose build --build-arg ENV_TYPE=company
docker-compose up -d

# 方式 2：使用环境变量
export ENV_TYPE=personal
docker-compose build
docker-compose up -d

# 方式 3：一行命令
ENV_TYPE=team docker-compose build && docker-compose up -d
```

## 工作原理

```
你执行: bash scripts/deploy.sh company
  ↓
脚本执行: docker-compose build --build-arg ENV_TYPE=company
  ↓
Docker 读取 Dockerfile 中的 ARG ENV_TYPE=company
  ↓
Dockerfile 执行: COPY .env.company .env
  ↓
构建时使用 .env.company 中的配置
  ↓
NEXT_PUBLIC_* 变量被注入到代码中
  ↓
完成！
```

## 验证部署

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs app

# 访问应用
http://localhost:7049
```

## 常见问题

### Q: 为什么要用 `--build-arg ENV_TYPE=xxx`？

A: 因为 `NEXT_PUBLIC_*` 变量在构建时被注入到代码中，所以必须在构建时指定使用哪个 `.env` 文件。

### Q: 能用 npm scripts 吗？

A: 不能。npm scripts 是本地构建，而你用的是 Docker 构建。Docker 构建时看不到本地的 npm 命令。

### Q: 修改 `.env.xxx` 后需要重新构建吗？

A: 是的。因为 `NEXT_PUBLIC_*` 变量在构建时被注入，修改后必须重新构建镜像。

### Q: 如何快速切换环境？

A: 使用脚本最快：
```bash
bash scripts/deploy.sh company  # 切换到企业版
bash scripts/deploy.sh personal # 切换到个人版
```

## 环境配置文件

- `.env.company` - 企业版
- `.env.personal` - 个人版
- `.env.team` - 团队版

### 添加新环境

```bash
# 1. 创建新配置文件
cp .env.company .env.custom

# 2. 编辑配置
vim .env.custom

# 3. 部署
bash scripts/deploy.sh custom
```

## 总结

| 操作 | 命令 |
|------|------|
| 部署企业版 | `bash scripts/deploy.sh company` |
| 部署个人版 | `bash scripts/deploy.sh personal` |
| 部署团队版 | `bash scripts/deploy.sh team` |
| 手动构建 | `docker-compose build --build-arg ENV_TYPE=company` |
| 启动容器 | `docker-compose up -d` |
| 查看日志 | `docker-compose logs app` |
| 停止容器 | `docker-compose down` |
