export type TaskType = "daily" | "meeting" | "vacation"

export type TaskPermission = "ALL_MEMBERS" | "CREATOR_ONLY"

export type OrgMemberRole = "OWNER" | "ADMIN" | "MEMBER"

export interface Organization {
  id: string
  name: string
  description?: string
  isVerified: boolean
  creatorId: string
  memberIds: string[]
  createdAt: Date
}

export interface OrganizationMember {
  id: string
  userId: string
  organizationId: string
  role: OrgMemberRole
  createdAt: Date
}

export interface Task {
  id: string
  title: string
  description?: string
  startDate: Date
  endDate: Date
  startTime?: string
  endTime?: string
  type: TaskType
  projectId: string
  teamId?: string // 任务可以选择性地关联到团队
  userId: string
}

export interface Team {
  id: string
  name: string
  description?: string
  color: string
  organizationId: string
  memberIds: string[]
  creatorId: string // 创建者ID
  taskPermission: TaskPermission // 任务权限
  createdAt: Date
}

export interface Project {
  id: string
  name: string
  description?: string
  color: string
  organizationId: string
  memberIds: string[]
  creatorId: string // 创建者ID
  taskPermission: TaskPermission // 任务权限
  createdAt: Date
}

export interface User {
  id: string
  username: string // 用户名，用于登录
  name: string // 显示名称
  avatar: string
  email: string // 邮箱（个人资料）
  gender?: string // 性别
  role?: string // 职业
  isAdmin?: boolean // 是否为超级管理员
  currentOrganizationId?: string // 当前选择的组织ID
}

export interface CalendarSettings {
  rememberLastProject: boolean
  lastSelectedProjectId?: string
}

export type ViewMode = "month" | "week" | "personal"
export type NavigationMode = "my-days" | "team" | "project"
export type MainViewMode = "calendar" | "list" | "stats" // 主视图模式：日历 | 清单 | 统计
export type ListGroupMode = "project" | "date" | "user" // 清单分组模式：按项目 | 按时间 | 按人头
export type ListLayoutColumns = 1 | 2 | 3 | 4 // 清单布局列数
