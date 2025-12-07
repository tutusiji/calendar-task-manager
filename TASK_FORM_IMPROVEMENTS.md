# 任务表单和任务条改进

## 修改日期
2025-12-06

## 改进内容

### 1. 个人事务项目自动设置负责人

**问题**：选择个人事务项目时，负责人没有自动设置为当前用户

**修复位置**：`components/task/task-form-panel.tsx`

**修改内容**：
```typescript
// 修改前：只在创建模式下自动设置
useEffect(() => {
  if (isPersonalProject && currentUser && !task) {
    setAssigneeIds([currentUser.id])
  }
}, [isPersonalProject, currentUser, task])

// 修改后：无论创建还是编辑模式，都自动设置
useEffect(() => {
  if (isPersonalProject && currentUser) {
    // 无论是创建还是编辑模式，选择个人事务项目时都设置为当前用户
    setAssigneeIds([currentUser.id])
  }
}, [isPersonalProject, currentUser])
```

**效果**：
- 创建任务时，选择个人事务项目会自动清空负责人并设置为当前用户
- 编辑任务时，切换到个人事务项目也会自动清空负责人并设置为当前用户
- 个人事务项目的负责人选择器会被禁用，显示提示"个人事务只能指派给自己"

---

### 2. 时间选择器改为时钟面板

**问题**：原来的时间选择器是浏览器原生的 `<input type="time">`，不够直观

**新增文件**：`components/ui/time-picker.tsx`

**设计方案**：
- **左侧**：保留原生时间输入框，支持直接输入和选择时/分
- **右侧**：时钟图标按钮，点击弹出时钟面板

**功能特性**：

1. **双重输入方式**：
   - 直接在输入框中输入或选择时间（保留原有功能）
   - 点击时钟图标打开时钟面板进行可视化选择

2. **时钟表盘**（左侧）：
   - 12小时制表盘，显示1-12的刻度
   - 时针（短针，40px）：指示小时
   - 分针（长针，58px）：指示分钟
   - 中心圆点标记
   - 表盘直径：160px（缩小后更紧凑）

3. **交互方式**：
   - 点击表盘：设置分钟
   - 拖动时针：调整小时
   - 拖动分针：调整分钟
   - 数字输入框：直接输入时间（0-23小时，0-59分钟）

4. **快捷选择**（右侧，2列布局）：
   - 左列：AM 9:00, AM 9:30, AM 10:30, AM 11:00
   - 右列：PM 2:00, PM 2:30, PM 5:00, PM 5:30

5. **操作按钮**（右侧底部）：
   - 清除：清空时间
   - 确定：应用选择的时间

**使用方式**：
```typescript
<TimePicker
  value={startTime}
  onChange={setStartTime}
  placeholder="选择时间（可选）"
/>
```

**布局结构**：
```
┌─────────────────────────────────────────────┐
│ [时间输入框 HH:MM]  [🕐 时钟图标按钮]      │
└─────────────────────────────────────────────┘
                    ↓ 点击图标
┌─────────────────────────────────────────────┐
│  ┌─────────────┐  ┌────────────────────┐    │
│  │  [HH]:[MM]  │  │  快捷选择          │    │
│  │             │  │  ┌────────┬────────┐│   │
│  │   时钟表盘   │  │  │AM 9:00 │PM 2:00 ││   │
│  │   (160px)   │  │  │AM 9:30 │PM 2:30 ││   │
│  │             │  │  │AM10:30 │PM 5:00 ││   │
│  │  提示文字    │  │  │AM11:00 │PM 5:30 ││   │
│  └─────────────┘  │  └────────┴────────┘│   │
│                   │  [清除]    [确定]   │    │
│                   └────────────────────┘    │
└─────────────────────────────────────────────┘
```

**视觉效果**：
- 弹出式面板（Popover）横向布局
- 时钟表盘直径：160px（缩小尺寸）
- 时针长度：40px，粗细：3.5px，颜色：主题色
- 分针长度：58px，粗细：2.5px，颜色：蓝色
- 支持拖拽时的视觉反馈（cursor: grab/grabbing）
- 快捷按钮纵向排列，更节省空间

---

### 3. 任务条多人显示优化

**问题**：超过3人时，前3个头像可能不包含当前用户

**修复位置**：`components/calendar/task-bar.tsx`

**修改内容**：

1. **优化负责人列表获取逻辑**：
```typescript
// 获取前三个负责人的用户信息（超过3人时，确保包含当前用户）
const assigneeUsers = (() => {
  if (assigneeCount <= 3) {
    // 3人及以下，直接显示所有人
    return assignees
      .map((a) => getUserById(a.userId))
      .filter((u): u is import("@/lib/types").User => !!u);
  } else {
    // 超过3人时，优先显示当前用户
    const currentUserId = currentUser?.id;
    const currentUserAssignee = assignees.find(a => a.userId === currentUserId);
    
    if (currentUserAssignee) {
      // 如果当前用户在负责人列表中，确保显示当前用户
      const otherAssignees = assignees.filter(a => a.userId !== currentUserId);
      const displayAssignees = [currentUserAssignee, ...otherAssignees.slice(0, 2)];
      return displayAssignees
        .map((a) => getUserById(a.userId))
        .filter((u): u is import("@/lib/types").User => !!u);
    } else {
      // 当前用户不在负责人列表中，显示前3个
      return assignees
        .slice(0, 3)
        .map((a) => getUserById(a.userId))
        .filter((u): u is import("@/lib/types").User => !!u);
    }
  }
})();
```

