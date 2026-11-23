import type { StateCreator } from "zustand";
import type { CalendarSettings, ListGroupMode, ListLayoutColumns, MainViewMode, NavigationMode, ViewMode } from "@/lib/types";
import type { CalendarStore } from "../calendar-store";

export interface CalendarViewState {
  // View state
  mainViewMode: MainViewMode; // "calendar" | "list" | "stats" 主视图模式
  listGroupMode: ListGroupMode; // "project" | "date" | "user" 清单分组模式
  listLayoutColumns: ListLayoutColumns; // 清单布局列数: 1 | 2 | 3 | 4
  viewMode: ViewMode; // "month" | "week"
  navigationMode: NavigationMode; // "my-days" | "team" | "project"
  selectedTeamId: string | null;
  selectedProjectId: string | null;
  currentDate: Date;
  miniCalendarDate: Date;
  selectedDate: Date | null;
  selectedProjectIds: string[]; // 选中的项目ID列表，用于过滤
  hideWeekends: boolean; // 是否隐藏周末（周六日）
  taskBarSize: "compact" | "comfortable"; // 任务条大小：紧凑型 | 宽松型
  // Settings
  settings: CalendarSettings;
  setMainViewMode: (mode: MainViewMode) => void; // 设置主视图模式
  setListGroupMode: (mode: ListGroupMode) => void; // 设置清单分组模式
  setListLayoutColumns: (columns: ListLayoutColumns) => void; // 设置清单布局列数
  setViewMode: (mode: ViewMode) => void;
  setNavigationMode: (mode: NavigationMode) => void;
  setSelectedTeamId: (id: string | null) => Promise<void>;
  setSelectedProjectId: (id: string | null) => Promise<void>;
  setCurrentDate: (date: Date) => void;
  setMiniCalendarDate: (date: Date) => void;
  setSelectedDate: (date: Date | null) => void;
  toggleWeekends: () => void; // 切换周末显示/隐藏
  setTaskBarSize: (size: "compact" | "comfortable") => void; // 设置任务条大小
  // 项目过滤
  toggleProjectFilter: (projectId: string) => void;
  selectAllProjects: () => void;
  clearProjectFilter: () => void;
  updateSettings: (settings: Partial<CalendarSettings>) => void;
}

export const createCalendarView: StateCreator<CalendarStore, [], [], CalendarViewState> = (set, get) => ({
  // Initial view state
  mainViewMode: "calendar", // 默认日历视图
  listGroupMode: "date", // 默认按时间分组
  listLayoutColumns: 2, // 默认2列布局
  viewMode: "month",
  navigationMode: "my-days",
  selectedTeamId: null,
  selectedProjectId: null,
  currentDate: new Date(),
  miniCalendarDate: new Date(),
  selectedDate: null,
  selectedProjectIds: [], // 初始为空，等项目加载后设置
  hideWeekends: false, // 默认显示周末
  taskBarSize: "compact", // 默认紧凑型
  // Initial settings
  settings: {
    rememberLastProject: true,
    lastSelectedProjectId: "personal",
  },

  setMainViewMode: (mode) => {
    set({ mainViewMode: mode });
    void get().fetchTasks({ onlyIfChanged: true });
  },
  setListGroupMode: (mode) => set({ listGroupMode: mode }),
  setListLayoutColumns: (columns) => set({ listLayoutColumns: columns }),
  setViewMode: (mode) => {
    set({ viewMode: mode });
    void get().fetchTasks({ onlyIfChanged: true });
  },
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
      void get().fetchTasks({ onlyIfChanged: true });
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
        await get().fetchTasks({ onlyIfChanged: true });
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
        await get().fetchTasks({ onlyIfChanged: true });
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
  setCurrentDate: (date) => {
    const miniDate = get().miniCalendarDate;
    const sameMonth =
      miniDate.getFullYear() === date.getFullYear() && miniDate.getMonth() === date.getMonth();
    set({ currentDate: date, miniCalendarDate: sameMonth ? miniDate : date });
    void get().fetchTasks({ onlyIfChanged: true });
  },
  setMiniCalendarDate: (date) => {
    set({ miniCalendarDate: date });
    void get().fetchTasks({ onlyIfChanged: true });
  },
  setSelectedDate: (date) => set({ selectedDate: date }),
  toggleWeekends: () => {
    set((state) => ({ hideWeekends: !state.hideWeekends }));
    void get().fetchTasks({ onlyIfChanged: true });
  },
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

  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),
});

export const calendarViewPersistence = {
  // 只持久化需要的状态,不持久化 tasks/projects/users/teams 等数据
  partialize: (state: CalendarStore) => ({
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
  onRehydrateStorage: () => (state?: CalendarStore) => {
    if (state) {
      // 将字符串转换回 Date 对象
      if (state.currentDate && typeof state.currentDate === 'string') {
        state.currentDate = new Date(state.currentDate);
      }
      state.miniCalendarDate = state.currentDate;
      if (state.selectedDate && typeof state.selectedDate === 'string') {
        state.selectedDate = new Date(state.selectedDate);
      }
    }
  },
};
