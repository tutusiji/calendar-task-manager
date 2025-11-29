# 🐂🐴 OxHorse Planner - 日历任务管理系统

> Every day so happy

一个功能完善的现代化日历任务管理系统，支持个人、团队和项目三种视图模式，具备完整的任务管理、团队协作、拖拽调整等功能。基于 Next.js 14+ 和 React 19+ 构建，采用 TypeScript 提供类型安全保障。

## ✨ 核心特性

### 📅 多视图日历系统
- **月视图 (Month View)**：完整展示整月任务，支持跨天任务智能布局
- **周视图 (Week View)**：
  - **个人周视图**：单行显示个人任务，自动计算行高
  - **团队周视图**：多行显示团队成员任务，每人一行
- **智能导航**：My Days（个人）/ My Teams（团队）/ My Projects（项目）三级导航
- **实时切换**：视图模式和导航模式自由切换，数据实时过滤

### 🎯 任务管理
- **拖拽创建**：在日历上拖拽选择日期范围快速创建任务
- **拖拽移动**：直接拖拽任务条调整日期，实时预览无占位符
- **任务类型**：
  - 📋 日常任务 (Daily) - 蓝色
  - 📞 会议 (Meeting) - 黄色
  - 🏖️ 休假 (Vacation) - 红色
- **跨天任务**：自动计算跨度，支持周截断显示
- **任务详情**：
  - 标题、描述、时间范围
  - 开始/结束时间
  - 负责人选择（带头像）
  - 项目归属
- **视觉效果**：
  - 拖拽时显示重阴影效果
  - 禁用其他任务交互防止干扰
  - 松开鼠标不触发详情面板

### 👥 团队协作
- **团队管理**：
  - 创建团队，设置名称、描述、颜色
  - 多选成员添加到团队
  - 查看团队所有成员的任务
- **项目管理**：
  - 创建项目，关联团队（可选）
  - 多选项目成员
  - 查看项目所有成员的任务
- **权限可见性**：
  - My Days：仅显示个人任务
  - Team 模式：显示团队所有成员任务
  - Project 模式：显示项目所有成员任务
- **成员信息**：
  - 月视图任务条显示负责人头像+姓名
  - 周视图通过行区分成员
  - DiceBear API 生成个性化头像

### 🎨 用户界面
- **侧边栏导航**：
  - 品牌 Logo 和标语
  - 三级导航菜单（可折叠）
  - 小日历（底部固定）
- **顶部操作栏**：
  - 月/周视图切换
  - 用户信息下拉菜单
- **操作菜单**：
  - 团队/项目右侧三点菜单
  - 编辑/删除选项
  - 删除二次确认对话框
- **响应式设计**：自适应布局
- **暗色模式**：支持系统主题
- **流畅动画**：Tailwind CSS 过渡效果

### 🔧 高级功能
- **智能布局算法**：任务自动分配轨道避免重叠
- **周截断处理**：跨周任务在周一重新显示
- **状态持久化**：视图偏好保存到 localStorage
- **颜色选择器**：8 种预设颜色供团队/项目使用
- **用户选择器**：
  - 单选模式（任务负责人）
  - 多选模式（团队/项目成员）
  - 显示头像、姓名、邮箱

### 🔑 关键特性
- 团队和项目是独立的两个维度，没有归属关系
- 用户可以同时属于多个团队和多个项目
- 任务同时关联团队和项目（两个独立的字段）
- 点击团队时：显示该团队所有成员在各自项目中的任务
- 点击项目时：显示该项目所有成员的任务，且不受团队限制，这些成员可以来自不同团队
- 编辑任务时：团队和项目可以独立选择，互不影响


## 🛠️ 工具函数

### 剪贴板工具 (`lib/utils/clipboard.ts`)

提供了统一的复制到剪贴板功能，支持现代浏览器和旧版浏览器：

```typescript
import { copyToClipboard } from "@/lib/utils/clipboard"

// 使用示例
const success = await copyToClipboard("要复制的文本")
if (success) {
  console.log("复制成功")
} else {
  console.log("复制失败")
}
```

**特性**：
- 优先使用现代 Clipboard API
- 自动降级到 `document.execCommand` 兼容旧浏览器
- 返回 Promise<boolean> 表示复制是否成功
- 统一的错误处理

## 🏗️ 技术栈

### 核心框架
- **Next.js 16.0.1** - React 全栈框架，支持 App Router 和 Turbopack
- **React 19.0.2** - 最新 React 版本，支持并发特性
- **TypeScript 5** - 类型安全的 JavaScript 超集

### 状态管理
- **Zustand 5.0.3** - 轻量级状态管理，基于 Hooks
- **Zustand Middleware** - persist 中间件实现状态持久化
- **Immer** - 内置支持不可变更新