2. **确保显示前3个头像**：
```typescript
// 4个或更多负责人：显示前3个头像（包括自己）+ "等N人"
<>
  <div className="flex items-center gap-1 shrink-0">
    <div className="flex items-center -space-x-1">
      {assigneeUsers.slice(0, 3).map((user, index) => (
        <Avatar key={user.id} ... />
      ))}
    </div>
    <span className="text-xs font-semibold">
      等{assigneeCount}人
    </span>
  </div>
  <span className="opacity-60 -mr-0.5">|</span>
</>
```

**显示规则**：
- **1人**：头像 + 姓名
- **2-3人**：头像堆叠（-space-x-1）
- **4人及以上**：
  - 如果当前用户在负责人列表中：显示当前用户 + 其他2人的头像
  - 如果当前用户不在负责人列表中：显示前3人的头像
  - 显示"等N人"文字

**效果**：
- 当前用户总是能在任务条上看到自己的头像（如果自己是负责人之一）
- 更直观地了解任务的负责人情况
- 保持界面简洁，不会因为人数过多而占用过多空间

---

## 测试场景

### 场景 1：个人事务项目
1. 创建新任务，选择"XXX的个人事务"项目
2. ✅ 负责人自动设置为当前用户
3. ✅ 负责人选择器被禁用
4. 编辑已有任务，切换到个人事务项目
5. ✅ 负责人自动清空并设置为当前用户

### 场景 2：时间选择器
1. 点击"开始时间"或"结束时间"的时钟图标
2. ✅ 弹出时钟面板
3. 点击表盘设置分钟
4. ✅ 分针移动到对应位置
5. 拖动时针调整小时
6. ✅ 时针跟随鼠标移动
7. 使用快捷时间按钮
8. ✅ 时间立即更新
9. 点击"确定"
10. ✅ 时间应用到表单

### 场景 3：多人任务条显示
1. 创建一个有5个负责人的任务（包括自己）
2. 在日历视图中查看任务条
3. ✅ 显示3个头像（包括自己）+ "等5人"
4. 创建一个有5个负责人的任务（不包括自己）
5. ✅ 显示前3个负责人的头像 + "等5人"

---

## 相关文件

### 新增文件
- `components/ui/time-picker.tsx` - 时钟面板时间选择器

### 修改文件
- `components/task/task-form-panel.tsx` - 任务表单面板
- `components/calendar/task-bar.tsx` - 任务条组件

---

## 技术细节

### 时钟面板实现

1. **角度计算**：
   - 时针角度：`(hour % 12) * 30 + minute * 0.5 - 90`
   - 分针角度：`minute * 6 - 90`
   - 减90度是因为CSS的0度在右侧，而时钟的12点在上方

2. **点击位置转换**：
```typescript
const rect = clockRef.current.getBoundingClientRect()
const centerX = rect.width / 2
const centerY = rect.height / 2
const x = e.clientX - rect.left - centerX
const y = e.clientY - rect.top - centerY
const angle = Math.atan2(y, x) * (180 / Math.PI) + 90
const normalizedAngle = (angle + 360) % 360
```

3. **拖拽实现**：
   - 使用 `onMouseDown` 开始拖拽
   - 监听全局 `mousemove` 事件更新位置
   - 监听全局 `mouseup` 事件结束拖拽
   - 使用 `useEffect` 清理事件监听器

### 负责人优先级算法

```typescript
if (assigneeCount > 3 && currentUserAssignee) {
  // 当前用户排在第一位
  const displayAssignees = [
    currentUserAssignee,
    ...otherAssignees.slice(0, 2)
  ];
}
```

这确保了当前用户总是能看到自己在任务条上（如果自己是负责人之一）。

---

## 注意事项

1. **时间选择器的24小时制**：
   - 表盘显示12小时制（1-12）
   - 内部使用24小时制（0-23）
   - 数字输入框支持0-23小时

2. **个人事务项目的限制**：
   - 负责人只能是项目创建者（当前用户）
   - 不能添加其他负责人
   - 不能设置团队

3. **任务条显示性能**：
   - 使用 `useMemo` 缓存负责人列表计算
   - 避免在每次渲染时重新计算

4. **向后兼容**：
   - 时间选择器仍然支持手动输入
   - 原有的时间格式（HH:mm）保持不变
   - 不影响现有任务数据
