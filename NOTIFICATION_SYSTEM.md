# 站内消息通知系统文档

## 📋 目录
- [系统概述](#系统概述)
- [数据库设计](#数据库设计)
- [消息类型](#消息类型)
- [API 接口](#api-接口)
- [使用示例](#使用示例)
- [前端组件](#前端组件)
- [性能优化](#性能优化)

---

## 系统概述

站内消息通知系统是一个基于 PostgreSQL 关系型数据库的实时通知解决方案,用于向用户推送各类系统事件和活动通知。

### 核心特性

- ✅ **关系型存储**: 基于 PostgreSQL 数据库,数据可靠性高
- ✅ **JSON 元数据**: 灵活存储额外信息,无需修改表结构
- ✅ **已读追踪**: 记录消息已读状态和阅读时间
- ✅ **索引优化**: 高效查询未读消息和时间范围消息
- ✅ **级联删除**: 用户删除时自动清理相关通知
- ✅ **类型安全**: 使用 TypeScript 枚举定义消息类型

### 技术栈

- **数据库**: PostgreSQL
- **ORM**: Prisma
- **后端**: Next.js API Routes
- **前端**: React + TypeScript
- **UI**: Shadcn/ui

---

## 数据库设计

### Notification 表结构

```prisma
model Notification {
  id        String           @id @default(cuid())
  userId    String           // 接收消息的用户ID
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType // 消息类型(枚举)
  title     String           // 消息标题
  content   String           // 消息内容(纯文本)
  metadata  Json?            // 消息元数据(JSON格式,存储额外信息)
  isRead    Boolean          @default(false) // 是否已读
  createdAt DateTime         @default(now()) // 创建时间
  readAt    DateTime?        // 阅读时间(可选)

  @@index([userId, isRead])  // 复合索引:用户ID + 已读状态
  @@index([createdAt])       // 时间索引:按创建时间排序
}
```

### 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | String | ✅ | 消息唯一标识(CUID) |
| `userId` | String | ✅ | 接收者用户ID(外键) |
| `type` | NotificationType | ✅ | 消息类型枚举 |
| `title` | String | ✅ | 消息标题(简短描述) |
| `content` | String | ✅ | 消息正文(详细内容) |
| `metadata` | Json | ❌ | 额外数据(JSON对象) |
| `isRead` | Boolean | ✅ | 已读标志(默认false) |
| `createdAt` | DateTime | ✅ | 创建时间戳 |
| `readAt` | DateTime | ❌ | 阅读时间戳 |

### 索引设计

```sql
-- 复合索引:快速查询用户的未读消息
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- 时间索引:按时间排序和筛选
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");
```

**索引用途:**
- `userId + isRead`: 高效查询某用户的未读消息列表
- `createdAt`: 支持时间范围查询(如最近30天的消息)

---

## 消息类型

### NotificationType 枚举

```prisma
enum NotificationType {
  ORG_JOIN_REQUEST       // 组织加入申请
  ORG_JOIN_APPROVED      // 组织加入申请通过
  ORG_JOIN_REJECTED      // 组织加入申请被拒绝
  USER_INVITED_JOINED    // 你邀请的用户已加入组织
  TASK_CREATED           // 任务被创建
  TASK_UPDATED           // 任务被修改
  TASK_DELETED           // 任务被删除
  TASK_ASSIGNED          // 任务被分配给你
}
```

### 消息类型详解

#### 1. ORG_JOIN_REQUEST - 组织加入申请

**触发时机**: 用户申请加入组织(无邀请码)

**接收者**: 组织创建人

**示例数据**:
```json
{
  "type": "ORG_JOIN_REQUEST",
  "title": "新的加入申请",
  "content": "张三 申请加入您的组织",
  "metadata": {
    "requestId": "cmi...",
    "applicantId": "cmi...",
    "applicantName": "张三",
    "organizationId": "cmi..."
  }
}
```

#### 2. ORG_JOIN_APPROVED - 申请通过

**触发时机**: 组织管理员批准加入申请

**接收者**: 申请人

**示例数据**:
```json
{
  "type": "ORG_JOIN_APPROVED",
  "title": "加入申请已通过",
  "content": "您的加入申请已被批准,现在您可以访问 牛马科技有限公司 的资源了",
  "metadata": {
    "organizationId": "cmi...",
    "organizationName": "牛马科技有限公司",
    "approverId": "cmi..."
  }
}
```

#### 3. ORG_JOIN_REJECTED - 申请被拒

**触发时机**: 组织管理员拒绝加入申请

**接收者**: 申请人

**示例数据**:
```json
{
  "type": "ORG_JOIN_REJECTED",
  "title": "加入申请被拒绝",
  "content": "抱歉,您的加入申请未被批准",
  "metadata": {
    "organizationId": "cmi...",
    "organizationName": "牛马科技有限公司",
    "rejecterId": "cmi..."
  }
}
```

#### 4. USER_INVITED_JOINED - 邀请的用户加入

**触发时机**: 有人通过你的邀请码成功注册并加入组织

**接收者**: 邀请人

**示例数据**:
```json
{
  "type": "USER_INVITED_JOINED",
  "title": "新成员加入",
  "content": "许昕 通过您的邀请码 59A9DAC7 加入了组织",
  "metadata": {
    "newUserId": "cmi...",
    "newUserName": "许昕",
    "organizationId": "cmi...",
    "inviteCode": "59A9DAC7"
  }
}
```

#### 5. TASK_CREATED - 任务创建

**触发时机**: 在你所属的项目/团队中创建了新任务

**接收者**: 项目/团队成员

**示例数据**:
```json
{
  "type": "TASK_CREATED",
  "title": "新任务创建",
  "content": "李四 在 产品设计 项目中创建了任务: 完成UI设计稿",
  "metadata": {
    "taskId": "cmi...",
    "taskTitle": "完成UI设计稿",
    "creatorId": "cmi...",
    "creatorName": "李四",
    "projectId": "cmi...",
    "projectName": "产品设计"
  }
}
```

#### 6. TASK_UPDATED - 任务更新

**触发时机**: 你参与的任务被修改

**接收者**: 任务负责人

**示例数据**:
```json
{
  "type": "TASK_UPDATED",
  "title": "任务已更新",
  "content": "王五 更新了任务: 完成UI设计稿",
  "metadata": {
    "taskId": "cmi...",
    "taskTitle": "完成UI设计稿",
    "updaterId": "cmi...",
    "updaterName": "王五"
  }
}
```

#### 7. TASK_DELETED - 任务删除

**触发时机**: 你参与的任务被删除

**接收者**: 任务负责人

**示例数据**:
```json
{
  "type": "TASK_DELETED",
  "title": "任务已删除",
  "content": "赵六 删除了任务: 完成UI设计稿",
  "metadata": {
    "taskTitle": "完成UI设计稿",
    "deleterId": "cmi...",
    "deleterName": "赵六"
  }
}
```

#### 8. TASK_ASSIGNED - 任务分配

**触发时机**: 有任务被分配给你

**接收者**: 新增的任务负责人

**示例数据**:
```json
{
  "type": "TASK_ASSIGNED",
  "title": "新任务分配",
  "content": "孙七 将任务 前端开发 分配给了你",
  "metadata": {
    "taskId": "cmi...",
    "taskTitle": "前端开发",
    "assignerId": "cmi...",
    "assignerName": "孙七"
  }
}
```

---

## API 接口

### 1. 获取消息列表

**接口**: `GET /api/notifications`

**认证**: 需要 Bearer Token

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `unreadOnly` | boolean | ❌ | 是否只返回未读消息(默认false) |

**请求示例**:
```bash
GET /api/notifications?unreadOnly=true
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cmi0qm05m0001u7sclkotnbqz",
      "userId": "cmi0qm05m0001u7sclkotnbqz",
      "type": "USER_INVITED_JOINED",
      "title": "新成员加入",
      "content": "许昕 通过您的邀请码 59A9DAC7 加入了组织",
      "metadata": {
        "newUserId": "cmi1d19yy0000u7psuj36ljh3",
        "newUserName": "许昕",
        "organizationId": "cmi0qm05m0000u7scaal4krbg",
        "inviteCode": "59A9DAC7"
      },
      "isRead": false,
      "createdAt": "2025-11-19T03:15:23.456Z",
      "readAt": null
    }
  ]
}
```

**查询逻辑**:
- 只返回 **最近 30 天** 的消息
- 最多返回 **100 条** 消息
- 按 **创建时间倒序** 排列(最新的在前)
- 支持筛选未读消息

**代码实现**:
```typescript
// GET /api/notifications
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (auth.error) return auth.error

  const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "true"
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const notifications = await prisma.notification.findMany({
    where: {
      userId: auth.userId,
      createdAt: { gte: thirtyDaysAgo },
      ...(unreadOnly && { isRead: false })
    },
    orderBy: { createdAt: "desc" },
    take: 100
  })

  return successResponse(notifications)
}
```

---

### 2. 获取未读消息数量

**接口**: `GET /api/notifications/unread-count`

**认证**: 需要 Bearer Token

**请求示例**:
```bash
GET /api/notifications/unread-count
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "count": 4
  }
}
```

**代码实现**:
```typescript
// GET /api/notifications/unread-count
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (auth.error) return auth.error

  const count = await prisma.notification.count({
    where: {
      userId: auth.userId,
      isRead: false
    }
  })

  return successResponse({ count })
}
```

---

### 3. 标记消息为已读

**接口**: `PATCH /api/notifications/[id]/read`

**认证**: 需要 Bearer Token

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 消息ID |

**请求示例**:
```bash
PATCH /api/notifications/cmi0qm05m0001u7sclkotnbqz/read
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "cmi0qm05m0001u7sclkotnbqz",
    "isRead": true,
    "readAt": "2025-11-19T03:20:15.789Z"
  },
  "message": "消息已标记为已读"
}
```

**代码实现**:
```typescript
// PATCH /api/notifications/[id]/read
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req)
  if (auth.error) return auth.error

  const { id } = await context.params

  // 验证消息所属权
  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { userId: true }
  })

  if (!notification) {
    return errorResponse("消息不存在", 404)
  }

  if (notification.userId !== auth.userId) {
    return errorResponse("无权操作此消息", 403)
  }

  // 更新已读状态
  const updated = await prisma.notification.update({
    where: { id },
    data: {
      isRead: true,
      readAt: new Date()
    }
  })

  return successResponse(updated, "消息已标记为已读")
}
```

---

## 使用示例

### 创建通知的场景

#### 场景 1: 用户通过邀请码注册并加入组织

```typescript
// app/api/auth/register/route.ts
await tx.notification.create({
  data: {
    userId: inviterId,  // 邀请人ID
    type: 'USER_INVITED_JOINED',
    title: '新成员加入',
    content: `${newUser.name} 通过您的邀请码 ${inviteCode} 加入了组织`,
    metadata: {
      newUserId: newUser.id,
      newUserName: newUser.name,
      organizationId: organizationId,
      inviteCode: inviteCode
    }
  }
})
```

#### 场景 2: 用户申请加入组织(无邀请码)

```typescript
// app/api/auth/register/route.ts
await tx.notification.create({
  data: {
    userId: org.creatorId,  // 组织创建人ID
    type: 'ORG_JOIN_REQUEST',
    title: '新的加入申请',
    content: `${newUser.name} 申请加入您的组织`,
    metadata: {
      requestId: joinRequest.id,
      applicantId: newUser.id,
      applicantName: newUser.name,
      organizationId: organizationId
    }
  }
})
```

#### 场景 3: 批准加入申请

```typescript
// app/api/organizations/join-requests/[id]/approve/route.ts
await tx.notification.create({
  data: {
    userId: request.applicantId,  // 申请人ID
    type: 'ORG_JOIN_APPROVED',
    title: '加入申请已通过',
    content: `您的加入申请已被批准,现在您可以访问 ${org.name} 的资源了`,
    metadata: {
      organizationId: org.id,
      organizationName: org.name,
      approverId: auth.userId
    }
  }
})
```

#### 场景 4: 创建任务并通知成员

```typescript
// app/api/tasks/route.ts
const projectMembers = await prisma.projectMember.findMany({
  where: { projectId: task.projectId },
  include: { user: { select: { id: true, name: true } } }
})

// 批量创建通知
await prisma.notification.createMany({
  data: projectMembers
    .filter(member => member.userId !== task.creatorId)
    .map(member => ({
      userId: member.userId,
      type: 'TASK_CREATED',
      title: '新任务创建',
      content: `${creator.name} 在 ${project.name} 项目中创建了任务: ${task.title}`,
      metadata: {
        taskId: task.id,
        taskTitle: task.title,
        creatorId: task.creatorId,
        creatorName: creator.name,
        projectId: project.id,
        projectName: project.name
      }
    }))
})
```

#### 场景 5: 删除任务并通知负责人

```typescript
// app/api/tasks/[id]/route.ts
await prisma.notification.createMany({
  data: assignees.map(assignee => ({
    userId: assignee.userId,
    type: 'TASK_DELETED',
    title: '任务已删除',
    content: `${currentUser.name} 删除了任务: ${task.title}`,
    metadata: {
      taskTitle: task.title,
      deleterId: userId,
      deleterName: currentUser.name
    }
  }))
})
```

---

## 前端组件

### 1. 通知铃铛图标 (NotificationBell)

**位置**: `components/notification-bell.tsx`

**功能**:
- 显示未读消息数量徽章
- 点击打开通知列表
- 实时更新未读数量

**使用示例**:
```tsx
import { NotificationBell } from '@/components/notification-bell'

export function Header() {
  return (
    <header>
      <NotificationBell />
    </header>
  )
}
```

### 2. 通知列表 (NotificationList)

**位置**: `components/notification-list.tsx`

**功能**:
- 显示最近通知列表
- 标记已读/未读
- 按类型渲染不同图标
- 相对时间显示(如"5分钟前")

**通知类型图标映射**:
```typescript
const iconMap = {
  ORG_JOIN_REQUEST: Users,       // 用户图标
  ORG_JOIN_APPROVED: CheckCircle, // 对勾
  ORG_JOIN_REJECTED: XCircle,     // 叉号
  USER_INVITED_JOINED: UserPlus,  // 添加用户
  TASK_CREATED: Plus,             // 加号
  TASK_UPDATED: Edit,             // 编辑
  TASK_DELETED: Trash,            // 删除
  TASK_ASSIGNED: Tag              // 标签
}
```

### 3. 单条通知项 (NotificationItem)

**位置**: `components/notification-item.tsx`

**功能**:
- 显示通知标题和内容
- 高亮未读消息
- 点击标记为已读
- 相对时间格式化

---

## 性能优化

### 1. 数据库层面

#### 索引优化
```sql
-- 高效查询未读消息
CREATE INDEX "Notification_userId_isRead_idx" 
ON "Notification"("userId", "isRead");

-- 时间范围查询
CREATE INDEX "Notification_createdAt_idx" 
ON "Notification"("createdAt");
```

#### 查询限制
- 只查询最近 **30 天**的消息(减少扫描行数)
- 最多返回 **100 条**消息(避免大量数据传输)
- 使用 `take` 和 `where` 子句限制结果集

```typescript
const notifications = await prisma.notification.findMany({
  where: {
    userId: auth.userId,
    createdAt: { gte: thirtyDaysAgo }  // 30天内
  },
  orderBy: { createdAt: "desc" },
  take: 100  // 最多100条
})
```

### 2. API 层面

#### 分页查询(可选扩展)
```typescript
const page = parseInt(searchParams.get("page") || "1")
const pageSize = 20

const notifications = await prisma.notification.findMany({
  where: { userId: auth.userId },
  orderBy: { createdAt: "desc" },
  skip: (page - 1) * pageSize,
  take: pageSize
})
```

#### 批量操作
```typescript
// 批量创建通知(减少数据库往返)
await prisma.notification.createMany({
  data: [
    { userId: 'user1', type: 'TASK_CREATED', ... },
    { userId: 'user2', type: 'TASK_CREATED', ... },
    { userId: 'user3', type: 'TASK_CREATED', ... }
  ]
})
```

### 3. 前端层面

#### 轮询间隔
```typescript
// 每30秒查询一次未读数量
useEffect(() => {
  const interval = setInterval(fetchUnreadCount, 30000)
  return () => clearInterval(interval)
}, [])
```

#### 虚拟滚动(大量消息时)
```typescript
// 使用 react-window 渲染大列表
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={notifications.length}
  itemSize={80}
>
  {NotificationRow}
</FixedSizeList>
```

### 4. 缓存策略(可选扩展)

#### Redis 缓存未读数量
```typescript
// 缓存未读数量(5分钟过期)
const cacheKey = `unread_count:${userId}`
const cached = await redis.get(cacheKey)

if (cached) {
  return parseInt(cached)
}

const count = await prisma.notification.count({
  where: { userId, isRead: false }
})

await redis.setex(cacheKey, 300, count.toString())
return count
```

---

## 数据清理策略

### 自动归档历史消息

#### 方案 1: 定时任务删除旧消息
```typescript
// scripts/cleanup-old-notifications.ts
import { prisma } from '../lib/prisma'

async function cleanupOldNotifications() {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const result = await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: sixMonthsAgo },
      isRead: true  // 只删除已读消息
    }
  })

  console.log(`已删除 ${result.count} 条历史消息`)
}

cleanupOldNotifications()
```

#### 方案 2: 归档到历史表
```prisma
// 创建归档表
model NotificationArchive {
  id        String   @id
  userId    String
  type      NotificationType
  title     String
  content   String
  metadata  Json?
  isRead    Boolean
  createdAt DateTime
  readAt    DateTime?
  archivedAt DateTime @default(now())

  @@index([userId])
}
```

---

## 实时推送(可选扩展)

### WebSocket 集成

```typescript
// lib/websocket.ts
import { Server } from 'socket.io'

export function initWebSocket(server: any) {
  const io = new Server(server)

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId

    // 加入用户专属房间
    socket.join(`user:${userId}`)

    // 监听新通知
    socket.on('disconnect', () => {
      socket.leave(`user:${userId}`)
    })
  })

  return io
}

// 发送实时通知
export function sendRealtimeNotification(io: Server, userId: string, notification: any) {
  io.to(`user:${userId}`).emit('notification', notification)
}
```

### 客户端连接
```typescript
// hooks/use-notifications.ts
import { useEffect } from 'react'
import io from 'socket.io-client'

export function useRealtimeNotifications(userId: string) {
  useEffect(() => {
    const socket = io('http://localhost:3000', {
      auth: { userId }
    })

    socket.on('notification', (notification) => {
      // 显示通知
      toast({
        title: notification.title,
        description: notification.content
      })

      // 更新未读数量
      refreshUnreadCount()
    })

    return () => {
      socket.disconnect()
    }
  }, [userId])
}
```

---

## 最佳实践

### 1. 通知内容规范

✅ **推荐**:
```typescript
{
  title: "新成员加入",  // 简短明确
  content: "许昕 通过您的邀请码 59A9DAC7 加入了组织",  // 完整信息
  metadata: {  // 结构化数据
    newUserId: "cmi...",
    inviteCode: "59A9DAC7"
  }
}
```

❌ **不推荐**:
```typescript
{
  title: "通知",  // 过于笼统
  content: "有新消息",  // 信息不足
  metadata: null  // 缺少上下文
}
```

### 2. metadata 设计原则

- 存储 **必要的上下文信息**(如 ID、名称)
- 避免存储 **大量嵌套对象**
- 保持 **扁平结构**,易于查询
- 包含 **可追溯信息**(如操作人ID)

### 3. 错误处理

```typescript
try {
  await prisma.notification.create({ data: {...} })
} catch (error) {
  // 通知创建失败不应阻塞主流程
  console.error('创建通知失败:', error)
  // 记录到错误日志,但不抛出异常
}
```

### 4. 批量通知优化

```typescript
// ❌ 不推荐: 循环创建
for (const user of users) {
  await prisma.notification.create({
    data: { userId: user.id, ... }
  })
}

// ✅ 推荐: 批量创建
await prisma.notification.createMany({
  data: users.map(user => ({
    userId: user.id,
    ...
  }))
})
```

---

## 安全考虑

### 1. 权限验证

```typescript
// 标记消息为已读前,验证所属权
const notification = await prisma.notification.findUnique({
  where: { id },
  select: { userId: true }
})

if (notification.userId !== auth.userId) {
  return errorResponse("无权操作此消息", 403)
}
```

### 2. 敏感信息过滤

```typescript
// 不要在 metadata 中存储敏感信息
const notification = {
  metadata: {
    userId: user.id,
    userName: user.name,
    // ❌ 不要存储: password, token, apiKey
  }
}
```

### 3. XSS 防护

前端渲染时转义 HTML:
```tsx
<p>{notification.content}</p>  {/* React 自动转义 */}
```

---

## 监控与日志

### 关键指标

- **未读消息数量**: 监控用户是否有过多未读消息
- **消息创建速率**: 防止通知轰炸
- **已读率**: 评估通知有效性
- **查询性能**: 监控 API 响应时间

### 日志记录

```typescript
console.log('创建通知:', {
  userId,
  type,
  timestamp: new Date().toISOString()
})
```

---

## 常见问题 (FAQ)

### Q1: 如何防止通知轰炸?

**A**: 实现通知聚合和频率限制:
```typescript
// 相同类型的通知在5分钟内只发送一次
const recentNotification = await prisma.notification.findFirst({
  where: {
    userId,
    type: 'TASK_CREATED',
    createdAt: { gte: fiveMinutesAgo }
  }
})

if (recentNotification) {
  // 跳过创建,或更新现有通知
  return
}
```

### Q2: 如何实现消息已读/全部已读?

**A**: 批量更新:
```typescript
// 标记全部为已读
await prisma.notification.updateMany({
  where: {
    userId: auth.userId,
    isRead: false
  },
  data: {
    isRead: true,
    readAt: new Date()
  }
})
```

### Q3: 如何实现消息优先级?

**A**: 添加 priority 字段:
```prisma
model Notification {
  // ...existing fields
  priority Int @default(0)  // 0=普通, 1=重要, 2=紧急
}
```

### Q4: 如何支持多语言通知?

**A**: 使用 i18n 键值:
```typescript
{
  title: "notification.user_joined.title",
  content: "notification.user_joined.content",
  metadata: {
    userName: "许昕",  // 动态内容
    i18nParams: { userName: "许昕" }
  }
}
```

---

## 总结

站内消息通知系统采用 **关系型数据库 + JSON 元数据** 的混合存储方案,具有以下优势:

✅ **简单可靠**: 基于 PostgreSQL,数据持久化有保障  
✅ **灵活扩展**: JSON 元数据支持动态字段  
✅ **高性能**: 索引优化,查询效率高  
✅ **易维护**: TypeScript 类型安全,代码可读性强  
✅ **可扩展**: 支持实时推送、消息归档等高级功能  

适用于 **中小规模应用**(日活 < 10万),如需支持更大规模,建议引入:
- 消息队列 (RabbitMQ / Kafka)
- 实时推送 (WebSocket / SSE)
- 分布式缓存 (Redis)
- 消息归档 (ClickHouse / MongoDB)

---

**文档版本**: v1.0.0  
**最后更新**: 2025-11-19  
**维护者**: 开发团队
