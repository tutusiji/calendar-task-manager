# API 文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **响应格式**: JSON
- **时间格式**: ISO 8601 (例如: `2024-01-15T09:00:00.000Z`)

## 响应结构

### 成功响应
```json
{
  "success": true,
  "data": { ... }
}
```

### 错误响应
```json
{
  "success": false,
  "error": "错误信息"
}
```

## API 端点

### 任务 (Tasks)

#### 获取任务列表
- **GET** `/api/tasks`
- **查询参数**:
  - `userId` (可选): 按用户 ID 筛选
  - `projectId` (可选): 按项目 ID 筛选
  - `teamId` (可选): 按团队 ID 筛选
  - `startDate` (可选): 开始日期 (YYYY-MM-DD)
  - `endDate` (可选): 结束日期 (YYYY-MM-DD)
- **示例**: `/api/tasks?userId=user123&startDate=2024-01-01&endDate=2024-01-31`

#### 获取单个任务
- **GET** `/api/tasks/:id`
- **示例**: `/api/tasks/clxxx123`

#### 创建任务
- **POST** `/api/tasks`
- **请求体**:
```json
{
  "title": "开发登录功能",
  "description": "实现用户登录和认证系统",
  "startDate": "2024-01-15",
  "endDate": "2024-01-16",
  "startTime": "09:00",
  "endTime": "18:00",
  "type": "daily",
  "userId": "user123",
  "projectId": "project123"
}
```
- **type 可选值**: `daily`, `meeting`, `vacation`

#### 更新任务
- **PUT** `/api/tasks/:id`
- **请求体**: (所有字段可选)
```json
{
  "title": "新标题",
  "description": "新描述",
  "startDate": "2024-01-20",
  "endDate": "2024-01-21",
  "type": "meeting"
}
```

#### 删除任务
- **DELETE** `/api/tasks/:id`

---

### 用户 (Users)

#### 获取用户列表
- **GET** `/api/users`

#### 创建用户
- **POST** `/api/users`
- **请求体**:
```json
{
  "name": "张三",
  "email": "zhangsan@example.com",
  "avatar": "https://example.com/avatar.jpg"
}
```

---

### 项目 (Projects)

#### 获取项目列表
- **GET** `/api/projects`
- **查询参数**:
  - `teamId` (可选): 按团队 ID 筛选
- **示例**: `/api/projects?teamId=team123`

#### 创建项目
- **POST** `/api/projects`
- **请求体**:
```json
{
  "name": "Web 应用开发",
  "color": "#10b981",
  "description": "开发新的 Web 应用平台",
  "teamId": "team123",
  "memberIds": ["user1", "user2"]
}
```

---

### 团队 (Teams)

#### 获取团队列表
- **GET** `/api/teams`

#### 创建团队
- **POST** `/api/teams`
- **请求体**:
```json
{
  "name": "工程团队",
  "color": "#3b82f6",
  "description": "负责产品开发和技术实现",
  "memberIds": ["user1", "user2"]
}
```

---

## 测试 API

### 使用 curl

```bash
# 获取所有任务
curl http://localhost:3000/api/tasks

# 获取特定用户的任务
curl "http://localhost:3000/api/tasks?userId=xxx"

# 创建任务
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试任务",
    "startDate": "2024-01-15",
    "endDate": "2024-01-15",
    "type": "daily",
    "userId": "xxx",
    "projectId": "xxx"
  }'
```

### 使用 Postman

1. 导入 Base URL: `http://localhost:3000/api`
2. 设置 Content-Type: `application/json`
3. 按照上述端点进行测试

---

## 数据库结构

### User (用户)
- `id`: String (主键)
- `name`: String
- `email`: String (唯一)
- `avatar`: String?
- `createdAt`: DateTime
- `updatedAt`: DateTime

### Team (团队)
- `id`: String (主键)
- `name`: String
- `color`: String
- `description`: String?
- `createdAt`: DateTime
- `updatedAt`: DateTime

### Project (项目)
- `id`: String (主键)
- `name`: String
- `color`: String
- `description`: String?
- `teamId`: String? (外键)
- `createdAt`: DateTime
- `updatedAt`: DateTime

### Task (任务)
- `id`: String (主键)
- `title`: String
- `description`: String?
- `startDate`: DateTime
- `endDate`: DateTime
- `startTime`: String?
- `endTime`: String?
- `type`: TaskType (枚举: daily, meeting, vacation)
- `userId`: String (外键)
- `projectId`: String (外键)
- `createdAt`: DateTime
- `updatedAt`: DateTime

---

## 下一步

1. 启动开发服务器: `pnpm dev`
2. 访问 API: `http://localhost:3000/api/tasks`
3. 使用 Postman 或 curl 测试 API
4. 集成到前端应用
