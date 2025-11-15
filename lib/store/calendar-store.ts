"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Task, Project, User, CalendarSettings, Team, ViewMode, NavigationMode, MainViewMode, ListGroupMode, ListLayoutColumns } from "../types"
import { taskAPI, projectAPI, userAPI, teamAPI, handleAPIError } from "../api-client"
import { showToast } from "../toast"
import { useLoadingDelay } from "../../hooks/use-loading-delay"
import { canManageTaskInProject, canManageTaskInTeam, getPermissionDeniedMessage } from "../utils/permission-utils"

interface CalendarStore {
  // Data
  tasks: Task[]
  projects: Project[]
  users: User[]
  teams: Team[]
  currentUser: User | null

  // Loading states
  isLoadingTasks: boolean
  isLoadingProjects: boolean
  isLoadingUsers: boolean
  isLoadingTeams: boolean
  
  // Error states
  error: string | null

  // View state
  mainViewMode: MainViewMode // "calendar" | "list" | "stats" 主视图模式
  listGroupMode: ListGroupMode // "project" | "date" | "user" 清单分组模式
  listLayoutColumns: ListLayoutColumns // 清单布局列数: 1 | 2 | 3 | 4
  viewMode: ViewMode // "month" | "week"
  navigationMode: NavigationMode // "my-days" | "team" | "project"
  selectedTeamId: string | null
  selectedProjectId: string | null
  currentDate: Date
  selectedDate: Date | null
  selectedProjectIds: string[] // 选中的项目ID列表，用于过滤
  hideWeekends: boolean // 是否隐藏周末（周六日）
  taskBarSize: "compact" | "comfortable" // 任务条大小：紧凑型 | 宽松型

  dragState: {
    isCreating: boolean
    startDate: Date | null
    endDate: Date | null
    startCell: { x: number; y: number } | null
    userId: string | null // 拖拽创建时的用户ID，用于限制团队视图中不跨行拖拽
  }

  // 拖拽移动任务的状态
  dragMoveState: {
    isMoving: boolean
    task: Task | null
    startDate: Date | null // 拖拽开始时的日期
    offsetDays: number // 移动的天数偏移
  }

  taskCreation: {
    isOpen: boolean
    startDate: Date | null
    endDate: Date | null
    userId: string | null // 创建任务时指定的用户ID
    projectId: string | null // 默认选中的项目ID
    teamId: string | null // 默认选中的团队ID
  }

  taskEdit: {
    isOpen: boolean
    task: Task | null
  }

  // Settings
  settings: CalendarSettings

  // Data Loading Actions
  fetchTasks: (filters?: { userId?: string; projectId?: string; teamId?: string; startDate?: Date; endDate?: Date }) => Promise<void>
  fetchProjects: () => Promise<void>
  fetchUsers: () => Promise<void>
  fetchTeams: () => Promise<void>
  fetchAllData: () => Promise<void>
  setCurrentUserFromStorage: () => void
  setCurrentUser: (user: User) => void

