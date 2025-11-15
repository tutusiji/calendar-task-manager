# 任务项目必选验证与统一 Toast 通知系统

## 更新日期
2025-01-15

## 更新内容

### 1. 前端表单验证 - 项目必选

#### 修改文件
- `components/task/task-detail-panel.tsx`
- `components/task/task-edit-panel.tsx`

#### 实现功能
- 添加 `projectError` 状态来跟踪项目选择错误
- 提交表单时验证项目是否已选择
- 未选择项目时：
  - Select 组件边框变为红色 (`border-red-500 ring-1 ring-red-500`)
  - 显示红色错误提示文字："请选择一个项目"
  - 弹出 destructive 类型的 toast 提示
- 选择项目后自动清除错误状态
- 标签添加红色星号 `*` 表示必填

#### 代码示例
```tsx
// 状态
const [projectError, setProjectError] = useState(false)

// 验证
if (!projectId || projectId === '') {
  setProjectError(true)
  toast({
    title: "请选择项目",
    description: "任务必须归属于一个项目",
    variant: "destructive",
  })
  return
}

// UI
<Select 
  value={projectId} 
  onValueChange={(value) => {
    setProjectId(value)
    setProjectError(false)
  }}
>
  <SelectTrigger 
    className={cn(projectError && "border-red-500 ring-1 ring-red-500")}
  >
    <SelectValue placeholder="请选择项目" />
  </SelectTrigger>
</Select>
{projectError && (
  <p className="text-sm text-red-500">请选择一个项目</p>
)}
```

### 2. 后端 API 验证增强

#### 修改文件
- `app/api/tasks/route.ts` (POST 方法)
- `app/api/tasks/[id]/route.ts` (PUT 方法)

#### 实现功能
- 在现有必填字段验证后，额外添加项目 ID 的空值检查
- POST 创建任务时：验证 `projectId` 不为空且项目存在
- PUT 更新任务时：如果提供了 `projectId`，验证不为空
- 返回明确的错误消息：
  - "必须选择一个项目"
  - "项目ID不能为空"
  - "项目不存在"

#### 代码示例
```typescript
// POST /api/tasks
// 特别验证项目ID
if (!projectId || projectId.trim() === '') {
  return validationErrorResponse('必须选择一个项目')
}

// PUT /api/tasks/[id]
// 特别验证项目ID（如果提供）
if (projectId !== undefined && (!projectId || projectId.trim() === '')) {
  return validationErrorResponse('项目ID不能为空')
}
```

### 3. 统一 Toast 通知系统

#### 新增文件
- `lib/toast.ts` - Toast 工具函数

#### 修改文件
- `components/ui/toaster.tsx` - 添加图标显示
- `components/ui/toast.tsx` - 添加 success 和 warning 变体
- `lib/store/calendar-store.ts` - 集成 toast 通知
- `app/page.tsx` - 使用 toast 替代 console.error

#### 功能特性

##### 3.1 Toast 变体类型
- **success** (成功): 绿色边框 + 绿色背景 + 绿色勾选图标 ✓
- **destructive** (错误): 红色边框 + 红色背景 + 红色叉号图标 ✕
- **warning** (警告): 黄色边框 + 黄色背景 + 黄色警告图标 ⚠
- **default** (信息): 蓝色信息图标 ℹ

##### 3.2 Toast 工具函数
```typescript
// lib/toast.ts
import { showToast } from '@/lib/toast'

// 使用方式
showToast.success('操作成功', '任务已创建')
showToast.error('操作失败', '项目不存在')
showToast.warning('注意', '即将删除任务')
showToast.info('提示', '正在加载数据')
```

##### 3.3 UI 改进
- Toast 从右侧滑入
- 图标与文字并排显示
- 图标大小: 5x5 (h-5 w-5)
- 图标自动根据变体类型选择颜色
- 响应式布局，移动端友好

