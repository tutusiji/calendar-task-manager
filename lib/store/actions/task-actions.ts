import type { StateCreator } from 'zustand'

import { taskAPI, handleAPIError } from '@/lib/api-client'
import type { TaskRecurrenceConfig } from '@/lib/types'
import { showToast } from '@/lib/toast'
import {
  canCreateTaskInProject,
  canDeleteTaskInProject,
  canEditTaskInProject,
  getPermissionDeniedMessage,
} from '@/lib/utils/permission-utils'

import type { CalendarStore } from '../calendar-store'
import { getFiltersForCurrentNavigation } from '../api-filters'
import { parseApiTask, sortTasksByStartDate } from '../task-normalizer'

export type TaskActions = Pick<
  CalendarStore,
  | 'fetchTasks'
  | 'addTask'
  | 'updateTask'
  | 'stopRecurringTask'
  | 'deleteTask'
>

export const createTaskActions: StateCreator<
  CalendarStore,
  [],
  [],
  TaskActions
> = (set, get) => {
  const markTaskPending = (taskId: string, pending: boolean) => {
    if (pending) {
      get().startTaskPending(taskId)
    } else {
      get().finishTaskPending(taskId)
    }
  }

  return {
      fetchTasks: async (filters, options) => {
        const silent = options?.silent === true;
        if (!silent) {
          set({ isLoadingTasks: true, error: null });
        }

        try {
          const apiFilters: any = {};
          if (filters) {
            if (filters.userId) apiFilters.userId = filters.userId;
            if (filters.projectId) apiFilters.projectId = filters.projectId;
            if (filters.teamId) apiFilters.teamId = filters.teamId;
            if (filters.startDate)
              apiFilters.startDate = filters.startDate.toISOString();
            if (filters.endDate)
              apiFilters.endDate = filters.endDate.toISOString();
          }

          const tasksData = await taskAPI.getAll(apiFilters);
          const tasks = tasksData.map(parseApiTask);

          set({ tasks });
        } catch (error) {
          const errorMsg = handleAPIError(error);
          console.error("Fetch tasks error:", errorMsg, error);

          // 显示错误提示但不设置全局 error 状态，避免阻塞界面
          showToast.error("获取任务失败", errorMsg);

          // 如果是认证错误，才设置全局 error
          if (
            errorMsg.includes("认证") ||
            errorMsg.includes("Token") ||
            errorMsg.includes("登录")
          ) {
            set({ error: errorMsg });
          }
        } finally {
          if (!silent) {
            set({ isLoadingTasks: false });
          }
        }
      },


      addTask: async (task) => {
        const { currentUser, projects, teams } = get();

        // 权限检查
        if (currentUser) {
          const project = projects.find((p) => p.id === task.projectId);
          if (project) {
            const assigneeIds = task.userId
              ? Array.isArray(task.userId)
                ? task.userId
                : [task.userId]
              : [currentUser.id];
            const hasPermission = canCreateTaskInProject(
              currentUser.id,
              project,
              assigneeIds,
              currentUser.isAdmin
            );

            if (!hasPermission) {
              const errorMsg = getPermissionDeniedMessage(
                project.taskPermission
              );
              set({ error: errorMsg });
              showToast.error("权限不足", errorMsg);
              throw new Error(errorMsg);
            }
          }
        }

        try {
          const createdTask = parseApiTask(await taskAPI.create(task as any));

          // 直接用接口返回的完整任务更新本地状态，避免整表重拉
          set((state) => {
            if (state.tasks.some((t) => t.id === createdTask.id)) {
              return {};
            }
            return {
              tasks: sortTasksByStartDate([...state.tasks, createdTask]),
            };
          });

          // 创建任务可能导致后端自动添加成员，静默刷新项目/团队（不显示 loading）
          if (task.projectId) {
            void get()
              .fetchProjects({ silent: true })
              .catch((error) =>
                console.error(
                  "Background project refresh failed after task creation:",
                  error
                )
              );
          }
          if (task.teamId) {
            void get()
              .fetchTeams({ silent: true })
              .catch((error) =>
                console.error(
                  "Background team refresh failed after task creation:",
                  error
                )
              );
          }

          // 定时任务会在服务端生成后续事项，静默补齐后续列表
          if (task.recurrence) {
            void get()
              .fetchTasks(getFiltersForCurrentNavigation(get()), {
                silent: true,
              })
              .catch((error) =>
                console.error(
                  "Background task refresh failed after recurring task creation:",
                  error
                )
              );
          }
        } catch (error) {
          const errorMsg = handleAPIError(error);
          set({ error: errorMsg });
          throw error;
        }
      },

      updateTask: async (id, updatedTask) => {
        const { currentUser, projects, tasks } = get();

        // 权限检查
        if (currentUser) {
          const task = tasks.find((t) => t.id === id);
          const project = task
            ? projects.find((p) => p.id === task.projectId)
            : null;
          const currentAssigneeIds =
            task?.assignees?.map((assignee) => assignee.userId) || [];
          const nextAssigneeIds =
            updatedTask.userId !== undefined
              ? Array.isArray(updatedTask.userId)
                ? updatedTask.userId
                : [updatedTask.userId]
              : undefined;
          const isProjectReassignment =
            updatedTask.projectId !== undefined &&
            updatedTask.projectId !== task?.projectId;

          if (isProjectReassignment) {
            const targetProject = projects.find(
              (p) => p.id === updatedTask.projectId
            );

            if (!targetProject || !targetProject.memberIds.includes(currentUser.id)) {
              const errorMsg = "只有目标项目成员才可以将事项迁移到该项目";
              set({ error: errorMsg });
              showToast.error("权限不足", errorMsg);
              throw new Error(errorMsg);
            }

            const effectiveAssigneeIds = nextAssigneeIds || currentAssigneeIds;
            const canMoveIntoTargetProject = canCreateTaskInProject(
              currentUser.id,
              targetProject,
              effectiveAssigneeIds,
              currentUser.isAdmin
            );

            if (!canMoveIntoTargetProject) {
              const errorMsg = getPermissionDeniedMessage(
                targetProject.taskPermission
              );
              set({ error: errorMsg });
              showToast.error("权限不足", errorMsg);
              throw new Error(errorMsg);
            }
          }

          if (project) {
            const hasProjectPermission = canEditTaskInProject(
              currentUser.id,
              project,
              currentAssigneeIds,
              nextAssigneeIds,
              currentUser.isAdmin
            );

            // 迁移项目归属不受源项目协同权限限制，但仍然需要目标项目成员校验
            if (!hasProjectPermission && !isProjectReassignment) {
              const errorMsg = getPermissionDeniedMessage(
                project.taskPermission
              );
              set({ error: errorMsg });
              showToast.error("权限不足", errorMsg);
              throw new Error(errorMsg);
            }
          }
        }

        try {
          markTaskPending(id, true);
          // 记录修改前的任务信息
          const originalTask = tasks.find((t) => t.id === id);

          const updated = parseApiTask(await taskAPI.update(id, updatedTask));

          // 用接口返回的完整任务替换本地状态，避免整表重拉
          set((state) => {
            const exists = state.tasks.some((t) => t.id === updated.id);
            return {
              tasks: exists
                ? sortTasksByStartDate(
                    state.tasks.map((t) => (t.id === updated.id ? updated : t))
                  )
                : sortTasksByStartDate([...state.tasks, updated]),
            };
          });

          // 检查是否需要刷新项目/团队数据(因为后端可能自动添加了新成员)
          const needRefreshProjects =
            updatedTask.projectId !== undefined &&
            updatedTask.projectId !== originalTask?.projectId;
          const needRefreshTeams =
            updatedTask.teamId !== undefined &&
            updatedTask.teamId !== originalTask?.teamId;

          if (needRefreshProjects) {
            void get()
              .fetchProjects({ silent: true })
              .catch((error) =>
                console.error(
                  "Background project refresh failed after task update:",
                  error
                )
              );
          }
          if (needRefreshTeams) {
            void get()
              .fetchTeams({ silent: true })
              .catch((error) =>
                console.error(
                  "Background team refresh failed after task update:",
                  error
                )
              );
          }

          // 基于本地新数据判断任务是否已移出当前视图
          const { navigationMode, selectedProjectId, currentUser } = get();
          let taskMovedOut = false;

          if (navigationMode === "project" && selectedProjectId) {
            if (updated.projectId && updated.projectId !== selectedProjectId) {
              taskMovedOut = true;
            }
          } else if (navigationMode === "my-days" && currentUser) {
            const isStillAssignee =
              updated.assignees?.some(
                (assignee) => assignee.userId === currentUser.id
              ) || updated.creatorId === currentUser.id;

            if (!isStillAssignee) {
              taskMovedOut = true;
            }
          }

          if (taskMovedOut) {
            const taskTitle = updated.title || originalTask?.title || "任务";
            if (navigationMode === "project") {
              const newProject = get().projects.find(
                (p) => p.id === updated.projectId
              );
              showToast.success(
                "任务已移动",
                `「${taskTitle}」已移动到项目「${
                  newProject?.name || "其他项目"
                }」`
              );
            } else if (navigationMode === "my-days") {
              showToast.success(
                "任务已转移",
                `「${taskTitle}」的负责人已变更，任务已从您的视图中移出`
              );
            }
          }
        } catch (error) {
          const errorMsg = handleAPIError(error);
          set({ error: errorMsg });
          throw error;
        } finally {
          markTaskPending(id, false);
        }
      },

      stopRecurringTask: async (id) => {
        try {
          markTaskPending(id, true);
          const result = await taskAPI.stopRecurring(id);
          const stopsAfter = new Date(result.stopsAfter).getTime();

          // 本地移除该定时任务中停止日期之后的事项，避免整表重拉
          set((state) => ({
            tasks: state.tasks.filter((task) => {
              if (task.recurringSeriesId !== result.recurringSeriesId) {
                return true;
              }
              if (!task.recurrenceDate) {
                return true;
              }
              return task.recurrenceDate.getTime() <= stopsAfter;
            }),
          }));
        } catch (error) {
          const errorMsg = handleAPIError(error);
          set({ error: errorMsg });
          throw error;
        } finally {
          markTaskPending(id, false);
        }
      },

      deleteTask: async (id) => {
        const { currentUser, projects, tasks } = get();

        // 权限检查
        if (currentUser) {
          const task = tasks.find((t) => t.id === id);
          const project = task
            ? projects.find((p) => p.id === task.projectId)
            : null;
          const currentAssigneeIds =
            task?.assignees?.map((assignee) => assignee.userId) || [];

          if (project) {
            const hasPermission = canDeleteTaskInProject(
              currentUser.id,
              project,
              currentAssigneeIds,
              currentUser.isAdmin
            );

            if (!hasPermission) {
              const errorMsg = getPermissionDeniedMessage(
                project.taskPermission
              );
              set({ error: errorMsg });
              showToast.error("权限不足", errorMsg);
              throw new Error(errorMsg);
            }
          }
        }

        try {
          markTaskPending(id, true);
          await taskAPI.delete(id);

          // 删除成功后直接从本地状态移除，避免整表重拉
          set((state) => ({
            tasks: state.tasks.filter((task) => task.id !== id),
          }));
        } catch (error) {
          const errorMsg = handleAPIError(error);
          set({ error: errorMsg });
          throw error;
        } finally {
          markTaskPending(id, false);
        }
      },

  };
};
