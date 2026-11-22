import type { StateCreator } from 'zustand'

import { userAPI, handleAPIError } from '@/lib/api-client'
import type { User } from '@/lib/types'
import { showToast } from '@/lib/toast'

import type { CalendarStore } from '../calendar-store'

export type UserActions = Pick<
  CalendarStore,
  | 'fetchUsers'
  | 'setCurrentUserFromStorage'
  | 'setCurrentUser'
>

export const createUserActions: StateCreator<
  CalendarStore,
  [],
  [],
  UserActions
> = (set, get) => ({
      fetchUsers: async () => {
        set({ isLoadingUsers: true, error: null });

        try {
          const users = await userAPI.getAll();
          set({ users });
        } catch (error) {
          const errorMsg = handleAPIError(error);
          set({ error: errorMsg });
          showToast.error("获取用户失败", errorMsg);
        } finally {
          set({ isLoadingUsers: false });
        }
      },


      setCurrentUserFromStorage: () => {
        if (typeof window !== "undefined") {
          const currentUserStr = localStorage.getItem("currentUser");
          if (currentUserStr) {
            try {
              const user = JSON.parse(currentUserStr);
              set({ currentUser: user });
            } catch (e) {
              console.error("Failed to parse current user:", e);
            }
          }
        }
      },

      setCurrentUser: (user: User) => {
        set({ currentUser: user });
      },

})
