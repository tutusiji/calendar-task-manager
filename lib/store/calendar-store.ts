"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Task, Project, User, CalendarSettings, Team, ViewMode, NavigationMode, MainViewMode, ListGroupMode, ListLayoutColumns } from "../types"
import { taskAPI, projectAPI, userAPI, teamAPI, handleAPIError } from "../api-client"
import { showToast } from "../toast"

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

  setMainViewMode: (mode: MainViewMode) => void // 设置主视图模式
  setListGroupMode: (mode: ListGroupMode) => void // 设置清单分组模式
  setListLayoutColumns: (columns: ListLayoutColumns) => void // 设置清单布局列数
  setViewMode: (mode: ViewMode) => void
  setNavigationMode: (mode: NavigationMode) => void
  setSelectedTeamId: (id: string | null) => void
  setSelectedProjectId: (id: string | null) => void
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

  openTaskCreation: (startDate: Date, endDate: Date, userId?: string) => void
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
      set({ tasks, isLoadingTasks: false })
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg, isLoadingTasks: false })
      showToast.error('获取任务失败', errorMsg)
    }
  },

  fetchProjects: async () => {
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
        creatorId: project.creatorId, // 添加创建者ID
        // members 是 ProjectMember 数组，每个有 user 属性
        memberIds: project.members?.map((m: any) => m.user?.id || m.userId) || [],
        createdAt: new Date(project.createdAt),
      }))
      
      // 默认选中所有项目
      const selectedProjectIds = projects.map((p: Project) => p.id)
      
      set({ projects, selectedProjectIds, isLoadingProjects: false })
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg, isLoadingProjects: false })
      showToast.error('获取项目失败', errorMsg)
    }
  },

  fetchUsers: async () => {
    set({ isLoadingUsers: true, error: null })
    try {
      const users = await userAPI.getAll()
      set({ users, isLoadingUsers: false })
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg, isLoadingUsers: false })
      showToast.error('获取用户失败', errorMsg)
    }
  },

  fetchTeams: async () => {
    set({ isLoadingTeams: true, error: null })
    try {
      const teamsData = await teamAPI.getAll()
      // 转换数据格式
      const teams = teamsData.map((team: any) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        color: team.color,
        creatorId: team.creatorId, // 添加创建者ID
        // members 是 TeamMember 数组，每个有 user 属性
        memberIds: team.members?.map((m: any) => m.user?.id || m.userId) || [],
        createdAt: new Date(team.createdAt),
      }))
      set({ teams, isLoadingTeams: false })
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg, isLoadingTeams: false })
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
    
    await Promise.all([
      store.fetchUsers(),
      store.fetchTeams(),
      store.fetchProjects(),
    ])
    
    // 加载当前用户的任务
    if (currentUser) {
      await store.fetchTasks({ userId: currentUser.id })
    }
  },

  setError: (error) => set({ error }),

  // Actions
  addTask: async (task) => {
    try {
      await taskAPI.create(task as any)
      
      // 创建成功后，重新获取任务列表
      const currentUser = get().currentUser
      if (currentUser) {
        await get().fetchTasks({ userId: currentUser.id })
      }
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg })
      throw error
    }
  },

  updateTask: async (id, updatedTask) => {
    try {
      await taskAPI.update(id, updatedTask)
      
      // 更新成功后，重新获取任务列表
      const currentUser = get().currentUser
      if (currentUser) {
        await get().fetchTasks({ userId: currentUser.id })
      }
    } catch (error) {
      const errorMsg = handleAPIError(error)
      set({ error: errorMsg })
      throw error
    }
  },

  deleteTask: async (id) => {
    try {
      await taskAPI.delete(id)
      
      // 删除成功后，重新获取任务列表
      const currentUser = get().currentUser
      if (currentUser) {
        await get().fetchTasks({ userId: currentUser.id })
      }
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

  setMainViewMode: (mode) => set({ mainViewMode: mode }),
  setListGroupMode: (mode) => set({ listGroupMode: mode }),
  setListLayoutColumns: (columns) => set({ listLayoutColumns: columns }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setNavigationMode: (mode) => set({ navigationMode: mode, selectedTeamId: null, selectedProjectId: null }),
  setSelectedTeamId: (id) => set({ selectedTeamId: id }),
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
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

  openTaskCreation: (startDate, endDate, userId) =>
    set({
      taskCreation: {
        isOpen: true,
        startDate,
        endDate,
        userId: userId || null,
      },
    }),

  closeTaskCreation: () =>
    set({
      taskCreation: {
        isOpen: false,
        startDate: null,
        endDate: null,
        userId: null,
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
