# 修复：归档后刷新页面项目重新出现的问题

## 问题描述

归档项目后，刷新页面重新请求数据，刚才归档的项目又回到了项目列表中，而不是出现在归档列表中。

## 根本原因

在 `lib/store/calendar-store.ts` 的 `fetchProjects` 方法中，项目数据转换时**没有包含** `isArchived` 和 `archivedAt` 字段。

虽然 API 返回了这些字段，但前端在转换数据时丢弃了它们，导致所有项目都被当作活跃项目处理。

## 修复方案

### 修改文件
`lib/store/calendar-store.ts`

### 修改内容

在 `fetchProjects` 方法中的项目数据转换部分，添加归档相关字段：

```typescript
const projects = projectsData.map((project: any) => ({
  id: project.id,
  name: project.name,
  description: project.description,
  color: project.color,
  teamId: project.teamId,
  organizationId: project.organizationId,
  creatorId: project.creatorId,
  taskPermission: project.taskPermission || "ALL_MEMBERS",
  isArchived: project.isArchived || false,           // ✅ 新增
  archivedAt: project.archivedAt ? new Date(project.archivedAt) : undefined, // ✅ 新增
  memberIds: project.memberIds || [],
  createdAt: new Date(project.createdAt),
}));
```

## 验证步骤

### 1. 测试数据持久化

```bash
npx tsx scripts/test-archive-persistence.ts
```

应该看到：
```
✅ 数据持久化正常！
✅ 活跃项目: 51
✅ 归档项目: 4
```

### 2. 手动测试流程

1. 启动开发服务器：`npm run dev`
2. 在浏览器中打开应用
3. 找一个项目，点击右侧菜单选择"归档"
4. 验证项目移到"归档项目"列表
5. **刷新页面** (F5 或 Ctrl+R)
6. 验证项目仍在"归档项目"列表中（不会回到活跃列表）

### 3. 检查浏览器控制台

打开浏览器开发者工具 (F12)，查看 Network 标签：
- 请求 `/api/projects` 
- 响应中应该包含 `isArchived: true` 和 `archivedAt` 字段

## 数据流验证

```
API 返回数据
    ↓
{
  id: "...",
  name: "...",
  isArchived: true,        ← 包含此字段
  archivedAt: "2026-02-06T00:22:37.000Z"  ← 包含此字段
}
    ↓
前端转换数据
    ↓
{
  id: "...",
  name: "...",
  isArchived: true,        ← ✅ 现在保留此字段
  archivedAt: Date(...)    ← ✅ 现在保留此字段
}
    ↓
Zustand Store
    ↓
前端过滤显示
    ↓
活跃项目列表 (isArchived === false)
归档项目列表 (isArchived === true)
```

## 相关代码位置

### 1. 数据库层
- `prisma/schema.prisma` - Project 模型包含 isArchived 和 archivedAt 字段

### 2. API 层
- `app/api/projects/route.ts` - 返回所有项目字段（包括 isArchived）

### 3. 前端层
- `lib/store/calendar-store.ts` - ✅ 已修复：现在保留 isArchived 和 archivedAt
- `lib/types.ts` - Project 接口包含这两个字段
- `components/sidebar/navigation-menu.tsx` - 使用这些字段过滤项目列表

## 测试清单

- [ ] 数据库中的 isArchived 字段正确保存
- [ ] API 返回的数据包含 isArchived 和 archivedAt
- [ ] 前端 Store 正确保留这些字段
- [ ] 归档项目后刷新页面仍在归档列表中
- [ ] 取消归档后刷新页面回到活跃列表
- [ ] 多次刷新数据保持一致

## 部署步骤

1. 更新代码（已完成）
2. 清理 Next.js 缓存：
   ```bash
   rm -r -Force .next
   ```
3. 重启开发服务器：
   ```bash
   npm run dev
   ```
4. 清除浏览器缓存：`Ctrl+Shift+R`
5. 测试功能

## 如果问题仍然存在

### 检查 1: 验证 API 返回数据

在浏览器开发者工具中：
1. 打开 Network 标签
2. 刷新页面
3. 找到 `/api/projects` 请求
4. 查看 Response，确认包含 `isArchived` 和 `archivedAt` 字段

### 检查 2: 验证 Store 数据

在浏览器控制台执行：
```javascript
// 查看 Store 中的项目数据
const store = useCalendarStore.getState()
console.log(store.projects.filter(p => p.isArchived))
```

### 检查 3: 查看数据库

```bash
npx tsx scripts/check-archive-fields.ts
```

## 相关文件修改记录

| 文件 | 修改内容 | 状态 |
|------|---------|------|
| lib/store/calendar-store.ts | 添加 isArchived 和 archivedAt 字段 | ✅ 完成 |
| lib/types.ts | 已包含这两个字段 | ✅ 已有 |
| app/api/projects/route.ts | 已返回这两个字段 | ✅ 已有 |

---

**修复日期**: 2026-02-06  
**版本**: 1.0  
**状态**: ✅ 完成
