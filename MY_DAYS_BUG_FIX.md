# My Days 数据加载和显示问题修复

## 问题描述

### 问题 1：My Days 数据加载不一致
- **现象**：在 My Days 选中时刷新页面可以正常加载数据，但点击团队后再点击 My Days 时，数据无法加载或不显示
- **根本原因**：`setNavigationMode` 函数在切换到 My Days 模式时，会清空 `selectedProjectIds`，导致月视图的过滤逻辑返回空数组

### 问题 2：My Days 任务条缺少头像和进度显示
- **现象**：My Days 视图中的任务条不显示用户头像和进度圈，而团队和项目视图中可以正常显示
- **根本原因**：月视图中的 `shouldShowUserInfo` 标志只在团队和项目模式下为 `true`，My Days 模式下为 `false`

## 修复方案

### 修复 1：恢复 My Days 模式下的项目选择

**文件**：`lib/store/calendar-store.ts`

**修改位置 1**：`setNavigationMode` 函数
```typescript
setNavigationMode: (mode) => {
  const { projects, currentUser } = get();
  
  // 切换到 my-days 模式时，恢复所有项目的选择
  const newSelectedProjectIds = mode === "my-days" 
    ? projects.map(p => p.id)  // 恢复所有项目
    : [];
  
  set({
    navigationMode: mode,
    selectedTeamId: null,
    selectedProjectId: null,
    selectedProjectIds: newSelectedProjectIds,
  });

  // 切换到 my-days 模式时，加载当前用户的任务
  if (mode === "my-days" && currentUser) {
    get().fetchTasks({ userId: currentUser.id });
  }
},
```

**修改位置 2**：`fetchAllData` 函数中的重置逻辑
```typescript
// 如果需要重置,设置为 My Days
if (needsReset) {
  set({
    navigationMode: "my-days",
    selectedTeamId: null,
    selectedProjectId: null,
    selectedProjectIds: projects.map(p => p.id), // 恢复所有项目
  });
}
```

**修复原理**：
1. 当切换到 My Days 模式时，自动选中所有项目（`projects.map(p => p.id)`）
2. 这样月视图的过滤逻辑就能正常工作，不会因为 `selectedProjectIds` 为空而返回空数组
3. 同时调用 `fetchTasks({ userId: currentUser.id })` 确保加载当前用户的任务

### 修复 2：在 My Days 模式下显示用户信息和进度

**文件**：`components/calendar/month-view.tsx`

**修改位置**：`shouldShowUserInfo` 标志的计算
```typescript
// 判断是否需要显示用户信息（My Days、团队或项目模式下都显示）
const shouldShowUserInfo = navigationMode === "my-days" || navigationMode === "team" || navigationMode === "project"
```

**修复原理**：
1. 将 My Days 模式也包含在需要显示用户信息的条件中
2. 这样任务条组件 `TaskBar` 会收到 `showUserInfo={true}` 属性
3. 任务条会显示：
   - 单个负责人：头像 + 姓名
   - 2-3个负责人：头像堆叠
   - 4个或更多：前3个头像 + "等N人"
   - 进度圈（仅日常任务）

## 数据流分析

### My Days 模式的数据加载流程

1. **初始加载**（页面刷新）：
   ```
   fetchAllData()
   ├─ fetchUsers()
   ├─ fetchTeams()
   ├─ fetchProjects()
   │  └─ set({ selectedProjectIds: projects.map(p => p.id) })  // 默认选中所有项目
   └─ fetchTasks({ userId: currentUser.id })
   ```

2. **从团队切换到 My Days**：
   ```
   setNavigationMode("my-days")
   ├─ set({ 
   │    navigationMode: "my-days",
   │    selectedProjectIds: projects.map(p => p.id)  // ✅ 恢复所有项目
   │  })
   └─ fetchTasks({ userId: currentUser.id })
   ```

3. **月视图过滤逻辑**：
   ```typescript
   if (navigationMode === "my-days" && currentUser) {
     if (selectedProjectIds.length === 0) {
       return []  // ❌ 修复前：这里会返回空数组
     }
     return tasks.filter(task => 
       selectedProjectIds.includes(task.projectId) &&  // ✅ 修复后：有项目可以过滤
       (task.assignees?.some(a => a.userId === currentUser.id) || 
        task.creatorId === currentUser.id)
     )
   }
   ```

## 任务条显示逻辑

### TaskBar 组件的显示规则

当 `showUserInfo={true}` 时：

1. **单个负责人**：
   - 显示头像（圆形，带边框）
   - 显示姓名（粗体）
   - 分隔符 "|"

2. **2-3个负责人**：
   - 显示头像堆叠（-space-x-1 实现重叠效果）
   - 不显示姓名
   - 分隔符 "|"

3. **4个或更多负责人**：
   - 显示前3个头像堆叠
   - 显示 "等N人" 文字
   - 分隔符 "|"

4. **没有负责人**：
   - 显示创建者的头像和姓名
   - 分隔符 "|"

5. **进度显示**（仅日常任务）：
   - 右侧显示进度圈
   - Hover 时显示百分比数字
   - 可拖拽调整进度

## 测试验证

### 测试场景 1：刷新页面
1. 在 My Days 模式下刷新页面
2. ✅ 应该能看到当前用户的所有任务
3. ✅ 任务条应该显示头像和进度

### 测试场景 2：切换导航模式
1. 点击某个团队
2. 查看团队的任务
3. 点击 My Days
4. ✅ 应该能看到当前用户的所有任务（不是空白）
5. ✅ 任务条应该显示头像和进度

### 测试场景 3：项目过滤
1. 在 My Days 模式下
2. 取消选中某些项目
3. ✅ 应该只显示选中项目中的任务
4. ✅ 任务条仍然显示头像和进度

### 测试场景 4：任务条显示
1. 在 My Days 模式下查看任务
2. ✅ 单人任务：显示头像 + 姓名
3. ✅ 多人任务：显示头像堆叠或 "等N人"
4. ✅ 日常任务：显示进度圈
5. ✅ Hover 进度圈：显示百分比
6. ✅ 拖拽进度圈：可以调整进度

## 相关文件

- `lib/store/calendar-store.ts` - 状态管理和数据加载
- `components/calendar/month-view.tsx` - 月视图渲染
- `components/calendar/week-view.tsx` - 周视图渲染
- `components/calendar/task-bar.tsx` - 任务条组件
- `components/views/list-view.tsx` - 列表视图
- `components/sidebar/navigation-menu.tsx` - 导航菜单

## 注意事项

1. **项目选择的持久化**：`selectedProjectIds` 会被持久化到 localStorage，所以刷新页面后会保持之前的选择
2. **团队/项目模式的项目选择**：切换到团队或项目模式时，`selectedProjectIds` 会被清空，这是正常的，因为这些模式不需要项目过滤
3. **性能考虑**：恢复所有项目选择不会影响性能，因为过滤逻辑已经在 `useMemo` 中优化
4. **向后兼容**：修复不会影响现有的团队和项目模式的功能

## 修复日期

2025-12-06