### UI 框架和组件
- **Tailwind CSS 4.1.16** - 实用优先的 CSS 框架
- **Radix UI** - 无样式的可访问组件库
  - `@radix-ui/react-dialog` - 对话框
  - `@radix-ui/react-dropdown-menu` - 下拉菜单
  - `@radix-ui/react-alert-dialog` - 警告对话框
  - `@radix-ui/react-popover` - 弹出框
  - `@radix-ui/react-select` - 选择器
  - `@radix-ui/react-avatar` - 头像组件
  - 等等...
- **Lucide React 0.468.0** - 现代化图标库
- **class-variance-authority** - 组件变体管理
- **clsx & tailwind-merge** - 类名合并工具

### 工具库
- **date-fns 4.1.0** - 现代化日期处理库
- **next-themes 0.4.4** - Next.js 主题管理

### 开发工具
- **ESLint** - 代码检查
- **TypeScript ESLint** - TypeScript 代码规范
- **PostCSS** - CSS 后处理器

## 📁 项目结构

```
calendar-task-manager/
├── app/                                # Next.js App Router
│   ├── layout.tsx                     # 根布局，主题提供者
│   ├── page.tsx                       # 主页面，布局和视图路由
│   └── globals.css                    # 全局样式和 Tailwind 指令
│
├── components/                         # React 组件库
│   ├── calendar/                      # 日历核心组件
│   │   ├── calendar-header.tsx       # 日历头部（月份导航）
│   │   ├── month-view.tsx            # 月视图容器
│   │   ├── week-view.tsx             # 团队周视图（多行）
│   │   ├── personal-week-view.tsx    # 个人周视图（单行）
│   │   ├── calendar-day.tsx          # 单个日期格子
│   │   ├── task-bar.tsx              # 任务条（支持拖拽、跨天）
│   │   ├── team-member-row.tsx       # 周视图团队成员行
│   │   └── view-toggle.tsx           # 月/周视图切换按钮
│   │
│   ├── sidebar/                       # 侧边栏组件
│   │   ├── navigation-menu.tsx       # 三级导航菜单
│   │   ├── mini-calendar.tsx         # 小日历
│   │   ├── team-dialog.tsx           # 团队创建/编辑对话框
│   │   ├── project-dialog.tsx        # 项目创建/编辑对话框
│   │
│   ├── task/                          # 任务管理组件
│   │   ├── task-detail-panel.tsx     # 任务创建面板
│   │   ├── task-edit-panel.tsx       # 任务编辑面板
│   │   ├── user-selector.tsx         # 单选用户组件
│   │   └── user-multi-selector.tsx   # 多选用户组件
│   │
│   ├── ui/                            # 基础 UI 组件（shadcn/ui）
│   │   ├── button.tsx                # 按钮
│   │   ├── dialog.tsx                # 对话框
│   │   ├── dropdown-menu.tsx         # 下拉菜单
│   │   ├── alert-dialog.tsx          # 警告对话框
│   │   ├── popover.tsx               # 弹出框
│   │   ├── select.tsx                # 选择器
│   │   ├── input.tsx                 # 输入框
│   │   ├── textarea.tsx              # 文本域
│   │   ├── label.tsx                 # 标签
│   │   ├── avatar.tsx                # 头像
│   │   ├── badge.tsx                 # 徽章
│   │   ├── checkbox.tsx              # 复选框
│   │   ├── calendar.tsx              # 日历选择器
│   │   └── ...                       # 其他 UI 组件
│   │
│   ├── theme-provider.tsx            # 主题提供者组件
│   └── user-menu.tsx                 # 用户下拉菜单
│
├── lib/                               # 工具库和业务逻辑
│   ├── store/
│   │   └── calendar-store.ts         # Zustand 全局状态管理
│   │
│   ├── utils/
│   │   ├── date-utils.ts             # 日期处理工具函数
│   │   └── task-layout.ts            # 任务布局算法
│   │
│   ├── types.ts                       # TypeScript 类型定义
│   ├── mock-data-new.ts              # 模拟数据（用户、团队、项目、任务）
│   ├── mock-data.ts                  # (旧版模拟数据)
│   └── utils.ts                       # 通用工具函数（cn 等）
│
├── hooks/                             # 自定义 React Hooks
│   ├── use-mobile.ts                 # 移动端检测
│   └── use-toast.ts                  # Toast 通知
│
├── public/                            # 静态资源
│   └── logo.png                      # Logo 图片
│
├── styles/                            # 样式文件
│   └── globals.css                   # (可能重复)
│
├── components.json                    # shadcn/ui 配置
├── next.config.mjs                   # Next.js 配置
├── tailwind.config.js                # Tailwind CSS 配置
├── tsconfig.json                     # TypeScript 配置
├── postcss.config.mjs                # PostCSS 配置
├── package.json                      # 项目依赖和脚本
├── pnpm-lock.yaml                    # pnpm 锁定文件
└── README.md                         # 项目文档
```

## 核心架构设计

### 1. 状态管理架构

使用 Zustand 进行全局状态管理，主要包括：

