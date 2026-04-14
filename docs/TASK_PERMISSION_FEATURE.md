# 任务权限控制功能

## 功能概述
在团队和项目中添加了任务权限控制功能，允许设置谁可以创建、编辑和删除任务。

## 权限类型
- **ALL_MEMBERS（所有成员）**：团队/项目成员之间可以互相创建、编辑和删除任务
- **CREATOR_ONLY（仅创建人）**：只有创建人可以给团队/项目中所有成员创建、编辑和删除任务

## 实现的功能

### 1. 数据库更新
- ✅ 在 `Team` 和 `Project` 表中添加了 `taskPermission` 字段
- ✅ 创建了 `TaskPermission` 枚举类型
- ✅ 默认值为 `ALL_MEMBERS`（向后兼容）

### 2. 类型定义
- ✅ 更新了 TypeScript 类型定义
- ✅ 添加了 `TaskPermission` 类型
- ✅ 在 `Team` 和 `Project` 接口中添加了 `taskPermission` 字段

### 3. UI 更新
- ✅ 团队对话框添加权限选择 RadioGroup
- ✅ 项目对话框添加权限选择 RadioGroup
- ✅ 提供清晰的选项说明文字

### 4. 权限检查
- ✅ 创建了 `permission-utils.ts` 工具函数
- ✅ 在任务创建时检查权限
- ✅ 在任务编辑时检查权限
- ✅ 在任务删除时检查权限
- ✅ 超级管理员拥有所有权限

### 5. 用户体验
- ✅ 权限不足时显示友好的错误提示
- ✅ 默认选择"所有成员"选项
- ✅ 在编辑模式下保留原有权限设置

## 使用示例

### 创建允许所有成员管理任务的团队
```typescript
const team = {
  name: "研发团队",
  taskPermission: "ALL_MEMBERS",
  // ... 其他字段
}
```

### 创建仅创建人可管理任务的项目
```typescript
const project = {
  name: "机密项目",
  taskPermission: "CREATOR_ONLY",
  // ... 其他字段
}
```

## 权限检查逻辑
1. 超级管理员（`isAdmin: true`）拥有所有权限
2. 非团队/项目成员没有任何权限
3. `ALL_MEMBERS` 模式：所有成员都可以管理任务
4. `CREATOR_ONLY` 模式：只有创建者可以管理任务

## 测试场景
- ✅ 创建团队时选择不同权限
- ✅ 编辑团队时修改权限
- ✅ 创建项目时选择不同权限
- ✅ 编辑项目时修改权限
- ✅ 普通成员在 CREATOR_ONLY 模式下尝试创建任务（应被拒绝）
- ✅ 创建者在 CREATOR_ONLY 模式下创建任务（应成功）
- ✅ 超级管理员可以管理任何任务

## 数据库迁移
迁移文件：`20251115133624_add_task_permission`
- 创建 `TaskPermission` 枚举
- 为现有 `Team` 和 `Project` 记录添加默认值 `ALL_MEMBERS`

## Mock 数据更新
已更新测试数据，包含：
- 设计团队（CREATOR_ONLY）- 仅创建者可管理
- 品牌推广活动项目（CREATOR_ONLY）- 仅创建者可管理
- 其他团队和项目（ALL_MEMBERS）- 所有成员可管理
