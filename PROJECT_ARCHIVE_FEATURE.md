# 项目归档功能

## 功能概述

在左侧菜单的 My Projects 中新增项目归档功能，允许用户将不再需要的项目归档，归档后的项目会被收纳到"归档项目"折叠列表中。

## 数据库变更

### Project 模型新增字段

```prisma
model Project {
  // ... 其他字段
  isArchived     Boolean         @default(false) // 是否已归档
  archivedAt     DateTime?                       // 归档时间
  
  @@index([isArchived])
}
```

### 迁移文件

已创建迁移文件：`prisma/migrations/add_project_archive/migration.sql`

```sql
ALTER TABLE "Project" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "archivedAt" TIMESTAMP(3);
CREATE INDEX "Project_isArchived_idx" ON "Project"("isArchived");
```

## API 接口

### 归档项目

**POST** `/api/projects/[id]/archive`

- 权限：项目创建者、组织创建者或超级管理员
- 响应：更新后的项目信息

### 取消归档项目

**DELETE** `/api/projects/[id]/archive`

- 权限：项目创建者、组织创建者或超级管理员
- 响应：更新后的项目信息

## 前端实现

### 1. 类型定义更新

在 `lib/types.ts` 中的 `Project` 接口添加：

```typescript
export interface Project {
  // ... 其他字段
  isArchived?: boolean    // 是否已归档
  archivedAt?: Date      // 归档时间
}
```

### 2. 侧边栏导航菜单

在 `components/sidebar/navigation-menu.tsx` 中：

#### 项目列表过滤

- **活跃项目**：过滤 `isArchived === false` 的项目
- **归档项目**：过滤 `isArchived === true` 的项目，按归档时间倒序排列

#### 下拉菜单选项

**活跃项目的更多操作菜单**：
- 编辑
- **归档** ⬅️ 新增
- 删除

**归档项目的更多操作菜单**：
- **取消归档** ⬅️ 新增
- 删除

#### 归档项目列表

在 My Projects 下方新增"归档项目"折叠区域：
- 显示归档项目数量
- 默认折叠状态
- 归档项目显示为半透明（opacity-60）
- 点击可查看归档项目的任务（只读）

## 使用流程

### 归档项目

1. 在 My Projects 列表中找到要归档的项目
2. 点击项目右侧的三点菜单
3. 选择"归档"选项
4. 项目从活跃列表移除，进入归档列表
5. 如果当前正在查看该项目，自动切换到 My Days 视图

### 取消归档

1. 展开"归档项目"折叠列表
2. 找到要恢复的项目
3. 点击项目右侧的三点菜单
4. 选择"取消归档"选项
5. 项目恢复到活跃项目列表

## 权限控制

- **项目创建者**：可以归档/取消归档自己创建的项目
- **组织创建者**：可以归档/取消归档组织内的任何项目
- **超级管理员**：可以归档/取消归档任何项目
- **普通成员**：只能查看和退出项目，无法归档

## 注意事项

1. **个人事务项目**：第一个项目（个人事务）不显示归档选项，无法被归档
2. **归档状态**：归档的项目仍然可以查看，但建议设置为只读模式
3. **任务关联**：归档项目后，其关联的任务仍然存在，可以正常查看
4. **删除限制**：归档的项目仍然需要满足"无任务"条件才能删除

## 测试要点

- [ ] 创建者可以归档自己的项目
- [ ] 组织创建者可以归档组织内的项目
- [ ] 超级管理员可以归档任何项目
- [ ] 普通成员无法归档项目
- [ ] 归档后项目从活跃列表消失
- [ ] 归档后项目出现在归档列表中
- [ ] 可以取消归档恢复项目
- [ ] 归档项目时如果正在查看，自动切换视图
- [ ] 个人事务项目无法归档
- [ ] 归档项目的任务仍然可以查看

## 部署步骤

1. 应用数据库迁移：
   ```bash
   npx prisma db push
   ```

2. 生成 Prisma 客户端：
   ```bash
   npx prisma generate
   ```

3. 重启应用服务

4. 验证功能正常
