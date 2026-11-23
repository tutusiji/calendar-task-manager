"use client";

import { create } from "zustand";
import { persist,createJSONStorage } from "zustand/middleware";
import type {
PublicHoliday,
Task,
TaskRecurrenceConfig,
Project,
User,
Team,
} from "../types";
import { createTaskActions } from "./actions/task-actions";
import { createProjectActions } from "./actions/project-actions";
import { createTeamActions } from "./actions/team-actions";
import { createUserActions } from "./actions/user-actions";
import { createBootstrapActions } from "./actions/bootstrap-actions";
import { calendarViewPersistence,createCalendarView,type CalendarViewState } from "./slices/calendar-view";
import { createCalendarDrag,type CalendarDragState } from "./slices/calendar-drag";
import { createCalendarTaskEditor,type CalendarTaskEditorState } from "./slices/calendar-task-editor";

export interface CalendarStore extends CalendarViewState, CalendarDragState, CalendarTaskEditorState {
  // Data
  tasks: Task[];
  publicHolidays: PublicHoliday[];
  projects: Project[];
  users: User[];
  teams: Team[];
  currentUser: User | null;

  // Loading states
  isLoadingTasks: boolean;
  isLoadingProjects: boolean;
  isLoadingUsers: boolean;
  isLoadingTeams: boolean;
  // 首次任务加载是否已完成（仅内存态，不持久化）
  hasLoadedTasks: boolean;
  // 正在保存的任务 ID（仅内存态，不持久化）
  pendingTaskIds: string[];
  // 右下角保存提示：请求完成后仍保留一段时间，避免一闪而过
  saveNoticeVisible: boolean;
  saveNoticeStartedAt: number | null;

  // Error states
  error: string | null;

  // Data Loading Actions
  fetchTasks: (options?: { silent?: boolean; onlyIfChanged?: boolean }) => Promise<void>;
  fetchProjects: (options?: { silent?: boolean }) => Promise<void>;
  fetchPublicHolidays: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchTeams: (options?: { silent?: boolean }) => Promise<void>;
  fetchAllData: () => Promise<void>;
  setCurrentUserFromStorage: () => void;
  setCurrentUser: (user: User) => void;

  // Actions
  addTask: (
    task: Omit<Task, "id"> & {
      userId?: string | string[]
      recurrence?: TaskRecurrenceConfig | null
    }
  ) => Promise<void>;
  updateTask: (
    id: string,
    task: Partial<Task> & {
      userId?: string | string[]
      recurrence?: TaskRecurrenceConfig | null
    }
  ) => Promise<void>;
  stopRecurringTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  addTeam: (
    team: Omit<Team, "id" | "createdAt"> & { memberIds: string[] }
  ) => Promise<void>;
  updateTeam: (
    id: string,
    team: Partial<Team> & { memberIds?: string[] }
  ) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;

  addProject: (
    project: Omit<Project, "id" | "createdAt"> & { memberIds: string[] }
  ) => Promise<void>;
  updateProject: (
    id: string,
    project: Partial<Project> & { memberIds?: string[] }
  ) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  leaveProject: (id: string) => Promise<void>;
  leaveTeam: (id: string) => Promise<void>;

  setError: (error: string | null) => void;

  reorderTeams: (teamIds: string[], options?: { persist?: boolean }) => Promise<void>;
  reorderProjects: (projectIds: string[], options?: { persist?: boolean }) => Promise<void>;

  startTaskPending: (taskId: string) => void;
  finishTaskPending: (taskId: string, minDurationMs?: number) => void;

  openTeamCreation: () => void;
  openProjectCreation: () => void;

