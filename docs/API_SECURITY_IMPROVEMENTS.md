# API 安全改进文档

## 📋 概述

本文档记录了 Calendar Task Manager API 的安全性和严谨性改进。

## ✅ 已完成的改进

### 1. 认证系统 (Authentication)

#### 密码安全
- ✅ **密码哈希**: 使用 bcrypt (salt rounds: 10) 加密存储
- ✅ **密码强度验证**: 至少 6 字符，必须包含字母和数字
- ✅ **密码长度限制**: 最多 100 字符

#### JWT Token
- ✅ **Token 生成**: 登录和注册成功后返回 JWT
- ✅ **Token 验证**: 使用中间件验证所有受保护的端点
- ✅ **Token 有效期**: 7 天
- ✅ **Token 格式**: 支持 `Bearer <token>` 和直接 token

### 2. 输入验证 (Input Validation)

#### 用户相关
- ✅ **用户名格式**: 3-20 字符，字母数字下划线，必须以字母或数字开头
- ✅ **邮箱格式**: 标准邮箱格式验证
- ✅ **用户名唯一性**: 注册时检查
- ✅ **用户名标准化**: 统一转为小写存储

#### 任务相关
- ✅ **必填字段验证**: title, startDate, endDate, type, projectId
- ✅ **日期格式验证**: 验证日期字符串有效性
- ✅ **日期范围验证**: 开始日期不能晚于结束日期
- ✅ **时间格式验证**: HH:MM 格式
- ✅ **任务类型验证**: 只允许 daily, meeting, vacation
- ✅ **字符串清理**: 防止过长输入（title: 200, description: 2000）

### 3. 权限控制 (Authorization)

#### 任务权限
- ✅ **GET /api/tasks**
  - 只能查看自己的任务
  - 可以查看同一团队成员的任务（需要团队成员验证）
  - 项目和团队过滤需要成员验证
  
- ✅ **POST /api/tasks**
  - 只能在自己是成员的项目中创建任务
  - 任务自动关联到当前登录用户
  
- ✅ **GET /api/tasks/[id]**
  - 只能查看自己的任务
  - 可以查看同一团队项目的任务
  
- ✅ **PUT /api/tasks/[id]**
  - 只能修改自己的任务
  - 更改项目时验证新项目访问权限
  
- ✅ **DELETE /api/tasks/[id]**
  - 只能删除自己的任务

### 4. 统一响应格式

#### 成功响应
```typescript
{
  success: true,
  data: any,
  message?: string
}
```

#### 错误响应
```typescript
{
  success: false,
  error: string
}
```

#### HTTP 状态码
- `200`: 成功
- `201`: 创建成功
- `400`: 验证错误
- `401`: 未授权（未登录或 token 无效）
- `403`: 禁止访问（无权限）
- `404`: 资源未找到
- `500`: 服务器错误

### 5. 数据清理和安全

- ✅ **XSS 防护**: 输入字符串清理和长度限制
- ✅ **敏感信息过滤**: 响应中不包含密码字段
- ✅ **SQL 注入防护**: 使用 Prisma ORM 参数化查询

## 📁 新增工具模块

### `lib/auth.ts`
- `hashPassword(password)`: 密码哈希
- `verifyPassword(password, hashedPassword)`: 密码验证
- `generateToken(payload)`: 生成 JWT
- `verifyToken(token)`: 验证 JWT
- `extractToken(authHeader)`: 从请求头提取 token

### `lib/validation.ts`
- `isValidEmail(email)`: 邮箱格式验证
- `isValidUsername(username)`: 用户名格式验证
- `validatePassword(password)`: 密码强度验证
- `isValidDate(dateString)`: 日期格式验证
- `validateDateRange(start, end)`: 日期范围验证
- `isValidTime(timeString)`: 时间格式验证 (HH:MM)
- `isValidHexColor(color)`: 颜色格式验证
- `sanitizeString(str, maxLength)`: 字符串清理
- `validateRequiredFields(fields, required)`: 必填字段验证

