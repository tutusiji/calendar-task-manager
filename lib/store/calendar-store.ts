"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  PublicHoliday,
  Task,
  TaskRecurrenceConfig,
  Project,
  User,
  CalendarSettings,
  Team,
  ViewMode,
  NavigationMode,
  MainViewMode,
  ListGroupMode,
  ListLayoutColumns,
} from "../types";
import {
  taskAPI,
} from "../api-client";
import { showToast } from "../toast";
import { parseApiTask, sortTasksByStartDate } from "./task-normalizer";
import { createTaskActions } from "./actions/task-actions";
import { createProjectActions } from "./actions/project-actions";
import { createTeamActions } from "./actions/team-actions";
import { createUserActions } from "./actions/user-actions";
import { createBootstrapActions } from "./actions/bootstrap-actions";

function getFiltersForCurrentNavigation(state: {
  navigationMode: NavigationMode;
  selectedTeamId: string | null;
  selectedProjectId: string | null;
  currentUser: User | null;
}): { userId?: string; projectId?: string; teamId?: string } {
  if (state.navigationMode === "team" && state.selectedTeamId) {
    return { teamId: state.selectedTeamId };
  }
  if (state.navigationMode === "project" && state.selectedProjectId) {
    return { projectId: state.selectedProjectId };
  }
  if (state.currentUser) {
    return { userId: state.currentUser.id };
  }
  return {};
}

export interface CalendarStore {
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

  // View state
  mainViewMode: MainViewMode; // "calendar" | "list" | "stats" 主视图模式
  listGroupMode: ListGroupMode; // "project" | "date" | "user" 清单分组模式
  listLayoutColumns: ListLayoutColumns; // 清单布局列数: 1 | 2 | 3 | 4
  viewMode: ViewMode; // "month" | "week"
  navigationMode: NavigationMode; // "my-days" | "team" | "project"
  selectedTeamId: string | null;
  selectedProjectId: string | null;
  currentDate: Date;
  selectedDate: Date | null;
  selectedProjectIds: string[]; // 选中的项目ID列表，用于过滤
  hideWeekends: boolean; // 是否隐藏周末（周六日）
  taskBarSize: "compact" | "comfortable"; // 任务条大小：紧凑型 | 宽松型

  dragState: {
    isCreating: boolean;
    startDate: Date | null;
    endDate: Date | null;
    startCell: { x: number; y: number } | null;
    userId: string | null; // 拖拽创建时的用户ID，用于限制团队视图中不跨行拖拽
  };

  // 拖拽移动任务的状态
  dragMoveState: {
    isMoving: boolean;
    task: Task | null;
    startDate: Date | null; // 拖拽开始时的日期
    offsetDays: number; // 移动的天数偏移
  };

  taskCreation: {
    isOpen: boolean;
    startDate: Date | null;
    endDate: Date | null;
    userId: string | null; // 创建任务时指定的用户ID
    projectId: string | null; // 默认选中的项目ID
    teamId: string | null; // 默认选中的团队ID
  };

  taskEdit: {
    isOpen: boolean;
    task: Task | null;
  };

  // Hover state for cross-segment highlighting
  hoveredTaskId: string | null;

  // Settings
  settings: CalendarSettings;

