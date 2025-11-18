# API 请求重构指南

## 概述

本项目已经完成了 API 请求层的重构，使用 axios 统一封装，提供更加工程化和易维护的请求方式。

## 新的架构

### 1. 核心请求库 (`lib/request.ts`)

基于 axios 封装的统一请求方法，提供以下特性：

- ✅ **自动 Token 管理** - 请求拦截器自动添加 Authorization header
- ✅ **统一错误处理** - 响应拦截器统一处理各种 HTTP 错误
- ✅ **类型安全** - 完整的 TypeScript 类型支持
- ✅ **请求超时** - 30 秒超时配置
- ✅ **401 自动跳转** - token 过期自动跳转登录页
- ✅ **文件上传/下载** - 支持文件操作
- ✅ **进度监听** - 上传进度回调

### 2. API 模块化 (`lib/api/`)

按业务模块划分 API，如：
- `organization.ts` - 组织相关
- `team.ts` - 团队相关
- `project.ts` - 项目相关
- `task.ts` - 任务相关
- `user.ts` - 用户相关

## 使用方法

### 基础用法

```typescript
import { get, post, put, del } from '@/lib/request'

// GET 请求
const users = await get<User[]>('/users')
const user = await get<User>('/users/123')
const filtered = await get<User[]>('/users', { role: 'admin' })

// POST 请求
const newUser = await post<User>('/users', {
  name: 'John',
  email: 'john@example.com'
})

// PUT 请求
const updatedUser = await put<User>('/users/123', {
  name: 'Jane'
})

// DELETE 请求
await del('/users/123')
```

### 使用 API 模块

```typescript
import { organizationAPI } from '@/lib/api/organization'

// 获取组织列表
const orgs = await organizationAPI.getAll()

// 搜索组织
const searchResults = await organizationAPI.getAll('keyword')

// 创建组织
const newOrg = await organizationAPI.create({
  name: 'My Org',
  description: 'Org description'
})

// 更新组织
await organizationAPI.update(orgId, { name: 'New Name' })

// 获取成员
const members = await organizationAPI.getMembers(orgId)

// 获取团队
const teams = await organizationAPI.getTeams(orgId)

// 获取项目
const projects = await organizationAPI.getProjects(orgId)
```

### 文件上传

```typescript
import { upload } from '@/lib/request'

const formData = new FormData()
formData.append('file', file)

const result = await upload('/upload/avatar', formData, (progressEvent) => {
  const progress = (progressEvent.loaded / progressEvent.total) * 100
  console.log(`上传进度: ${progress}%`)
})
```

### 文件下载

```typescript
import { download } from '@/lib/request'

await download('/files/report.pdf', 'report.pdf')
```

### 高级配置

```typescript
import { get, post } from '@/lib/request'

// 自定义请求配置
const data = await get('/api/data', params, {
  timeout: 60000, // 自定义超时
  needAuth: false, // 不需要 token
  showError: false, // 不显示错误提示
  headers: {
    'Custom-Header': 'value'
  }
})
```

## 迁移步骤

### 旧代码（不推荐）

```typescript
// ❌ 旧方式：手动管理 token，繁琐且易错
const token = getToken()
const response = await fetch('/api/organizations', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
const data = await response.json()
if (!data.success) {
  throw new Error(data.error)
}
return data.data
```

### 新代码（推荐）

```typescript
// ✅ 新方式：简洁、类型安全、自动处理
import { organizationAPI } from '@/lib/api/organization'

const orgs = await organizationAPI.getAll()
```

### 组件迁移示例

#### Before:

```typescript
const fetchData = async () => {
  try {
    const token = getToken()
    if (!token) return
    
    const [res1, res2, res3] = await Promise.all([
      fetch(`/api/organizations/${id}/members`, {
        headers: { "Authorization": `Bearer ${token}` }
      }),
      fetch(`/api/organizations/${id}/teams`, {
        headers: { "Authorization": `Bearer ${token}` }
      }),
      fetch(`/api/organizations/${id}/projects`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
    ])
    
    const [data1, data2, data3] = await Promise.all([
      res1.json(),
      res2.json(),
      res3.json()
    ])
    
    setData({
      members: data1.success ? data1.data : [],
      teams: data2.success ? data2.data : [],
      projects: data3.success ? data3.data : []
    })
  } catch (error) {
    console.error(error)
    toast({ title: "错误", variant: "destructive" })
  }
}
```

#### After:

```typescript
import { organizationAPI } from '@/lib/api/organization'

const fetchData = async () => {
  try {
    const [members, teams, projects] = await Promise.all([
      organizationAPI.getMembers(id),
      organizationAPI.getTeams(id),
      organizationAPI.getProjects(id)
    ])
    
    setData({ members, teams, projects })
  } catch (error) {
    console.error(error)
    toast({ title: "错误", variant: "destructive" })
  }
}
```

## 需要迁移的文件清单

全站共有 **21 处** 使用了 `Bearer ${token}` 的旧式请求，需要逐步迁移：

### 已迁移 ✅
- [x] `components/organization-detail-dialog.tsx`

### 待迁移 ⏳
- [ ] `components/organization-management-dialog.tsx`
- [ ] `components/panorama-view.tsx`
- [ ] 其他组件...

## 最佳实践

### 1. 统一使用 API 模块

```typescript
// ✅ 推荐
import { organizationAPI } from '@/lib/api/organization'
const orgs = await organizationAPI.getAll()

// ❌ 不推荐
import { get } from '@/lib/request'
const orgs = await get('/organizations')
```

### 2. 错误处理

```typescript
try {
  const data = await organizationAPI.getAll()
  // 处理数据
} catch (error) {
  // 错误已由拦截器处理，这里只需要做 UI 反馈
  toast({
    title: "加载失败",
    description: error instanceof Error ? error.message : "未知错误",
    variant: "destructive"
  })
}
```

### 3. 类型定义

```typescript
// 在 API 模块中定义类型
export interface Organization {
  id: string
  name: string
  description?: string
  // ...
}

// 使用时享受类型提示
const org: Organization = await organizationAPI.getById(id)
```

### 4. 并发请求

```typescript
// 使用 Promise.all 提高性能
const [users, teams, projects] = await Promise.all([
  userAPI.getAll(),
  teamAPI.getAll(),
  projectAPI.getAll()
])
```

## 优势对比

| 特性 | 旧方式 (fetch) | 新方式 (axios) |
|------|---------------|---------------|
| Token 管理 | 手动添加 | 自动添加 ✅ |
| 错误处理 | 手动处理 | 统一处理 ✅ |
| 类型安全 | 无 | 完整支持 ✅ |
| 代码量 | 10-15 行 | 1 行 ✅ |
| 超时设置 | 需手动 | 自动配置 ✅ |
| 401 处理 | 需手动 | 自动跳转 ✅ |
| 文件上传 | 复杂 | 简单 ✅ |
| 可维护性 | 低 | 高 ✅ |

## 注意事项

1. **向后兼容** - 新旧代码可以共存，逐步迁移
2. **Token 存储** - 仍使用 localStorage 存储 token
3. **错误提示** - 错误会在拦截器统一处理，组件只需处理 UI 反馈
4. **并发请求** - 充分利用 Promise.all 提高性能

## 下一步

1. 逐个迁移使用 `Bearer ${token}` 的组件
2. 创建更多业务模块的 API 封装
3. 添加请求缓存机制（可选）
4. 添加请求重试机制（可选）

## 示例项目结构

```
lib/
  ├── request.ts          # axios 封装
  ├── api-client.ts       # token 管理（保留兼容）
  └── api/
      ├── organization.ts # 组织 API
      ├── team.ts         # 团队 API
      ├── project.ts      # 项目 API
      ├── task.ts         # 任务 API
      └── user.ts         # 用户 API
```

---

**开始迁移，让代码更优雅！** 🚀
