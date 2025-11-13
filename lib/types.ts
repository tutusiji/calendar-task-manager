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
  createdAt: Date
}

export interface Project {
  id: string
  name: string
  description?: string
  color: string
  memberIds: string[]
  teamId?: string // 项目可以属于某个团队
  createdAt: Date
}

export interface User {
  id: string
  name: string
  avatar: string
  email: string
}

export interface CalendarSettings {
  rememberLastProject: boolean
  lastSelectedProjectId?: string
}

export type ViewMode = "month" | "week" | "personal"
export type NavigationMode = "my-days" | "team" | "project"
