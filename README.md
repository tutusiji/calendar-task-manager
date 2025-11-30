# 🐂🐴 OxHorse Planner - 日历任务管理系统

> Every day so happy

一个功能完善的现代化日历任务管理系统，支持个人、团队和项目三种视图模式，具备完整的任务管理、团队协作、拖拽调整等功能。基于 Next.js 16+ 和 React 19+ 构建，采用 TypeScript 提供类型安全保障。

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
- **进度调整**：直接在任务条上拖拽调整进度（0-100%），支持乐观更新
- **任务类型**：
  - 📋 日常任务 (Daily) - 蓝色
  - 📞 会议 (Meeting) - 黄色
  - 🏖️ 休假 (Vacation) - 红色
- **跨天任务**：自动计算跨度，支持周截断显示
- **任务详情**：
  - 标题、描述、时间范围
  - 开始/结束时间
  - 负责人选择（带头像，支持搜索）
  - 项目归属
  - 进度滑块

### 👥 团队协作
- **团队管理**：
  - 创建团队，设置名称、描述、颜色
  - 多选成员添加到团队
  - 查看团队所有成员的任务
  - **默认团队**：用户可设置默认团队，登录后自动标记
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
  - **图钉图标**：标记默认团队
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
  - **团队快捷选择**：一键选中团队所有成员
  - 显示头像、姓名、邮箱
  - 支持搜索和清除

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
- **Lucide React 0.468.0** - 现代化图标库
- **class-variance-authority** - 组件变体管理
- **clsx & tailwind-merge** - 类名合并工具

### 后端与数据库
- **PostgreSQL** - 关系型数据库
- **Prisma** - 下一代 ORM
- **Docker** - 容器化部署

## 🚀 部署指南

本项目支持多种部署方式，推荐使用 Docker 进行部署。

### 方式一：Docker 离线部署（推荐）

详细步骤请参考 [OFFLINE_DEPLOYMENT_GUIDE.md](./OFFLINE_DEPLOYMENT_GUIDE.md)。

简要流程：
1. **本地构建**：`docker build -t calendar-task-manager:2025-11-29 .`
2. **导出镜像**：`docker save -o calendar-task-manager_2025-11-29.tar calendar-task-manager:2025-11-29`
3. **上传服务器**：使用 SCP 或 FTP 上传 tar 文件
4. **导入镜像**：`docker load -i calendar-task-manager_2025-11-29.tar`
5. **数据库迁移**：执行 SQL 脚本更新数据库结构
6. **启动服务**：使用 `docker-compose up -d`

### 方式二：开发环境启动

```bash
# 安装依赖
pnpm install

# 启动数据库（如果本地没有）
docker-compose up -d postgres

# 运行迁移
npx prisma migrate dev

# 启动开发服务器
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📁 项目结构

```
calendar-task-manager/
├── app/                                # Next.js App Router
│   ├── api/                           # API 路由
│   ├── layout.tsx                     # 根布局
│   └── page.tsx                       # 主页面
│
├── components/                         # React 组件库
│   ├── calendar/                      # 日历核心组件 (TaskBar, MonthView, WeekView)
│   ├── sidebar/                       # 侧边栏组件 (Navigation, TeamDialog)
│   ├── task/                          # 任务管理组件 (TaskDetail, UserSelector)
│   └── ui/                            # 基础 UI 组件 (shadcn/ui)
│
├── lib/                               # 工具库和业务逻辑
│   ├── store/                         # Zustand 全局状态管理
│   ├── utils/                         # 工具函数
│   └── types.ts                       # TypeScript 类型定义
│
├── prisma/                            # 数据库模型和迁移
│   ├── schema.prisma                  # 数据模型定义
│   └── migrations/                    # 迁移文件
│
├── public/                            # 静态资源
├── docker-compose.yml                 # Docker 编排文件
└── README.md                          # 项目文档
```

## 📝 许可证

MIT License

---

**Built with ❤️ using Next.js and React**
