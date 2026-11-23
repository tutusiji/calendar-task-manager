import type { StateCreator } from "zustand";
import type { Task } from "@/lib/types";
import type { CalendarStore } from "../calendar-store";

export interface CalendarTaskEditorState {
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
}

export const createCalendarTaskEditor: StateCreator<CalendarStore, [], [], CalendarTaskEditorState> = (set, get) => ({
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
});
