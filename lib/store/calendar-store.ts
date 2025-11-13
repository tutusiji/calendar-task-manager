"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Task, Project, User, CalendarSettings } from "../types"
import { mockTasks, mockProjects, mockUsers } from "../mock-data"

interface CalendarStore {
  // Data
  tasks: Task[]
  projects: Project[]
  users: User[]
  currentUser: User

  // View state
  viewMode: "personal" | "team"
  currentDate: Date
  selectedDate: Date | null
  selectedProjectIds: string[] // 选中的项目ID列表，空数组表示显示所有项目
  hideWeekends: boolean // 是否隐藏周末（周六日）

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

  // Actions
  addTask: (task: Task) => void
  updateTask: (id: string, task: Partial<Task>) => void
  deleteTask: (id: string) => void

  addProject: (project: Project) => void
  updateProject: (id: string, project: Partial<Project>) => void
  deleteProject: (id: string) => void

  setViewMode: (mode: "personal" | "team") => void
  setCurrentDate: (date: Date) => void
  setSelectedDate: (date: Date | null) => void
  toggleWeekends: () => void // 切换周末显示/隐藏

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

  updateSettings: (settings: Partial<CalendarSettings>) => void

  // Helpers
  getTasksForDate: (date: Date) => Task[]
  getTasksForDateRange: (startDate: Date, endDate: Date) => Task[]
  getProjectById: (id: string) => Project | undefined
  getUserById: (id: string) => User | undefined
}

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set, get) => ({
      // Initial data
      tasks: mockTasks,
      projects: mockProjects,
      users: mockUsers,
      currentUser: mockUsers[0],

      // Initial view state
      viewMode: "personal",
      currentDate: new Date(),
      selectedDate: null,
      selectedProjectIds: mockProjects.map(p => p.id), // 默认选中所有项目
      hideWeekends: false, // 默认显示周末

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

  // Actions
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),

  updateTask: (id, updatedTask) =>
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, ...updatedTask } : task)),
    })),

  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    })),

  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),

  updateProject: (id, updatedProject) =>
    set((state) => ({
      projects: state.projects.map((project) => (project.id === id ? { ...project, ...updatedProject } : project)),
    })),

  deleteProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
    })),

  setViewMode: (mode) => set({ viewMode: mode }),
  setCurrentDate: (date) => set({ currentDate: date }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  toggleWeekends: () => set((state) => ({ hideWeekends: !state.hideWeekends })),

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

  getUserById: (id) => {
    const state = get()
    return state.users.find((user) => user.id === id)
  },
    }),
    {
      name: 'calendar-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // 只持久化需要的状态
      partialize: (state) => ({
        viewMode: state.viewMode,
        selectedProjectIds: state.selectedProjectIds,
        hideWeekends: state.hideWeekends,
      }),
    }
  )
)
