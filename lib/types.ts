export type TaskType = "daily" | "meeting" | "vacation"

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
  userId: string
}

export interface Team {
  id: string
  name: string
  description?: string
  color: string
  memberIds: string[]
  creatorId: string // 创建者ID
  createdAt: Date
}

export interface Project {
  id: string
  name: string
  description?: string
  color: string
  memberIds: string[]
  teamId?: string // 项目可以属于某个团队
  creatorId: string // 创建者ID
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