##### 3.4 全局错误处理
所有 API 错误现在通过 toast 通知显示，包括：
- 获取任务失败
- 获取项目失败
- 获取用户失败
- 获取团队失败
- 认证失败（自动跳转登录页）

#### Toast 样式定义
```typescript
// components/ui/toast.tsx
const toastVariants = {
  success: 'border-green-500 bg-green-50 text-green-900',
  destructive: 'border-destructive bg-destructive text-destructive-foreground',
  warning: 'border-yellow-500 bg-yellow-50 text-yellow-900',
  default: 'border bg-background text-foreground',
}
```

### 4. 任务表单成功提示优化

#### 修改文件
- `components/task/task-detail-panel.tsx`
- `components/task/task-edit-panel.tsx`

#### 更新内容
- 创建任务成功：显示绿色成功 toast
- 更新任务成功：显示绿色成功 toast
- 删除任务成功：显示绿色成功 toast
- 操作失败：显示红色错误 toast

#### 代码示例
```tsx
// 成功提示
toast({
  variant: 'success' as any,
  title: "创建成功",
  description: `任务「${title}」已创建`,
})

// 失败提示
toast({
  title: "创建失败",
  description: "创建任务失败，请重试",
  variant: "destructive",
})
```

### 5. 页面级错误处理

#### 修改文件
- `app/page.tsx`

#### 更新内容
- 认证错误：显示 toast 并跳转登录页
- 一般错误：显示 toast 通知
- 移除 console.error，统一使用 toast

#### 代码示例
```tsx
useEffect(() => {
  if (error) {
    if (error.includes('认证') || error.includes('Token') || error.includes('登录')) {
      showToast.error('认证失败', '请重新登录')
      localStorage.removeItem("currentUser")
      router.push("/login")
    } else {
      showToast.error('操作失败', error)
    }
  }
}, [error, router])
```

## 用户体验改进

### 视觉反馈
1. **表单验证**
   - 立即的视觉反馈（红色边框）
   - 清晰的错误提示文字
   - 必填标记明显

2. **操作反馈**
   - 成功操作：绿色图标 + 绿色背景
   - 错误操作：红色图标 + 红色背景
   - 统一的弹出位置（右侧）

3. **错误处理**
   - 所有 API 错误统一显示
   - 认证错误自动重定向
   - 用户友好的错误消息

### 可访问性
- 图标提供视觉辅助
- 文字提供清晰说明
- 颜色符合无障碍标准

## 技术细节

### Toast 实现原理
1. 基于 Radix UI Toast 组件
2. 使用 Zustand 全局状态管理
3. 支持多个 toast 同时显示
4. 自动关闭和手动关闭

### 图标库
- 使用 `lucide-react` 图标库
- 图标组件：
  - `CheckCircle2` - 成功
  - `XCircle` - 错误
  - `AlertCircle` - 警告
  - `Info` - 信息

### 类型安全
- TypeScript 严格类型检查
- Toast 变体类型扩展
- API 错误类型处理

## 测试建议

### 前端测试
1. 尝试不选择项目提交任务
2. 验证红色边框和错误提示显示
3. 选择项目后验证错误状态清除
4. 测试所有 toast 变体显示正确

### 后端测试
1. 发送空 projectId 的 POST 请求
2. 发送不存在的 projectId
3. 验证错误消息正确返回
4. 验证 PUT 请求的项目验证

### 集成测试
1. 创建任务流程完整测试
2. 更新任务流程完整测试
3. API 错误时 toast 正确显示
4. 认证错误时自动跳转

## 已知问题
无

## 未来优化
1. Toast 位置可配置
2. Toast 持续时间可配置
3. Toast 音效提示
4. Toast 动画优化

## 相关文档
- [API Security Improvements](./API_SECURITY_IMPROVEMENTS.md)
- [Shadcn UI Toast](https://ui.shadcn.com/docs/components/toast)
- [Radix UI Toast](https://www.radix-ui.com/docs/primitives/components/toast)
