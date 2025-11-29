export type TaskType = "daily" | "meeting" | "vacation"

export type TaskPermission = "ALL_MEMBERS" | "CREATOR_ONLY"

export type OrgMemberRole = "OWNER" | "ADMIN" | "MEMBER"

export type NotificationType = 
  | "ORG_JOIN_REQUEST"
  | "ORG_JOIN_APPROVED"
  | "ORG_JOIN_REJECTED"
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_DELETED"
  | "TASK_ASSIGNED"

export type JoinRequestStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  content: string
  metadata?: Record<string, any>
  isRead: boolean
  createdAt: Date
  readAt?: Date
}

export interface OrganizationJoinRequest {
  id: string
  organizationId: string
  applicantId: string
  status: JoinRequestStatus
  message?: string
  handledBy?: string
  handledAt?: Date
  rejectReason?: string
  createdAt: Date
  updatedAt: Date
}

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
  color?: string // 可选颜色，仅用于 daily 类型
  progress: number // 进度 0-100
  projectId: string
  teamId?: string // 任务可以选择性地关联到团队
  creatorId: string // 创建人ID
  creator?: User // 创建人信息（从 API 返回）
  assignees?: Array<{ // 负责人列表（多个）
    id: string
    userId: string
    taskId: string
    user?: User
  }>
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
  defaultTeamId?: string // 默认团队ID
  points?: number // 用户积分
}

export interface CalendarSettings {
  rememberLastProject: boolean
  lastSelectedProjectId?: string
}

export type ViewMode = "month" | "week" | "personal"
export type NavigationMode = "my-days" | "team" | "project"
export type MainViewMode = "calendar" | "list" | "stats" // 主视图模式：日历 | 清单 | 统计
export type ListGroupMode = "project" | "date" | "user" // 清单分组模式：按项目 | 按时间 | 按人头

// 任务颜色选项
export const TASK_COLORS = [
  { value: 'blue', label: '蓝色', hex: '#3b82f6', lightBg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-600' },
  { value: 'green', label: '绿色', hex: '#10b981', lightBg: 'bg-green-50', border: 'border-green-500', text: 'text-green-600' },
  { value: 'yellow', label: '黄色', hex: '#f59e0b', lightBg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-600' },
  { value: 'red', label: '红色', hex: '#ef4444', lightBg: 'bg-red-50', border: 'border-red-500', text: 'text-red-600' },
  { value: 'purple', label: '紫色', hex: '#a855f7', lightBg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-600' },
] as const
export type ListLayoutColumns = 1 | 2 | 3 | 4 // 清单布局列数