### `lib/api-response.ts`
- `successResponse(data, message, status)`: 成功响应
- `errorResponse(error, status)`: 错误响应
- `unauthorizedResponse(message)`: 401 响应
- `forbiddenResponse(message)`: 403 响应
- `notFoundResponse(message)`: 404 响应
- `serverErrorResponse(message)`: 500 响应
- `validationErrorResponse(message)`: 400 验证错误响应

### `lib/middleware.ts`
- `authenticate(request)`: JWT 认证中间件

## 🔐 API 端点状态

### ✅ 已重构（安全）
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks` - 创建任务
- `GET /api/tasks/[id]` - 获取单个任务
- `PUT /api/tasks/[id]` - 更新任务
- `DELETE /api/tasks/[id]` - 删除任务

### ⚠️ 待重构
- `GET /api/projects` - 获取项目列表
- `POST /api/projects` - 创建项目
- `GET /api/teams` - 获取团队列表
- `POST /api/teams` - 创建团队
- `GET /api/users` - 获取用户列表

## 🔄 前端适配要求

### 1. API 客户端更新
需要更新 `lib/api-client.ts`:
- 添加 Authorization header 支持
- 存储和管理 JWT token
- 自动添加 token 到所有请求
- Token 过期处理

### 2. 响应格式适配
响应格式已变更，需要适配：
```typescript
// 旧格式
response.data  // 直接访问数据

// 新格式
response.data.data  // 需要访问 data.data
response.data.success  // 检查成功状态
response.data.error  // 获取错误信息
```

### 3. 创建任务变更
不再需要传递 `userId`，系统自动使用当前登录用户：
```typescript
// 旧方式
{ title, startDate, endDate, type, userId, projectId }

// 新方式
{ title, startDate, endDate, type, projectId }
```

## 🧪 测试建议

### 1. 认证测试
```bash
# 注册
POST /api/auth/register
{
  "username": "testuser",
  "password": "Test123",
  "name": "Test User",
  "email": "test@example.com"
}

# 登录
POST /api/auth/login
{
  "username": "testuser",
  "password": "Test123"
}
```

### 2. 任务操作测试
```bash
# 创建任务（需要 token）
POST /api/tasks
Headers: { Authorization: "Bearer <token>" }
{
  "title": "测试任务",
  "startDate": "2025-11-15",
  "endDate": "2025-11-15",
  "type": "daily",
  "projectId": "<project_id>"
}

# 获取任务列表
GET /api/tasks
Headers: { Authorization: "Bearer <token>" }

# 更新任务
PUT /api/tasks/<task_id>
Headers: { Authorization: "Bearer <token>" }
{
  "title": "更新后的标题"
}

# 删除任务
DELETE /api/tasks/<task_id>
Headers: { Authorization: "Bearer <token>" }
```

## 🔒 安全最佳实践

### 已实施
1. ✅ 密码永不明文存储
2. ✅ 使用 JWT 进行无状态认证
3. ✅ 所有输入进行验证和清理
4. ✅ 基于用户和团队的权限控制
5. ✅ 统一错误处理，避免敏感信息泄露

### 建议补充
1. ⚠️ 添加 HTTPS 强制
2. ⚠️ 实施速率限制（防暴力破解）
3. ⚠️ 添加 CSRF 保护
4. ⚠️ 实施请求日志记录
5. ⚠️ 添加 JWT 刷新 token 机制
6. ⚠️ 环境变量管理 JWT_SECRET

## 📝 环境变量

需要在 `.env` 文件添加：
```env
# JWT 密钥（生产环境必须更改！）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# 数据库连接
DATABASE_URL=postgresql://user:password@localhost:5432/calendar_tasks
```

## 🚀 下一步计划

1. 重构项目 API
2. 重构团队 API
3. 重构用户 API
4. 更新前端 API 客户端
5. 添加 API 集成测试
6. 实施速率限制
7. 添加 API 文档（Swagger/OpenAPI）