  // Data Loading Actions
  fetchTasks: (
    filters?: {
      userId?: string;
      projectId?: string;
      teamId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    options?: { silent?: boolean }
  ) => Promise<void>;
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

  setMainViewMode: (mode: MainViewMode) => void; // 设置主视图模式
  setListGroupMode: (mode: ListGroupMode) => void; // 设置清单分组模式
  setListLayoutColumns: (columns: ListLayoutColumns) => void; // 设置清单布局列数
  setViewMode: (mode: ViewMode) => void;
  setNavigationMode: (mode: NavigationMode) => void;
  setSelectedTeamId: (id: string | null) => Promise<void>;
  setSelectedProjectId: (id: string | null) => Promise<void>;
  setCurrentDate: (date: Date) => void;
  setSelectedDate: (date: Date | null) => void;
  toggleWeekends: () => void; // 切换周末显示/隐藏
  setTaskBarSize: (size: "compact" | "comfortable") => void; // 设置任务条大小
  setError: (error: string | null) => void;

  // 项目过滤
  toggleProjectFilter: (projectId: string) => void;
  selectAllProjects: () => void;
  clearProjectFilter: () => void;
  reorderTeams: (teamIds: string[], options?: { persist?: boolean }) => Promise<void>;
  reorderProjects: (projectIds: string[], options?: { persist?: boolean }) => Promise<void>;

  startDragCreate: (
    date: Date,
    cell: { x: number; y: number },
    userId?: string
  ) => void;
  updateDragCreate: (date: Date) => void;
  endDragCreate: () => { startDate: Date; endDate: Date } | null;
  cancelDragCreate: () => void;

  // 拖拽移动任务的方法
  startDragMove: (task: Task, date: Date) => void;
  updateDragMove: (date: Date) => void;
  endDragMove: () => void;
  cancelDragMove: () => void;
  startTaskPending: (taskId: string) => void;
  finishTaskPending: (taskId: string, minDurationMs?: number) => void;

  openTaskCreation: (
    startDate: Date,
    endDate: Date,
    userId?: string,
    projectId?: string,
    teamId?: string
  ) => void;
  closeTaskCreation: () => void;

  openTaskEdit: (task: Task) => void;
  closeTaskEdit: () => void;

  setHoveredTaskId: (taskId: string | null) => void;

  openTeamCreation: () => void;
  openProjectCreation: () => void;

  updateSettings: (settings: Partial<CalendarSettings>) => void;

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

      hoveredTaskId: null,

      // Initial settings
      settings: {
        rememberLastProject: true,
        lastSelectedProjectId: "personal",
      },

      // Data Loading Actions








      // Actions



      setMainViewMode: (mode) => set({ mainViewMode: mode }),
      setListGroupMode: (mode) => set({ listGroupMode: mode }),
      setListLayoutColumns: (columns) => set({ listLayoutColumns: columns }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setNavigationMode: (mode) => {
        const {
          projects,
          currentUser,
          navigationMode,
          selectedTeamId,
          selectedProjectId,
          selectedProjectIds,
        } = get();

        // 已经在当前模式且没有需要重置的筛选状态时，不做重复请求
        if (mode === navigationMode) {
          if (mode !== "my-days") {
            return;
          }

          const allProjectsSelected =
            projects.length > 0 &&
            selectedProjectIds.length === projects.length;

          if (!selectedTeamId && !selectedProjectId && allProjectsSelected) {
            return;
          }
        }

        // 切换到 my-days 模式时，恢复所有项目的选择
        const newSelectedProjectIds = mode === "my-days" 
          ? projects.map(p => p.id)  // 恢复所有项目
          : [];
        
        set({
          navigationMode: mode,
          selectedTeamId: null,
          selectedProjectId: null,
          selectedProjectIds: newSelectedProjectIds,
        });

        // 切换到 my-days 模式时，加载当前用户的任务
        if (mode === "my-days" && currentUser) {
          get().fetchTasks({ userId: currentUser.id });
        }
      },
      setSelectedTeamId: async (id) => {
        // 防止重复设置相同的 ID
        const currentId = get().selectedTeamId;
        if (currentId === id) return;

        set({ selectedTeamId: id, selectedProjectIds: [] }); // 切换团队时重置项目筛选，默认显示所有
        if (id) {
          // 团队数据在后台静默刷新，任务立即加载，避免串行 loading
          void get()
            .fetchTeams({ silent: true })
            .catch((error) =>
              console.error("Failed to refresh teams:", error)
            );

          try {
            await get().fetchTasks({ teamId: id });
          } catch (error) {
            console.error("Failed to load team tasks:", error);
          }
        } else {
          // 如果清空选择，获取所有任务
          try {
            await get().fetchTasks();
          } catch (error) {
            console.error("Failed to load tasks:", error);
          }
        }
      },
      setSelectedProjectId: async (id) => {
        // 防止重复设置相同的 ID
        const currentId = get().selectedProjectId;
        if (currentId === id) return;

        set({ selectedProjectId: id });
        if (id) {
          // 项目数据在后台静默刷新，任务立即加载，避免串行 loading
          void get()
            .fetchProjects({ silent: true })
            .catch((error) =>
              console.error("Failed to refresh projects:", error)
            );

          try {
            await get().fetchTasks({ projectId: id });
          } catch (error) {
            console.error("Failed to load project tasks:", error);
          }
        } else {
          // 如果清空选择，获取所有任务
          try {
            await get().fetchTasks();
          } catch (error) {
            console.error("Failed to load tasks:", error);
          }
        }
      },
      setCurrentDate: (date) => set({ currentDate: date }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      toggleWeekends: () =>
        set((state) => ({ hideWeekends: !state.hideWeekends })),
      setTaskBarSize: (size) => set({ taskBarSize: size }),

      // 项目过滤方法
      toggleProjectFilter: (projectId) =>
        set((state) => {
          const isSelected = state.selectedProjectIds.includes(projectId);

          if (isSelected) {
            // 如果已选中，则取消选中
            return {
              selectedProjectIds: state.selectedProjectIds.filter(
                (id) => id !== projectId
              ),
            };
          } else {
            // 如果未选中，则添加到选中列表
            return {
              selectedProjectIds: [...state.selectedProjectIds, projectId],
            };
          }
        }),

      selectAllProjects: () =>
        set((state) => {
          // 如果当前已经全选（所有项目都被选中），则清空选择
          if (state.selectedProjectIds.length === state.projects.length) {
            return { selectedProjectIds: [] };
          } else {
            // 否则选中所有项目
            return { selectedProjectIds: state.projects.map((p) => p.id) };
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
          if (!state.dragState.isCreating || !state.dragState.startDate)
            return state;

          const startDate = state.dragState.startDate;
          const endDate = date;

          return {
            dragState: {
              ...state.dragState,
              endDate: startDate <= endDate ? endDate : startDate,
              startDate: startDate <= endDate ? startDate : endDate,
            },
          };
        }),

      endDragCreate: () => {
        const state = get();
        if (
          !state.dragState.isCreating ||
          !state.dragState.startDate ||
          !state.dragState.endDate
        ) {
          set({
            dragState: {
              isCreating: false,
              startDate: null,
              endDate: null,
              startCell: null,
              userId: null,
            },
          });
          return null;
        }

        const result = {
          startDate: state.dragState.startDate,
          endDate: state.dragState.endDate,
        };

        set({
          dragState: {
            isCreating: false,
            startDate: null,
            endDate: null,
            startCell: null,
            userId: null,
          },
        });

        return result;
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
          if (
            !state.dragMoveState.isMoving ||
            !state.dragMoveState.startDate ||
            !state.dragMoveState.task
          )
            return state;

          const startDate = new Date(state.dragMoveState.startDate);
          startDate.setHours(0, 0, 0, 0);
          const currentDate = new Date(date);
          currentDate.setHours(0, 0, 0, 0);

          const diffTime = currentDate.getTime() - startDate.getTime();
          const offsetDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          // 如果偏移量有变化,实时更新任务日期
          if (offsetDays !== state.dragMoveState.offsetDays) {
            const task = state.dragMoveState.task;
            const actualOffsetDays =
              offsetDays - state.dragMoveState.offsetDays;

            const newStartDate = new Date(task.startDate);
            newStartDate.setDate(newStartDate.getDate() + actualOffsetDays);
            const newEndDate = new Date(task.endDate);
            newEndDate.setDate(newEndDate.getDate() + actualOffsetDays);

            // 实时更新任务日期
            const updatedTasks = state.tasks.map((t) =>
              t.id === task.id
                ? { ...t, startDate: newStartDate, endDate: newEndDate }
                : t
            );

            return {
              tasks: updatedTasks,
              dragMoveState: {
                ...state.dragMoveState,
                task: { ...task, startDate: newStartDate, endDate: newEndDate },
                offsetDays,
              },
            };
          }

          return {
            dragMoveState: {
              ...state.dragMoveState,
              offsetDays,
            },
          };
        }),

      endDragMove: async () => {
        const state = get();
        const { dragMoveState } = state;

        // 如果有拖拽的任务且日期发生了变化，调用API保存
        if (dragMoveState.task && dragMoveState.offsetDays !== 0) {
          const task = dragMoveState.task;
          get().startTaskPending(task.id);
          try {
            // 调用API更新任务
            const updatedTask = parseApiTask(
              await taskAPI.update(task.id, {
                startDate: task.startDate,
                endDate: task.endDate,
              })
            );

            // 更新本地状态中的任务
            set((state) => ({
              tasks: sortTasksByStartDate(
                state.tasks.map((t) =>
                  t.id === updatedTask.id ? updatedTask : t
                )
              ),
            }));

            // 显示成功通知
            showToast.success("任务已更新", "任务时间已成功修改");
          } catch (error) {
            console.error("Failed to update task:", error);
            // 发生错误时按当前导航条件静默重载，恢复正确状态
            await get().fetchTasks(getFiltersForCurrentNavigation(get()), {
              silent: true,
            });
            showToast.error("更新失败", "网络错误，请重试");
          } finally {
            get().finishTaskPending(task.id);
          }
        }

        // 清除拖拽状态
        set({
          dragMoveState: {
            isMoving: false,
            task: null,
            startDate: null,
            offsetDays: 0,
          },
        });
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

      openTaskCreation: (startDate, endDate, userId, projectId, _teamId) => {
        const {
          navigationMode,
          selectedProjectId,
          projects,
          currentUser,
          settings,
        } = get();

        // 确定默认项目ID
        let defaultProjectId: string | null = projectId || null;
        if (!defaultProjectId) {
          if (navigationMode === "project") {
            defaultProjectId = selectedProjectId;
          } else if (navigationMode === "my-days") {
            const availableProjects = currentUser
              ? projects.filter(
                  (p) => !p.isArchived && p.memberIds.includes(currentUser.id)
                )
              : [];

            const rememberedProject =
              settings.rememberLastProject && settings.lastSelectedProjectId
                ? availableProjects.find(
                    (p) => p.id === settings.lastSelectedProjectId
                  )
                : null;

            const personalProject = availableProjects.find((p) =>
              p.name.includes("个人事务")
            );

            defaultProjectId =
              rememberedProject?.id ||
              personalProject?.id ||
              availableProjects[0]?.id ||
              null;
          }
        }

        set({
          taskCreation: {
            isOpen: true,
            startDate,
            endDate,
            userId: userId || null,
            // 根据当前导航模式设置默认项目
            projectId: defaultProjectId,
            teamId: null,
          },
        });
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

      openTaskEdit: (task) => {
        if (task.isSystemHoliday) return;

        set({
          taskEdit: {
            isOpen: true,
            task,
          },
        });
      },

      closeTaskEdit: () =>
        set({
          taskEdit: {
            isOpen: false,
            task: null,
          },
        }),

      setHoveredTaskId: (taskId) => set({ hoveredTaskId: taskId }),

      openTeamCreation: () => {
        // TODO: 实现团队创建对话框
        console.log("Open team creation dialog");
      },

      openProjectCreation: () => {
        // TODO: 实现项目创建对话框
        console.log("Open project creation dialog");
      },

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

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
        currentDate: state.currentDate,
        selectedDate: state.selectedDate,
      }),
      // 自定义序列化/反序列化，确保 Date 对象正确处理
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 将字符串转换回 Date 对象
          if (state.currentDate && typeof state.currentDate === 'string') {
            state.currentDate = new Date(state.currentDate);
          }
          if (state.selectedDate && typeof state.selectedDate === 'string') {
            state.selectedDate = new Date(state.selectedDate);
          }
        }
      },
    }
  )
);