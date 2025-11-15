/**
 * API 客户端工具
 * 封装所有后端 API 调用
 */

import type { Task, Project, User, Team } from './types'

const API_BASE_URL = '/api'

// 通用请求方法
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(error.message || `API Error: ${response.status}`)
  }

  const result = await response.json()
  
  // 如果 API 返回 { success, data } 格式，提取 data
  if (result && typeof result === 'object' && 'data' in result) {
    return result.data as T
  }
  
  return result as T
}

// ==================== 任务 API ====================

export interface TaskFilters {
  userId?: string
  projectId?: string
  teamId?: string
  startDate?: string // ISO 8601 格式
  endDate?: string   // ISO 8601 格式
}

export const taskAPI = {
  /**
   * 获取任务列表
   */
  async getAll(filters?: TaskFilters): Promise<Task[]> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
    }
    
    const query = params.toString()
    const endpoint = query ? `/tasks?${query}` : '/tasks'
    
    return fetchAPI<Task[]>(endpoint)
  },

  /**
   * 获取单个任务
   */
  async getById(id: string): Promise<Task> {
    return fetchAPI<Task>(`/tasks/${id}`)
  },

  /**
   * 创建任务
   */
  async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    return fetchAPI<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        ...task,
        startDate: task.startDate instanceof Date ? task.startDate.toISOString() : task.startDate,
        endDate: task.endDate instanceof Date ? task.endDate.toISOString() : task.endDate,
      }),
    })
  },

  /**
   * 更新任务
   */
  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const body: any = { ...updates }
    
    // 转换日期为 ISO 字符串
    if (body.startDate instanceof Date) {
      body.startDate = body.startDate.toISOString()
    }
    if (body.endDate instanceof Date) {
      body.endDate = body.endDate.toISOString()
    }
    
    return fetchAPI<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },

  /**
   * 删除任务
   */
  async delete(id: string): Promise<void> {
    return fetchAPI<void>(`/tasks/${id}`, {
      method: 'DELETE',
    })
  },
}

// ==================== 用户 API ====================

export const userAPI = {
  /**
   * 获取所有用户
   */
  async getAll(): Promise<User[]> {
    return fetchAPI<User[]>('/users')
  },

  /**
   * 获取单个用户
   */
  async getById(id: string): Promise<User> {
    return fetchAPI<User>(`/users/${id}`)
  },

  /**
   * 创建用户
   */
  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return fetchAPI<User>('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    })
  },

  /**
   * 更新用户
   */
  async update(id: string, updates: Partial<User>): Promise<User> {
    return fetchAPI<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  },

  /**
   * 删除用户
   */
  async delete(id: string): Promise<void> {
    return fetchAPI<void>(`/users/${id}`, {
      method: 'DELETE',
    })
  },
}

// ==================== 项目 API ====================

export interface ProjectWithMembers extends Project {
  members?: User[]
}

export const projectAPI = {
  /**
   * 获取所有项目
   */
  async getAll(): Promise<ProjectWithMembers[]> {
    return fetchAPI<ProjectWithMembers[]>('/projects')
  },

  /**
   * 获取单个项目
   */
  async getById(id: string): Promise<ProjectWithMembers> {
    return fetchAPI<ProjectWithMembers>(`/projects/${id}`)
  },

  /**
   * 创建项目
   */
  async create(
    project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> & { memberIds: string[] }
  ): Promise<ProjectWithMembers> {
    return fetchAPI<ProjectWithMembers>('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    })
  },

  /**
   * 更新项目
   */
  async update(
    id: string,
    updates: Partial<Project> & { memberIds?: string[] }
  ): Promise<ProjectWithMembers> {
    return fetchAPI<ProjectWithMembers>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  },

  /**
   * 删除项目
   */
  async delete(id: string): Promise<void> {
    return fetchAPI<void>(`/projects/${id}`, {
      method: 'DELETE',
    })
  },
}

// ==================== 团队 API ====================

export interface TeamWithMembers extends Team {
  members?: User[]
}

export const teamAPI = {
  /**
   * 获取所有团队
   */
  async getAll(): Promise<TeamWithMembers[]> {
    return fetchAPI<TeamWithMembers[]>('/teams')
  },

  /**
   * 获取单个团队
   */
  async getById(id: string): Promise<TeamWithMembers> {
    return fetchAPI<TeamWithMembers>(`/teams/${id}`)
  },

  /**
   * 创建团队
   */
  async create(
    team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'> & { memberIds: string[] }
  ): Promise<TeamWithMembers> {
    return fetchAPI<TeamWithMembers>('/teams', {
      method: 'POST',
      body: JSON.stringify(team),
    })
  },

  /**
   * 更新团队
   */
  async update(
    id: string,
    updates: Partial<Team> & { memberIds?: string[] }
  ): Promise<TeamWithMembers> {
    return fetchAPI<TeamWithMembers>(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  },

  /**
   * 删除团队
   */
  async delete(id: string): Promise<void> {
    return fetchAPI<void>(`/teams/${id}`, {
      method: 'DELETE',
    })
  },
}

// ==================== 认证 API ====================

export interface LoginCredentials {
  username: string // 改用 username
  password: string
}

export interface RegisterData {
  username: string // 改用 username
  name: string
  email: string
  password: string
  confirmPassword: string
}

export const authAPI = {
  /**
   * 用户登录
   */
  async login(credentials: LoginCredentials): Promise<User> {
    return fetchAPI<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  /**
   * 用户注册
   */
  async register(data: RegisterData): Promise<User> {
    return fetchAPI<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// ==================== 辅助函数 ====================

/**
 * 处理 API 错误
 */
export function handleAPIError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return '未知错误'
}

/**
 * 格式化日期为 ISO 字符串
 */
export function formatDateForAPI(date: Date | string): string {
  if (date instanceof Date) {
    return date.toISOString()
  }
  return date
}

/**
 * 解析 API 返回的日期字符串
 */
export function parseDateFromAPI(dateString: string): Date {
  return new Date(dateString)
}
