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

export interface Project {
  id: string
  name: string
  description?: string
  color: string
  memberIds: string[]
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
