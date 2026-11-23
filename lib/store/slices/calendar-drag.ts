import type { StateCreator } from "zustand";
import { taskAPI } from "@/lib/api-client";
import { showToast } from "@/lib/toast";
import type { Task } from "@/lib/types";
import type { CalendarStore } from "../calendar-store";
import { parseApiTask, sortTasksByStartDate } from "../task-normalizer";

export interface CalendarDragState {
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
}

export const createCalendarDrag: StateCreator<CalendarStore, [], [], CalendarDragState> = (set, get) => ({
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
        await get().fetchTasks({
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
});
