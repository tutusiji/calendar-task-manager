import type { StateCreator } from 'zustand'

import { teamAPI, handleAPIError } from '@/lib/api-client'
import { showToast } from '@/lib/toast'

import type { CalendarStore } from '../calendar-store'

export type TeamActions = Pick<
  CalendarStore,
  | 'fetchTeams'
  | 'addTeam'
  | 'updateTeam'
  | 'deleteTeam'
  | 'leaveTeam'
  | 'reorderTeams'
>

export const createTeamActions: StateCreator<
  CalendarStore,
  [],
  [],
  TeamActions
> = (set, get) => ({
      fetchTeams: async (options) => {
        const silent = options?.silent === true;
        if (!silent) {
          set({ isLoadingTeams: true, error: null });
        }

        try {
          const teamsData = await teamAPI.getAll();
          // 转换数据格式
          const teams = teamsData.map((team: any) => ({
            id: team.id,
            name: team.name,
            description: team.description,
            color: team.color,
            organizationId: team.organizationId,
            creatorId: team.creatorId, // 添加创建者ID
            taskPermission: team.taskPermission || "ALL_MEMBERS", // 任务权限
            // API 现在直接返回 memberIds 数组
            memberIds: team.memberIds || [],
            createdAt: new Date(team.createdAt),
          }));

          set({ teams });
        } catch (error) {
          const errorMsg = handleAPIError(error);
          set({ error: errorMsg });
          showToast.error("获取团队失败", errorMsg);
        } finally {
          if (!silent) {
            set({ isLoadingTeams: false });
          }
        }
      },


      addTeam: async (team) => {
        try {
          const newTeam = await teamAPI.create(team as any);

          // 重新获取团队列表以确保数据同步
          await get().fetchTeams();

          showToast.success("创建成功", `团队 "${newTeam.name}" 已创建`);
        } catch (error) {
          const errorMsg = handleAPIError(error);
          set({ error: errorMsg });
          showToast.error("创建失败", errorMsg);
          throw error;
        }
      },

      updateTeam: async (id, updatedTeam) => {
        try {
          await teamAPI.update(id, updatedTeam);

          // 重新获取团队列表以确保数据同步
          await get().fetchTeams();

          showToast.success("更新成功", "团队信息已更新");
        } catch (error) {
          const errorMsg = handleAPIError(error);
          set({ error: errorMsg });
          showToast.error("更新失败", errorMsg);
          throw error;
        }
      },

      deleteTeam: async (id) => {
        try {
          await teamAPI.delete(id);

          // 重新获取团队列表以确保数据同步
          await get().fetchTeams();

          showToast.success("删除成功", "团队已删除");
        } catch (error) {
          const errorMsg = handleAPIError(error);
          set({ error: errorMsg });
          showToast.error("删除失败", errorMsg);
          throw error;
        }
      },

      leaveTeam: async (id) => {
        try {
          await teamAPI.leave(id);

          // 重新获取团队列表以确保数据同步
          await get().fetchTeams();

          showToast.success("退出成功", "已退出团队");
        } catch (error) {
          const errorMsg = handleAPIError(error);
          set({ error: errorMsg });
          showToast.error("退出失败", errorMsg);
          throw error;
        }
      },


      reorderTeams: async (teamIds, options) => {
        const previousTeams = get().teams;
        const orderMap = new Map(teamIds.map((id, index) => [id, index]));

        set({
          teams: [...previousTeams].sort((a, b) => {
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
          await teamAPI.reorder(teamIds);
        } catch (error) {
          set({ teams: previousTeams });
          const errorMsg = handleAPIError(error);
          showToast.error("排序保存失败", errorMsg);
          throw error;
        }
      },

})
