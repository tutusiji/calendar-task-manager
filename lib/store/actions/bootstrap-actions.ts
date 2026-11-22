import type { StateCreator } from 'zustand'

import { publicHolidayAPI, handleAPIError } from '@/lib/api-client'
import type { User } from '@/lib/types'

import type { CalendarStore } from '../calendar-store'
import { getFiltersForCurrentNavigation } from '../api-filters'

export type BootstrapActions = Pick<
  CalendarStore,
  'fetchPublicHolidays' | 'fetchAllData' | 'setError'
>

export const createBootstrapActions: StateCreator<
  CalendarStore,
  [],
  [],
  BootstrapActions
> = (set, get) => ({
      fetchPublicHolidays: async () => {
        try {
          const holidaysData = await publicHolidayAPI.getAll();
          const publicHolidays = holidaysData.map((holiday: any) => ({
            ...holiday,
            startDate: new Date(holiday.startDate),
            endDate: new Date(holiday.endDate),
          }));

          set({ publicHolidays });
        } catch (error) {
          const errorMsg = handleAPIError(error);
          console.error("Fetch public holidays error:", errorMsg, error);
          set({ publicHolidays: [] });
        }
      },


      fetchAllData: async () => {
        const store = get();

        // 先从 localStorage 加载用户
        let currentUser: User | null = null;
        if (typeof window !== "undefined") {
          const currentUserStr = localStorage.getItem("currentUser");
          if (currentUserStr) {
            try {
              currentUser = JSON.parse(currentUserStr);
              set({ currentUser });
            } catch (e) {
              console.error("Failed to parse current user:", e);
            }
          }
        }

        // 任务与基础数据并行加载；节假日不阻塞首屏，后台加载即可
        const initialFilters = getFiltersForCurrentNavigation(get());
        const taskPromise = store.fetchTasks(initialFilters);
        void store.fetchPublicHolidays();

        await Promise.all([
          store.fetchUsers(),
          store.fetchTeams(),
          store.fetchProjects(),
          taskPromise,
        ]);

        // 获取加载后的数据状态
        const {
          navigationMode,
          selectedTeamId,
          selectedProjectId,
          teams,
          projects,
        } = get();

        // 验证导航状态的有效性,确保选中的团队/项目仍然存在
        let needsReset = false;

        if (navigationMode === "team" && selectedTeamId) {
          // 检查选中的团队是否存在
          const teamExists = teams.some((t) => t.id === selectedTeamId);
          if (!teamExists) {
            console.warn(
              `Selected team ${selectedTeamId} no longer exists, resetting to My Days`
            );
            needsReset = true;
          }
        } else if (navigationMode === "project" && selectedProjectId) {
          // 检查选中的项目是否存在
          const projectExists = projects.some(
            (p) => p.id === selectedProjectId
          );
          if (!projectExists) {
            console.warn(
              `Selected project ${selectedProjectId} no longer exists, resetting to My Days`
            );
            needsReset = true;
          }
        } else if (navigationMode !== "my-days") {
          // 如果 navigationMode 不是合法值,重置
          console.warn(
            `Invalid navigation mode ${navigationMode}, resetting to My Days`
          );
          needsReset = true;
        }

        // 如果需要重置,设置为 My Days 并重新加载当前用户的任务
        if (needsReset) {
          set({
            navigationMode: "my-days",
            selectedTeamId: null,
            selectedProjectId: null,
            selectedProjectIds: projects.map(p => p.id), // 恢复所有项目
          });

          if (currentUser) {
            await store.fetchTasks({ userId: currentUser.id });
          }
        }

        set({ hasLoadedTasks: true });
      },


      setError: (error) => set({ error }),
})
