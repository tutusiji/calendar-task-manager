import type { StateCreator } from 'zustand'

import { projectAPI, handleAPIError } from '@/lib/api-client'
import { showToast } from '@/lib/toast'

import type { CalendarStore } from '../calendar-store'

export type ProjectActions = Pick<
  CalendarStore,
  | 'fetchProjects'
  | 'addProject'
  | 'updateProject'
  | 'deleteProject'
  | 'leaveProject'
  | 'reorderProjects'
>

export const createProjectActions: StateCreator<
  CalendarStore,
  [],
  [],
  ProjectActions
> = (set, get) => ({
      fetchProjects: async (options) => {
        const silent = options?.silent === true;
        if (!silent) {
          set({ isLoadingProjects: true, error: null });
        }

        try {
          const projectsData = await projectAPI.getAll();
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
            isArchived: project.isArchived || false, // 是否已归档
            archivedAt: project.archivedAt ? new Date(project.archivedAt) : undefined, // 归档时间
            // API 现在直接返回 memberIds 数组
            memberIds: project.memberIds || [],
            createdAt: new Date(project.createdAt),
          }));

          set((state) => {
            const projectIds = new Set(projects.map((p) => p.id));
            const wasAllSelected =
              state.projects.length > 0 &&
              state.selectedProjectIds.length === state.projects.length;
            // 首次加载或此前为全选时默认选中全部；否则保留用户选择，仅剔除已删除项目
            const selectedProjectIds =
              state.projects.length === 0 || wasAllSelected
                ? projects.map((p) => p.id)
                : state.selectedProjectIds.filter((id) => projectIds.has(id));

            return { projects, selectedProjectIds };
          });
        } catch (error) {
          const errorMsg = handleAPIError(error);
          set({ error: errorMsg });
          showToast.error("获取项目失败", errorMsg);
        } finally {
          if (!silent) {
            set({ isLoadingProjects: false });
          }
        }
      },


      addProject: async (project) => {
        try {
          const newProject = await projectAPI.create(project as any);

          // 重新获取项目列表以确保数据同步
          await get().fetchProjects();

          showToast.success("创建成功", `项目 "${newProject.name}" 已创建`);
        } catch (error) {
          const errorMsg = handleAPIError(error);
          set({ error: errorMsg });
          showToast.error("创建失败", errorMsg);
          throw error;
        }
      },

      updateProject: async (id, updatedProject) => {
        try {
          await projectAPI.update(id, updatedProject);

          // 重新获取项目列表以确保数据同步
          await get().fetchProjects();

          showToast.success("更新成功", "项目信息已更新");
        } catch (error) {
          const errorMsg = handleAPIError(error);
          set({ error: errorMsg });
          showToast.error("更新失败", errorMsg);
          throw error;
        }
      },

      deleteProject: async (id) => {
        try {
          await projectAPI.delete(id);

          // 重新获取项目列表以确保数据同步
          await get().fetchProjects();

          showToast.success("删除成功", "项目已删除");
        } catch (error) {
          const errorMsg = handleAPIError(error);
          set({ error: errorMsg });
          showToast.error("删除失败", errorMsg);
          throw error;
        }
      },

      leaveProject: async (id) => {
        try {
          await projectAPI.leave(id);

          // 重新获取项目列表以确保数据同步
          await get().fetchProjects();

          showToast.success("退出成功", "已退出项目");
        } catch (error) {
          const errorMsg = handleAPIError(error);
          set({ error: errorMsg });
          showToast.error("退出失败", errorMsg);
          throw error;
        }
      },


      reorderProjects: async (projectIds, options) => {
        const previousProjects = get().projects;
        const orderMap = new Map(projectIds.map((id, index) => [id, index]));

        set({
          projects: [...previousProjects].sort((a, b) => {
            const aIndex = orderMap.get(a.id);
            const bIndex = orderMap.get(b.id);
            if (aIndex === undefined && bIndex === undefined) return 0;
            if (aIndex === undefined) return 1;
            if (bIndex === undefined) return -1;
            return aIndex - bIndex;
          }),
        });

        if (options?.persist === false) return;

        try {
          await projectAPI.reorder(projectIds);
        } catch (error) {
          set({ projects: previousProjects });
          const errorMsg = handleAPIError(error);
          showToast.error("排序保存失败", errorMsg);
          throw error;
        }
      },

})
