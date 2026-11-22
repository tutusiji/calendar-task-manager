import { useShallow } from 'zustand/react/shallow'

import type { CalendarStore } from './calendar-store'
import { useCalendarStore } from './calendar-store'

/**
 * 只订阅组件真正使用的 Store 字段，避免任一状态变化导致整棵日历重渲染。
 */
export function useCalendarState<T extends keyof CalendarStore>(
  ...keys: T[]
): Pick<CalendarStore, T> {
  return useCalendarStore(
    useShallow((state) => {
      const result = {} as Pick<CalendarStore, T>
      for (const key of keys) {
        result[key] = state[key]
      }
      return result
    })
  )
}
