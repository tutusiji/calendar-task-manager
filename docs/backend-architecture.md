# 日历任务管理项目后端架构设计

## 技术选型

- **后端框架**：Next.js API Routes
- **ORM**：Prisma
- **数据库**：PostgreSQL（可选 SQLite 作为本地开发）
- **语言**：TypeScript

## 架构优势

- 与前端一体化，类型安全，开发体验极佳
- 支持 Serverless 部署，易于扩展
- 关系型数据结构，适合团队/项目/任务复杂查询
- 日期时间处理能力强，适合日历类应用

## 目录结构建议

```
app/
  api/
    tasks/
      route.ts          # GET /api/tasks (列表查询)
      [id]/route.ts     # GET/PUT/DELETE /api/tasks/:id
    projects/
      route.ts
    teams/
      route.ts
    users/
      route.ts
prisma/
  schema.prisma         # 数据模型定义
  migrations/           # 迁移文件
lib/
  prisma.ts            # Prisma Client 实例
```

## 数据模型设计（Prisma Schema）

```prisma
model User {
  id        String    @id @default(cuid())
  name      String
  email     String    @unique
  avatar    String?
  tasks     Task[]
  teamMembers TeamMember[]
  projectMembers ProjectMember[]
  createdAt DateTime  @default(now())
}

model Team {
  id          String   @id @default(cuid())
  name        String
  color       String
  description String?
  members     TeamMember[]
  projects    Project[]
  createdAt   DateTime @default(now())
}

model Project {
  id          String   @id @default(cuid())
  name        String
  color       String
  description String?
  members     ProjectMember[]
  teamId      String?
  team        Team?    @relation(fields: [teamId], references: [id])
  tasks       Task[]
  createdAt   DateTime @default(now())
}

model Task {
  id          String   @id @default(cuid())
  title       String
  description String?
  startDate   DateTime
  endDate     DateTime
  startTime   String?
  endTime     String?
  type        TaskType
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])
  createdAt   DateTime @default(now())
  @@index([startDate, endDate])
  @@index([userId])
  @@index([projectId])
}

enum TaskType {
  daily
  meeting
  vacation
}

model TeamMember {
  id      String @id @default(cuid())
  userId  String
  teamId  String
  user    User   @relation(fields: [userId], references: [id])
  team    Team   @relation(fields: [teamId], references: [id])
}

model ProjectMember {
  id        String @id @default(cuid())
  userId    String
  projectId String
  user      User    @relation(fields: [userId], references: [id])
  project   Project @relation(fields: [projectId], references: [id])
}
```

## API 路由设计

- `GET /api/tasks`：获取任务列表，支持筛选、分页、分组
- `POST /api/tasks`：新建任务
- `GET /api/tasks/:id`：获取单个任务详情
- `PUT /api/tasks/:id`：更新任务
- `DELETE /api/tasks/:id`：删除任务
- `GET /api/projects`、`GET /api/teams`、`GET /api/users`：获取项目、团队、用户列表

## 推荐数据库

- **PostgreSQL**：强大、免费、云服务多、日期处理优秀
- **开发阶段可用 SQLite**：本地零配置

## 部署建议

- Vercel/Netlify 支持 Next.js API Routes Serverless 部署
- PostgreSQL 可选 Supabase、Railway、Neon 免费云服务

## 选型理由

- 类型安全，前后端统一 TypeScript
- 关系型数据结构适合日历/任务/团队/项目
- 查询灵活，性能优异
- 易于维护和扩展

---
如需详细 API 实现、数据库迁移、部署脚本等，可随时补充！