  // Helpers
  getTasksForDate: (date: Date) => Task[];
  getTasksForDateRange: (startDate: Date, endDate: Date) => Task[];
  getProjectById: (id: string) => Project | undefined;
  getTeamById: (id: string) => Team | undefined;
  getUserById: (id: string) => User | undefined;
}

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set, get, store) => ({
      ...createTaskActions(set, get, store),
      ...createProjectActions(set, get, store),
      ...createTeamActions(set, get, store),
      ...createUserActions(set, get, store),
      ...createBootstrapActions(set, get, store),
      ...createCalendarView(set, get, store),
      ...createCalendarDrag(set, get, store),
      ...createCalendarTaskEditor(set, get, store),

      // Initial data
      tasks: [],
      publicHolidays: [],
      projects: [],
      users: [],
      teams: [],
      currentUser: null,

      // Loading states
      isLoadingTasks: false,
      isLoadingProjects: false,
      isLoadingUsers: false,
      isLoadingTeams: false,
      hasLoadedTasks: false,
      pendingTaskIds: [],
      saveNoticeVisible: false,
      saveNoticeStartedAt: null,

      // Error state
      error: null,

      startTaskPending: (taskId) =>
        set((state) => ({
          pendingTaskIds: state.pendingTaskIds.includes(taskId)
            ? state.pendingTaskIds
            : [...state.pendingTaskIds, taskId],
          saveNoticeVisible: true,
          saveNoticeStartedAt: Date.now(),
        })),

      finishTaskPending: (taskId, minDurationMs = 800) => {
        set((state) => ({
          pendingTaskIds: state.pendingTaskIds.filter((id) => id !== taskId),
        }))

        // 任务条 spinner 立即结束；右下角提示按最短时长保留
        const hideNoticeWhenReady = () => {
          const state = get()

          if (state.pendingTaskIds.length > 0) return

          const startedAt = state.saveNoticeStartedAt
          const elapsed = startedAt === null ? 0 : Date.now() - startedAt
          const remaining = Math.max(0, minDurationMs - elapsed)

          if (remaining > 0) {
            setTimeout(hideNoticeWhenReady, remaining)
          } else {
            set({ saveNoticeVisible: false, saveNoticeStartedAt: null })
          }
        }

        hideNoticeWhenReady()
      },

      openTeamCreation: () => {
        // TODO: 实现团队创建对话框
        console.log("Open team creation dialog");
      },

      openProjectCreation: () => {
        // TODO: 实现项目创建对话框
        console.log("Open project creation dialog");
      },

      // Helpers
      getTasksForDate: (date) => {
        const state = get();
        const filteredTasks =
          state.selectedProjectIds.length === 0
            ? state.tasks
            : state.tasks.filter((task) =>
                state.selectedProjectIds.includes(task.projectId)
              );

        return filteredTasks.filter((task) => {
          const taskStart = new Date(task.startDate);
          const taskEnd = new Date(task.endDate);
          taskStart.setHours(0, 0, 0, 0);
          taskEnd.setHours(23, 59, 59, 999);
          date.setHours(12, 0, 0, 0);
          return date >= taskStart && date <= taskEnd;
        });
      },

      getTasksForDateRange: (startDate, endDate) => {
        const state = get();
        const filteredTasks =
          state.selectedProjectIds.length === 0
            ? state.tasks
            : state.tasks.filter((task) =>
                state.selectedProjectIds.includes(task.projectId)
              );

        return filteredTasks.filter((task) => {
          const taskStart = new Date(task.startDate);
          const taskEnd = new Date(task.endDate);
          return (
            (taskStart >= startDate && taskStart <= endDate) ||
            (taskEnd >= startDate && taskEnd <= endDate) ||
            (taskStart <= startDate && taskEnd >= endDate)
          );
        });
      },

      getProjectById: (id) => {
        const state = get();
        return state.projects.find((project) => project.id === id);
      },

      getTeamById: (id) => {
        const state = get();
        return state.teams.find((team) => team.id === id);
      },

      getUserById: (id) => {
        const state = get();
        return state.users.find((user) => user.id === id);
      },
    }),
    {
      name: "calendar-storage-v2", // localStorage key (changed to reset old data)
      storage: createJSONStorage(() => localStorage),
      ...calendarViewPersistence,
    }
  )
);
