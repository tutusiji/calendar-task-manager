"use client"

import { create } from "zustand"
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

  dragState: {
    isCreating: boolean
    startDate: Date | null
    endDate: Date | null
    startCell: { x: number; y: number } | null
  }

  taskCreation: {
    isOpen: boolean
    startDate: Date | null
    endDate: Date | null
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

  startDragCreate: (date: Date, cell: { x: number; y: number }) => void
  updateDragCreate: (date: Date) => void
  endDragCreate: () => { startDate: Date; endDate: Date } | null
  cancelDragCreate: () => void

  openTaskCreation: (startDate: Date, endDate: Date) => void
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

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  // Initial data
  tasks: mockTasks,
  projects: mockProjects,
  users: mockUsers,
  currentUser: mockUsers[0],

  // Initial view state
  viewMode: "personal",
  currentDate: new Date(),
  selectedDate: null,

  dragState: {
    isCreating: false,
    startDate: null,
    endDate: null,
    startCell: null,
  },

  taskCreation: {
    isOpen: false,
    startDate: null,
    endDate: null,
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

  startDragCreate: (date, cell) =>
    set({
      dragState: {
        isCreating: true,
        startDate: date,
        endDate: date,
        startCell: cell,
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
      },
    }),

  openTaskCreation: (startDate, endDate) =>
    set({
      taskCreation: {
        isOpen: true,
        startDate,
        endDate,
      },
    }),

  closeTaskCreation: () =>
    set({
      taskCreation: {
        isOpen: false,
        startDate: null,
        endDate: null,
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
    return state.tasks.filter((task) => {
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
    return state.tasks.filter((task) => {
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
}))