  // Actions
  addTask: (task: Omit<Task, 'id'>) => Promise<void>
  updateTask: (id: string, task: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>

  addTeam: (team: Omit<Team, 'id' | 'createdAt'> & { memberIds: string[] }) => Promise<void>
  updateTeam: (id: string, team: Partial<Team> & { memberIds?: string[] }) => Promise<void>
  deleteTeam: (id: string) => Promise<void>

  addProject: (project: Omit<Project, 'id' | 'createdAt'> & { memberIds: string[] }) => Promise<void>
  updateProject: (id: string, project: Partial<Project> & { memberIds?: string[] }) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  leaveProject: (id: string) => Promise<void>
  leaveTeam: (id: string) => Promise<void>

  setMainViewMode: (mode: MainViewMode) => void // 设置主视图模式
  setListGroupMode: (mode: ListGroupMode) => void // 设置清单分组模式
  setListLayoutColumns: (columns: ListLayoutColumns) => void // 设置清单布局列数
  setViewMode: (mode: ViewMode) => void
  setNavigationMode: (mode: NavigationMode) => void
  setSelectedTeamId: (id: string | null) => Promise<void>
  setSelectedProjectId: (id: string | null) => Promise<void>
  setCurrentDate: (date: Date) => void
  setSelectedDate: (date: Date | null) => void
  toggleWeekends: () => void // 切换周末显示/隐藏
  setTaskBarSize: (size: "compact" | "comfortable") => void // 设置任务条大小
  setError: (error: string | null) => void

  // 项目过滤
  toggleProjectFilter: (projectId: string) => void
  selectAllProjects: () => void
  clearProjectFilter: () => void

  startDragCreate: (date: Date, cell: { x: number; y: number }, userId?: string) => void
  updateDragCreate: (date: Date) => void
  endDragCreate: () => { startDate: Date; endDate: Date } | null
  cancelDragCreate: () => void

  // 拖拽移动任务的方法
  startDragMove: (task: Task, date: Date) => void
  updateDragMove: (date: Date) => void
  endDragMove: () => void
  cancelDragMove: () => void

  openTaskCreation: (startDate: Date, endDate: Date, userId?: string, projectId?: string, teamId?: string) => void
  closeTaskCreation: () => void

  openTaskEdit: (task: Task) => void
  closeTaskEdit: () => void

  openTeamCreation: () => void
  openProjectCreation: () => void

  updateSettings: (settings: Partial<CalendarSettings>) => void

  // Helpers
  getTasksForDate: (date: Date) => Task[]
  getTasksForDateRange: (startDate: Date, endDate: Date) => Task[]
  getProjectById: (id: string) => Project | undefined
  getTeamById: (id: string) => Team | undefined
  getUserById: (id: string) => User | undefined
}

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set, get) => ({
      // Initial data
      tasks: [],
      projects: [],
      users: [],
      teams: [],
      currentUser: null,

      // Loading states
      isLoadingTasks: false,
      isLoadingProjects: false,
      isLoadingUsers: false,
      isLoadingTeams: false,

      // Error state
      error: null,

      // Initial view state
      mainViewMode: "calendar", // 默认日历视图
      listGroupMode: "date", // 默认按时间分组
      listLayoutColumns: 2, // 默认2列布局
      viewMode: "month",
      navigationMode: "my-days",
      selectedTeamId: null,
      selectedProjectId: null,
      currentDate: new Date(),
      selectedDate: null,
      selectedProjectIds: [], // 初始为空，等项目加载后设置
      hideWeekends: false, // 默认显示周末
      taskBarSize: "compact", // 默认紧凑型

      dragState: {
        isCreating: false,
        startDate: null,
        endDate: null,
        startCell: null,
        userId: null,
      },

      dragMoveState: {
        isMoving: false,
        task: null,
        startDate: null,
        offsetDays: 0,
      },

      taskCreation: {
        isOpen: false,
        startDate: null,
        endDate: null,
        userId: null,
        projectId: null,
        teamId: null,
      },

      taskEdit: {
        isOpen: false,
        task: null,
      },

      // Initial settings
      settings: {
        rememberLastProject: true,
        lastSelectedProjectId: "personal",
      },

  // Data Loading Actions
  setCurrentUserFromStorage: () => {
    if (typeof window !== 'undefined') {
      const currentUserStr = localStorage.getItem('currentUser')
      if (currentUserStr) {
        try {
          const user = JSON.parse(currentUserStr)
          set({ currentUser: user })
        } catch (e) {
          console.error('Failed to parse current user:', e)
        }
      }
    }
  },

  setCurrentUser: (user: User) => {
    set({ currentUser: user })
  },

  fetchTasks: async (filters) => {
    const loadingDelay = useLoadingDelay()
    loadingDelay.start()
    set({ isLoadingTasks: true, error: null })
    
    try {
      const apiFilters: any = {}
      if (filters) {
        if (filters.userId) apiFilters.userId = filters.userId
        if (filters.projectId) apiFilters.projectId = filters.projectId
        if (filters.teamId) apiFilters.teamId = filters.teamId
        if (filters.startDate) apiFilters.startDate = filters.startDate.toISOString()
        if (filters.endDate) apiFilters.endDate = filters.endDate.toISOString()
      }

      const tasksData = await taskAPI.getAll(apiFilters)
      // 转换日期字符串为 Date 对象
      const tasks = tasksData.map((task: any) => ({
        ...task,
        startDate: new Date(task.startDate),
        endDate: new Date(task.endDate),
      }))
      
      // 先更新数据
      set({ tasks })
      
      // 确保 loading 至少显示指定时间
      await loadingDelay.waitForMinDuration()
      
      set({ isLoadingTasks: false })
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg })
      
      // 确保 loading 至少显示指定时间
      await loadingDelay.waitForMinDuration()
      
      set({ isLoadingTasks: false })
      showToast.error('获取任务失败', errorMsg)
    }
  },

  fetchProjects: async () => {
    const loadingDelay = useLoadingDelay()
    loadingDelay.start()
    set({ isLoadingProjects: true, error: null })
    
    try {
      const projectsData = await projectAPI.getAll()
      // 转换数据格式
      const projects = projectsData.map((project: any) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        color: project.color,
        teamId: project.teamId,
        organizationId: project.organizationId,
        creatorId: project.creatorId, // 添加创建者ID
        taskPermission: project.taskPermission || "ALL_MEMBERS", // 任务权限
        // API 现在直接返回 memberIds 数组
        memberIds: project.memberIds || [],
        createdAt: new Date(project.createdAt),
      }))
      
      // 默认选中所有项目
      const selectedProjectIds = projects.map((p: Project) => p.id)
      
      // 先更新数据
      set({ projects, selectedProjectIds })
      
      // 确保 loading 至少显示指定时间
      await loadingDelay.waitForMinDuration()
      
      set({ isLoadingProjects: false })
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg })
      
      // 确保 loading 至少显示指定时间
      await loadingDelay.waitForMinDuration()
      
      set({ isLoadingProjects: false })
      showToast.error('获取项目失败', errorMsg)
    }
  },

  fetchUsers: async () => {
    const loadingDelay = useLoadingDelay()
    loadingDelay.start()
    set({ isLoadingUsers: true, error: null })
    
    try {
      const users = await userAPI.getAll()
      
      // 先更新数据
      set({ users })
      
      // 确保 loading 至少显示指定时间
      await loadingDelay.waitForMinDuration()
      
      set({ isLoadingUsers: false })
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg })
      
      // 确保 loading 至少显示指定时间
      await loadingDelay.waitForMinDuration()
      
      set({ isLoadingUsers: false })
      showToast.error('获取用户失败', errorMsg)
    }
  },

  fetchTeams: async () => {
    const loadingDelay = useLoadingDelay()
    loadingDelay.start()
    set({ isLoadingTeams: true, error: null })
    
    try {
      const teamsData = await teamAPI.getAll()
      // 转换数据格式
      const teams = teamsData.map((team: any) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        color: team.color,
        organizationId: team.organizationId,
        creatorId: team.creatorId, // 添加创建者ID
        taskPermission: team.taskPermission || "ALL_MEMBERS", // 任务权限
        // API 现在直接返回 memberIds 数组
        memberIds: team.memberIds || [],
        createdAt: new Date(team.createdAt),
      }))
      
      // 先更新数据
      set({ teams })
      
      // 确保 loading 至少显示指定时间
      await loadingDelay.waitForMinDuration()
      
      set({ isLoadingTeams: false })
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg })
      
      // 确保 loading 至少显示指定时间
      await loadingDelay.waitForMinDuration()
      
      set({ isLoadingTeams: false })
      showToast.error('获取团队失败', errorMsg)
    }
  },

  fetchAllData: async () => {
    const store = get()
    
    // 先从 localStorage 加载用户
    let currentUser: User | null = null
    if (typeof window !== 'undefined') {
      const currentUserStr = localStorage.getItem('currentUser')
      if (currentUserStr) {
        try {
          currentUser = JSON.parse(currentUserStr)
          set({ currentUser })
        } catch (e) {
          console.error('Failed to parse current user:', e)
        }
      }
    }
    
    // 先加载用户、团队和项目数据
    await Promise.all([
      store.fetchUsers(),
      store.fetchTeams(),
      store.fetchProjects(),
    ])
    
    // 根据持久化的导航状态加载对应的任务
    const { navigationMode, selectedTeamId, selectedProjectId } = get()
    
    if (navigationMode === 'team' && selectedTeamId) {
      // 团队模式：加载该团队的任务
      await store.fetchTasks({ teamId: selectedTeamId })
    } else if (navigationMode === 'project' && selectedProjectId) {
      // 项目模式：加载该项目的任务
      await store.fetchTasks({ projectId: selectedProjectId })
    } else if (currentUser) {
      // my-days 模式：加载当前用户的任务
      await store.fetchTasks({ userId: currentUser.id })
    }
  },

  setError: (error) => set({ error }),

  // Actions
  addTask: async (task) => {
    const { currentUser, projects, teams } = get()
    
    // 权限检查
    if (currentUser) {
      const project = projects.find(p => p.id === task.projectId)
      if (project) {
        const hasPermission = canManageTaskInProject(
          currentUser.id,
          project,
          currentUser.isAdmin
        )
        
        if (!hasPermission) {
          const errorMsg = getPermissionDeniedMessage(project.taskPermission)
          set({ error: errorMsg })
          showToast.error('权限不足', errorMsg)
          throw new Error(errorMsg)
        }
      }
    }
    
    try {
      // await API 调用,确保任务创建成功
      await taskAPI.create(task as any)
      
      // API 成功后,在后台刷新数据(不阻塞调用者)
      Promise.all([
        // 创建任务可能导致后端自动添加成员,需要刷新项目/团队数据
        task.projectId ? get().fetchProjects() : Promise.resolve(),
        task.teamId ? get().fetchTeams() : Promise.resolve(),
        // 根据当前导航模式重新获取任务列表
        (async () => {
          const { navigationMode, selectedTeamId, selectedProjectId, currentUser } = get()
          if (navigationMode === 'team' && selectedTeamId) {
            await get().fetchTasks({ teamId: selectedTeamId })
          } else if (navigationMode === 'project' && selectedProjectId) {
            await get().fetchTasks({ projectId: selectedProjectId })
          } else if (currentUser) {
            await get().fetchTasks({ userId: currentUser.id })
          }
        })()
      ]).catch((error: any) => {
        console.error('Background data refresh failed after task creation:', error)
      })
      
      // API 调用成功后立即返回,不等待数据刷新
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg })
      throw error
    }
  },

  updateTask: async (id, updatedTask) => {
    const { currentUser, projects, tasks } = get()
    
    // 权限检查
    if (currentUser) {
      const task = tasks.find(t => t.id === id)
      const project = task ? projects.find(p => p.id === task.projectId) : null
      
      if (project) {
        const hasPermission = canManageTaskInProject(
          currentUser.id,
          project,
          currentUser.isAdmin
        )
        
        if (!hasPermission) {
          const errorMsg = getPermissionDeniedMessage(project.taskPermission)
          set({ error: errorMsg })
          showToast.error('权限不足', errorMsg)
          throw new Error(errorMsg)
        }
      }
    }
    
    try {
      // 记录修改前的任务信息
      const originalTask = tasks.find(t => t.id === id)
      
      // await API 调用,确保任务更新成功
      await taskAPI.update(id, updatedTask)
      
      // 检查是否需要刷新项目/团队数据(因为后端可能自动添加了新成员)
      const needRefreshProjects = updatedTask.projectId && updatedTask.projectId !== originalTask?.projectId
      const needRefreshTeams = updatedTask.teamId !== undefined && updatedTask.teamId !== originalTask?.teamId
      
      // API 成功后,在后台刷新数据(不阻塞调用者)
      Promise.all([
        needRefreshProjects ? get().fetchProjects() : Promise.resolve(),
        needRefreshTeams ? get().fetchTeams() : Promise.resolve(),
        // 根据当前导航模式重新获取任务列表
        (async () => {
          const { navigationMode, selectedTeamId, selectedProjectId, currentUser } = get()
          
          if (navigationMode === 'team' && selectedTeamId) {
            await get().fetchTasks({ teamId: selectedTeamId })
          } else if (navigationMode === 'project' && selectedProjectId) {
            await get().fetchTasks({ projectId: selectedProjectId })
          } else if (currentUser) {
            await get().fetchTasks({ userId: currentUser.id })
          }
          
          // 检查任务是否被移出当前视图并给出提示
          let taskMovedOut = false
          if (navigationMode === 'project' && selectedProjectId) {
            if (updatedTask.projectId && updatedTask.projectId !== selectedProjectId) {
              taskMovedOut = true
            }
          } else if (navigationMode === 'my-days' && currentUser) {
            if (updatedTask.userId && updatedTask.userId !== currentUser.id) {
              taskMovedOut = true
            }
          }
          
          if (taskMovedOut) {
            const taskTitle = originalTask?.title || '任务'
            if (navigationMode === 'project') {
              const projects = get().projects
              const newProject = projects.find(p => p.id === updatedTask.projectId)
              showToast.success(
                '任务已移动',
                `「${taskTitle}」已移动到项目「${newProject?.name || '其他项目'}」`
              )
            } else if (navigationMode === 'my-days') {
              showToast.success(
                '任务已转移',
                `「${taskTitle}」的负责人已变更，任务已从您的视图中移出`
              )
            }
          }
        })()
      ]).catch((error: any) => {
        console.error('Background data refresh failed after task update:', error)
      })
      
      // API 调用成功后立即返回,不等待数据刷新
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg })
      throw error
    }
  },

  deleteTask: async (id) => {
    const { currentUser, projects, tasks } = get()
    
    // 权限检查
    if (currentUser) {
      const task = tasks.find(t => t.id === id)
      const project = task ? projects.find(p => p.id === task.projectId) : null
      
      if (project) {
        const hasPermission = canManageTaskInProject(
          currentUser.id,
          project,
          currentUser.isAdmin
        )
        
        if (!hasPermission) {
          const errorMsg = getPermissionDeniedMessage(project.taskPermission)
          set({ error: errorMsg })
          showToast.error('权限不足', errorMsg)
          throw new Error(errorMsg)
        }
      }
    }
    
    try {
      // await API 调用,确保任务删除成功
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete task')
      }
      
      // API 成功后,在后台刷新任务列表(不阻塞调用者)
      const refreshData = async () => {
        const { navigationMode, selectedTeamId, selectedProjectId, currentUser } = get()
        
        if (navigationMode === 'team' && selectedTeamId) {
          await get().fetchTasks({ teamId: selectedTeamId })
        } else if (navigationMode === 'project' && selectedProjectId) {
          await get().fetchTasks({ projectId: selectedProjectId })
        } else if (currentUser) {
          await get().fetchTasks({ userId: currentUser.id })
        }
      }
      
      refreshData().catch((error: any) => {
        console.error('Background data refresh failed after task deletion:', error)
      })
      
      // API 调用成功后立即返回,不等待数据刷新
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg })
      throw error
    }
  },

  addProject: async (project) => {
    try {
      const newProject = await projectAPI.create(project as any)
      
      // 重新获取项目列表以确保数据同步
      await get().fetchProjects()
      
      showToast.success('创建成功', `项目 "${newProject.name}" 已创建`)
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg })
      showToast.error('创建失败', errorMsg)
      throw error
    }
  },

  updateProject: async (id, updatedProject) => {
    try {
      await projectAPI.update(id, updatedProject)
      
      // 重新获取项目列表以确保数据同步
      await get().fetchProjects()
      
      showToast.success('更新成功', '项目信息已更新')
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg })
      showToast.error('更新失败', errorMsg)
      throw error
    }
  },

  deleteProject: async (id) => {
    try {
      await projectAPI.delete(id)
      
      // 重新获取项目列表以确保数据同步
      await get().fetchProjects()
      
      showToast.success('删除成功', '项目已删除')
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg })
      showToast.error('删除失败', errorMsg)
      throw error
    }
  },

  leaveProject: async (id) => {
    try {
      await projectAPI.leave(id)
      
      // 重新获取项目列表以确保数据同步
      await get().fetchProjects()
      
      showToast.success('退出成功', '已退出项目')
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg })
      showToast.error('退出失败', errorMsg)
      throw error
    }
  },

  addTeam: async (team) => {
    try {
      const newTeam = await teamAPI.create(team as any)
      
      // 重新获取团队列表以确保数据同步
      await get().fetchTeams()
      
      showToast.success('创建成功', `团队 "${newTeam.name}" 已创建`)
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg })
      showToast.error('创建失败', errorMsg)
      throw error
    }
  },

  updateTeam: async (id, updatedTeam) => {
    try {
      await teamAPI.update(id, updatedTeam)
      
      // 重新获取团队列表以确保数据同步
      await get().fetchTeams()
      
      showToast.success('更新成功', '团队信息已更新')
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg })
      showToast.error('更新失败', errorMsg)
      throw error
    }
  },

  deleteTeam: async (id) => {
    try {
      await teamAPI.delete(id)
      
      // 重新获取团队列表以确保数据同步
      await get().fetchTeams()
      
      showToast.success('删除成功', '团队已删除')
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg })
      showToast.error('删除失败', errorMsg)
      throw error
    }
  },

  leaveTeam: async (id) => {
    try {
      await teamAPI.leave(id)
      
      // 重新获取团队列表以确保数据同步
      await get().fetchTeams()
      
      showToast.success('退出成功', '已退出团队')
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg })
      showToast.error('退出失败', errorMsg)
      throw error
    }
  },

  setMainViewMode: (mode) => set({ mainViewMode: mode }),
  setListGroupMode: (mode) => set({ listGroupMode: mode }),
  setListLayoutColumns: (columns) => set({ listLayoutColumns: columns }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setNavigationMode: (mode) => {
    set({ navigationMode: mode, selectedTeamId: null, selectedProjectId: null })
    
    // 切换到 my-days 模式时，加载当前用户的任务
    if (mode === 'my-days') {
      const currentUser = get().currentUser
      if (currentUser) {
        get().fetchTasks({ userId: currentUser.id })
      }
    }
  },
  setSelectedTeamId: async (id) => {
    set({ selectedTeamId: id })
    // 切换团队时，先刷新团队数据(可能有新成员),再获取任务
    if (id) {
      // 刷新团队列表以获取最新成员信息
      await get().fetchTeams()
      // 获取团队的任务（会获取团队成员的所有任务）
      await get().fetchTasks({ teamId: id })
    } else {
      // 如果清空选择，获取所有任务
      await get().fetchTasks()
    }
  },
  setSelectedProjectId: async (id) => {
    set({ selectedProjectId: id })
    // 切换项目时，先刷新项目数据(可能有新成员),再获取任务
    if (id) {
      // 刷新项目列表以获取最新成员信息
      await get().fetchProjects()
      // 获取项目的任务
      await get().fetchTasks({ projectId: id })
    } else {
      // 如果清空选择，获取所有任务
      await get().fetchTasks()
    }
  },
  setCurrentDate: (date) => set({ currentDate: date }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  toggleWeekends: () => set((state) => ({ hideWeekends: !state.hideWeekends })),
  setTaskBarSize: (size) => set({ taskBarSize: size }),

  // 项目过滤方法
  toggleProjectFilter: (projectId) =>
    set((state) => {
      const isSelected = state.selectedProjectIds.includes(projectId)
      
      if (isSelected) {
        // 如果已选中，则取消选中
        return { selectedProjectIds: state.selectedProjectIds.filter(id => id !== projectId) }
      } else {
        // 如果未选中，则添加到选中列表
        return { selectedProjectIds: [...state.selectedProjectIds, projectId] }
      }
    }),

  selectAllProjects: () => 
    set((state) => {
      // 如果当前已经全选（所有项目都被选中），则清空选择
      if (state.selectedProjectIds.length === state.projects.length) {
        return { selectedProjectIds: [] }
      } else {
        // 否则选中所有项目
        return { selectedProjectIds: state.projects.map(p => p.id) }
      }
    }),

  clearProjectFilter: () => set({ selectedProjectIds: [] }),

  startDragCreate: (date, cell, userId) =>
    set({
      dragState: {
        isCreating: true,
        startDate: date,
        endDate: date,
        startCell: cell,
        userId: userId || null,
      },
    }),

  updateDragCreate: (date) =>
    set((state) => {
      if (!state.dragState.isCreating || !state.dragState.startDate) return state

      const startDate = state.dragState.startDate
      const endDate = date

      return {
        dragState: {
          ...state.dragState,
          endDate: startDate <= endDate ? endDate : startDate,
          startDate: startDate <= endDate ? startDate : endDate,
        },
      }
    }),

  endDragCreate: () => {
    const state = get()
    if (!state.dragState.isCreating || !state.dragState.startDate || !state.dragState.endDate) {
      set({
        dragState: {
          isCreating: false,
          startDate: null,
          endDate: null,
          startCell: null,
          userId: null,
        },
      })
      return null
    }

    const result = {
      startDate: state.dragState.startDate,
      endDate: state.dragState.endDate,
    }

    set({
      dragState: {
        isCreating: false,
        startDate: null,
        endDate: null,
        startCell: null,
        userId: null,
      },
    })

    return result
  },

  cancelDragCreate: () =>
    set({
      dragState: {
        isCreating: false,
        startDate: null,
        endDate: null,
        startCell: null,
        userId: null,
      },
    }),

  // 拖拽移动任务的实现
  startDragMove: (task, date) =>
    set({
      dragMoveState: {
        isMoving: true,
        task,
        startDate: date,
        offsetDays: 0,
      },
    }),

  updateDragMove: (date) =>
    set((state) => {
      if (!state.dragMoveState.isMoving || !state.dragMoveState.startDate || !state.dragMoveState.task) return state

      const startDate = new Date(state.dragMoveState.startDate)
      startDate.setHours(0, 0, 0, 0)
      const currentDate = new Date(date)
      currentDate.setHours(0, 0, 0, 0)

      const diffTime = currentDate.getTime() - startDate.getTime()
      const offsetDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

      // 如果偏移量有变化,实时更新任务日期
      if (offsetDays !== state.dragMoveState.offsetDays) {
        const task = state.dragMoveState.task
        const actualOffsetDays = offsetDays - state.dragMoveState.offsetDays
        
        const newStartDate = new Date(task.startDate)
        newStartDate.setDate(newStartDate.getDate() + actualOffsetDays)
        const newEndDate = new Date(task.endDate)
        newEndDate.setDate(newEndDate.getDate() + actualOffsetDays)

        // 实时更新任务日期
        const updatedTasks = state.tasks.map(t =>
          t.id === task.id
            ? { ...t, startDate: newStartDate, endDate: newEndDate }
            : t
        )

        return {
          tasks: updatedTasks,
          dragMoveState: {
            ...state.dragMoveState,
            task: { ...task, startDate: newStartDate, endDate: newEndDate },
            offsetDays,
          },
        }
      }

      return {
        dragMoveState: {
          ...state.dragMoveState,
          offsetDays,
        },
      }
    }),

  endDragMove: () => {
    // 只需要清除拖拽状态,任务已经在拖拽过程中更新了
    set({
      dragMoveState: {
        isMoving: false,
        task: null,
        startDate: null,
        offsetDays: 0,
      },
    })
  },

  cancelDragMove: () =>
    set({
      dragMoveState: {
        isMoving: false,
        task: null,
        startDate: null,
        offsetDays: 0,
      },
    }),

  openTaskCreation: (startDate, endDate, userId, projectId, teamId) => {
    const { navigationMode, selectedProjectId, selectedTeamId, projects, currentUser } = get()
    
    // 确定默认项目ID
    let defaultProjectId: string | null = projectId || null
    if (!defaultProjectId) {
      if (navigationMode === 'project') {
        defaultProjectId = selectedProjectId
      } else if (navigationMode === 'my-days') {
        // My Days 模式下,默认选中个人事务项目
        const personalProject = currentUser 
          ? projects.find(p => p.name.includes('个人事务') && p.memberIds.includes(currentUser.id))
          : null
        defaultProjectId = personalProject?.id || null
      }
    }
    
    set({
      taskCreation: {
        isOpen: true,
        startDate,
        endDate,
        userId: userId || null,
        // 根据当前导航模式设置默认项目和团队
        projectId: defaultProjectId,
        teamId: teamId || (navigationMode === 'team' ? selectedTeamId : null),
      },
    })
  },

  closeTaskCreation: () =>
    set({
      taskCreation: {
        isOpen: false,
        startDate: null,
        endDate: null,
        userId: null,
        projectId: null,
        teamId: null,
      },
    }),

  openTaskEdit: (task) =>
    set({
      taskEdit: {
        isOpen: true,
        task,
      },
    }),

  closeTaskEdit: () =>
    set({
      taskEdit: {
        isOpen: false,
        task: null,
      },
    }),

  openTeamCreation: () => {
    // TODO: 实现团队创建对话框
    console.log("Open team creation dialog")
  },

  openProjectCreation: () => {
    // TODO: 实现项目创建对话框
    console.log("Open project creation dialog")
  },

  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  // Helpers
  getTasksForDate: (date) => {
    const state = get()
    const filteredTasks = state.selectedProjectIds.length === 0 
      ? state.tasks 
      : state.tasks.filter(task => state.selectedProjectIds.includes(task.projectId))
    
    return filteredTasks.filter((task) => {
      const taskStart = new Date(task.startDate)
      const taskEnd = new Date(task.endDate)
      taskStart.setHours(0, 0, 0, 0)
      taskEnd.setHours(23, 59, 59, 999)
      date.setHours(12, 0, 0, 0)
      return date >= taskStart && date <= taskEnd
    })
  },

  getTasksForDateRange: (startDate, endDate) => {
    const state = get()
    const filteredTasks = state.selectedProjectIds.length === 0 
      ? state.tasks 
      : state.tasks.filter(task => state.selectedProjectIds.includes(task.projectId))
    
    return filteredTasks.filter((task) => {
      const taskStart = new Date(task.startDate)
      const taskEnd = new Date(task.endDate)
      return (
        (taskStart >= startDate && taskStart <= endDate) ||
        (taskEnd >= startDate && taskEnd <= endDate) ||
        (taskStart <= startDate && taskEnd >= endDate)
      )
    })
  },

  getProjectById: (id) => {
    const state = get()
    return state.projects.find((project) => project.id === id)
  },

  getTeamById: (id) => {
    const state = get()
    return state.teams.find((team) => team.id === id)
  },

  getUserById: (id) => {
    const state = get()
    return state.users.find((user) => user.id === id)
  },
    }),
    {
      name: 'calendar-storage-v2', // localStorage key (changed to reset old data)
      storage: createJSONStorage(() => localStorage),
      // 只持久化需要的状态,不持久化 tasks/projects/users/teams 等数据
      partialize: (state) => ({
        mainViewMode: state.mainViewMode,
        listGroupMode: state.listGroupMode,
        listLayoutColumns: state.listLayoutColumns,
        viewMode: state.viewMode,
        navigationMode: state.navigationMode,
        selectedProjectIds: state.selectedProjectIds,
        selectedTeamId: state.selectedTeamId,
        selectedProjectId: state.selectedProjectId,
        hideWeekends: state.hideWeekends,
        taskBarSize: state.taskBarSize,
        settings: state.settings,
      }),
    }
  )
)
