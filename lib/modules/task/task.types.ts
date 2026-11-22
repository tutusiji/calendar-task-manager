export interface TaskActor {
  userId: string
}

export interface TaskListFilters {
  userId?: string | null
  projectId?: string | null
  teamId?: string | null
  startDate?: string | null
  endDate?: string | null
  organizationId?: string | null
}

export interface CreateTaskInput {
  title: string
  description?: string | null
  startDate: string
  endDate: string
  startTime?: string | null
  endTime?: string | null
  type: 'daily' | 'meeting' | 'vacation'
  color?: string | null
  progress: number
  projectId: string
  teamId?: string | null
  assigneeIds: string[]
  recurrence?: {
    recurrenceType: 'WEEKLY' | 'MONTHLY' | 'INTERVAL_DAYS'
    intervalDays?: number | null
  } | null
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  startDate?: string
  endDate?: string
  startTime?: string | null
  endTime?: string | null
  type?: 'daily' | 'meeting' | 'vacation'
  color?: string | null
  progress?: number
  projectId?: string
  teamId?: string | null
  assigneeIds?: string[]
}

/**
 * 服务层错误：路由层根据 status 转换为统一 HTTP 响应。
 */
export class TaskServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'TaskServiceError'
  }
}

export function isTaskServiceError(error: unknown): error is TaskServiceError {
  return error instanceof TaskServiceError
}
