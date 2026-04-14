# 头像服务配置说明

## 概述

系统支持灵活配置头像服务地址,可以在**有外网**和**无外网**的环境中部署。

---

## 默认配置 (公网部署)

默认使用 [DiceBear API](https://api.dicebear.com) 提供头像服务。

**无需任何配置**,开箱即用。

---

## 内网部署配置

### 1. 准备内网头像服务

在内网部署一个兼容 DiceBear API 的头像服务,例如:
- 地址: `http://10.11.22.33:4567`
- API 路径: `/9.x/avataaars/svg?seed={username}`

### 2. 配置环境变量

#### 方式一: 修改 `.env` 文件

创建 `.env` 文件(或复制 `.env.example`):

```bash
# 其他配置...
POSTGRES_PASSWORD=your_password
JWT_SECRET=your_secret

# 头像服务地址 - 改为内网地址
AVATAR_API_URL=http://10.11.22.33:4567
```

#### 方式二: 直接在 docker-compose 中设置

编辑 `docker-compose.yml`,在 `app` 服务的 `environment` 中添加:

```yaml
services:
  app:
    image: calendar-task-manager:latest
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:-postgres}@postgres:5432/calendar_tasks?schema=public
      NODE_ENV: production
      AVATAR_API_URL: http://10.11.22.33:4567  # 直接写死内网地址
```

#### 方式三: 启动时传入环境变量

```bash
# 启动时传入
AVATAR_API_URL=http://10.11.22.33:4567 docker-compose up -d

# 或者 export 后启动
export AVATAR_API_URL=http://10.11.22.33:4567
docker-compose up -d
```

---

## 部署流程 (内网环境)

### 完整步骤

```bash
# 1. 在有外网的机器上构建镜像
docker build -t calendar-task-manager:latest .
docker save -o calendar-app.tar calendar-task-manager:latest

# 2. 将 tar 文件传输到内网服务器
scp calendar-app.tar user@internal-server:/path/to/deploy/

# 3. 在内网服务器上加载镜像
docker load -i calendar-app.tar

# 4. 创建 .env 文件,配置内网头像服务
cat > .env << EOF
POSTGRES_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret
AVATAR_API_URL=http://10.11.22.33:4567
EOF

# 5. 启动服务
docker-compose up -d

# 6. 检查服务状态
docker-compose ps
docker-compose logs app
```

---

## 验证配置

### 1. 检查环境变量是否生效

```bash
# 进入容器查看
docker exec calendar-app env | grep AVATAR_API_URL

# 应该输出: AVATAR_API_URL=http://10.11.22.33:4567
```

### 2. 测试头像生成

新注册一个用户,检查其头像 URL:

```bash
# 查看数据库中的头像地址
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c \
  "SELECT username, avatar FROM \"User\" LIMIT 5;"
```

应该看到类似:
```
username  | avatar
----------+--------------------------------------------------
testuser  | http://10.11.22.33:4567/9.x/avataaars/svg?seed=testuser
```

---

## 不同环境的配置示例

### 开发环境 (本地)

```env
# .env
AVATAR_API_URL=https://api.dicebear.com
```

### 测试环境 (内网)

```env
# .env
AVATAR_API_URL=http://192.168.1.100:4567
```

### 生产环境 (公网)

```env
# .env
AVATAR_API_URL=https://avatar.yourdomain.com
```

### 生产环境 (内网)

```env
# .env
AVATAR_API_URL=http://10.11.22.33:4567
```

---

## 常见问题

### Q1: 头像服务需要兼容什么 API?

**A:** 需要兼容 DiceBear 的 API 格式:
- 请求: `GET {baseUrl}/9.x/avataaars/svg?seed={username}`
- 响应: SVG 图片

### Q2: 可以使用其他头像服务吗?

**A:** 可以!只要 API 格式兼容即可。你可以:
1. 自己搭建 DiceBear 服务
2. 使用其他兼容的头像生成服务
3. 使用静态头像服务 (需要调整 `lib/config.ts` 中的路径)

### Q3: 已部署的服务如何修改配置?

```bash
# 1. 停止服务
docker-compose down

# 2. 修改 .env 文件
nano .env  # 或 vim .env

# 3. 重新启动
docker-compose up -d

# 4. 验证
docker exec calendar-app env | grep AVATAR_API_URL
```

### Q4: 修改配置后旧用户的头像会更新吗?

**A:** 不会自动更新。旧用户的头像 URL 已存储在数据库中。

如需批量更新,可运行 SQL:

```sql
-- 仅更新使用旧头像服务的用户
UPDATE "User"
SET avatar = REPLACE(
  avatar, 
  'https://api.dicebear.com', 
  'http://10.11.22.33:4567'
)
WHERE avatar LIKE 'https://api.dicebear.com%';
```

---

## 技术实现

配置文件位置: `lib/config.ts`

```typescript
export const config = {
  avatarApiUrl: process.env.AVATAR_API_URL || 'https://api.dicebear.com',
  avatarApiPath: '/9.x/avataaars/svg',
  
  getAvatarUrl(username: string): string {
    return `${this.avatarApiUrl}${this.avatarApiPath}?seed=${username}`
  }
}
```

使用示例:

```typescript
import { config } from '@/lib/config'

// 生成头像 URL
const avatarUrl = config.getAvatarUrl('zhangsan')
// 公网: https://api.dicebear.com/9.x/avataaars/svg?seed=zhangsan
// 内网: http://10.11.22.33:4567/9.x/avataaars/svg?seed=zhangsan
```

---

## 相关文件

- `lib/config.ts` - 配置文件
- `.env.example` - 环境变量示例
- `docker-compose.yml` - Docker 编排配置
- `app/api/auth/register/route.ts` - 注册接口 (使用配置)