```typescript
interface CalendarStore {
  // 数据
  tasks: Task[]              // 任务列表
  projects: Project[]        // 项目列表
  users: User[]             // 用户列表
  currentUser: User         // 当前用户
  
  // 视图状态
  viewMode: "personal" | "team"  // 视图模式
  currentDate: Date              // 当前日期
  selectedDate: Date | null      // 选中的日期
  
  // 对话框状态
  taskCreation: { isOpen: boolean, startDate: Date | null, endDate: Date | null }
  taskEdit: { isOpen: boolean, task: Task | null }
  
  // 操作方法
  addTask, updateTask, deleteTask
  addProject, updateProject, deleteProject
  openTaskCreation, closeTaskCreation
  openTaskEdit, closeTaskEdit
}
```

### 2. 任务布局算法

**栅格化布局系统**：确保任务条不重叠

```typescript
// 为每周创建二维栅格 grid[row][col]
// 1. 获取该周的所有任务
// 2. 按开始日期排序
// 3. 为每个任务找到第一个空闲行
// 4. 标记该行在任务时间范围内的所有格子为已占用
```

**关键特性**：
- 每个任务在其时间区间内独占一行空间
- 跨天任务只在起始日期显示一次
- 通过 `span` 参数控制任务条宽度
- 使用绝对定位和动态宽度实现跨格子显示

### 3. 组件通信模式

```
MonthView (容器组件)
  ├── 计算 taskLayout (任务布局映射)
  ├── 管理 expandedDate (展开状态)
  └── 渲染 CalendarDay 组件
      ├── 接收 taskLayout 和位置信息
      ├── 计算该格子的任务
      ├── 渲染 TaskBar 组件
      └── 处理双击创建事项
```

### 4. 数据流

```
用户操作 → 事件处理器 → Zustand Store → 组件重新渲染
                              ↓
                         持久化存储 (未来)
```

## 使用方法

### 安装依赖

```bash
# 使用 pnpm (推荐)
pnpm install

# 或使用 npm
npm install
```

### 启动开发服务器

```bash
pnpm dev
# 或
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
pnpm build
pnpm start
```

### 代码检查

```bash
pnpm lint
```

## 主要功能使用指南

### 创建任务

1. **双击日历格子**：在任意日期格子上双击
2. 在弹出的对话框中填写任务信息：
   - 任务标题（必填）
   - 开始和结束日期
   - 开始和结束时间（可选）
   - 任务类型（日常/会议/休假）
   - 关联项目
   - 任务描述（可选）
3. 点击"创建任务"按钮

### 编辑任务

1. **点击任务条**：点击日历上的任何任务条
2. 在弹出的编辑面板中修改信息
3. 点击"保存更改"或"删除任务"

### 管理项目

1. **创建项目**：
   - 点击侧边栏"项目管理"右侧的 + 按钮
   - 填写项目名称、描述、选择颜色
   - 添加项目成员
   - 点击"创建项目"

2. **编辑项目**：
   - 鼠标悬停在项目上
   - 点击右侧的"更多"图标
   - 选择"编辑"
   - 修改信息后保存

3. **删除项目**：
   - 鼠标悬停在项目上
   - 点击右侧的"更多"图标
   - 选择"删除"
   - 在确认对话框中点击"确认删除"

### 查看任务详情

1. **展开某一天的所有任务**：
   - 当某一天有跨天任务穿过时，会显示展开图标
   - 点击展开图标查看该日期的所有任务
   - 包括从该日期开始的任务和从其他日期延伸过来的任务

## 自定义配置

### 修改主题颜色

编辑 `app/globals.css` 中的 CSS 变量：

```css
:root {
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... 其他颜色变量 */
}
```

### 添加新的任务类型

1. 在 `lib/types.ts` 中添加新类型：
```typescript
export type TaskType = "daily" | "meeting" | "vacation" | "your-new-type"
```

2. 在 `components/calendar/task-bar.tsx` 中添加颜色：
```typescript
const getTaskColor = () => {
  switch (task.type) {
    case "your-new-type":
      return "bg-purple-500"
    // ...
  }
}
```

### 修改最大显示行数

在 `components/calendar/calendar-day.tsx` 中修改：
```typescript
const MAX_VISIBLE_ROWS = 3  // 改为你想要的数字
```

## 性能优化

- ✅ 使用 `useMemo` 缓存任务布局计算
- ✅ 使用 `React.memo` 优化组件渲染
- ✅ Turbopack 加速开发构建
- ✅ 按需加载对话框组件
- ✅ CSS Grid 实现高效布局

## 浏览器支持

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)

## 未来计划

- [ ] 数据持久化（LocalStorage/数据库）
- [ ] 周视图和日视图
- [ ] 任务拖拽调整
- [ ] 任务搜索和筛选
- [ ] 导出日历（iCal 格式）
- [ ] 多语言支持
- [ ] 移动端优化
- [ ] 任务提醒通知
- [ ] 团队协作功能

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue。

---

**Built with ❤️ using Next.js and React**


npx prisma studio

