import type { PublicHoliday, Task } from "../types"

export const SYSTEM_HOLIDAY_OWNER_ID = "__system_public_holiday__"

export function toPublicHolidayTask(holiday: PublicHoliday): Task {
  return {
    id: `public-holiday:${holiday.id}`,
    holidayId: holiday.id,
    title: holiday.name,
    startDate: holiday.startDate,
    endDate: holiday.endDate,
    type: "vacation",
    progress: 100,
    projectId: SYSTEM_HOLIDAY_OWNER_ID,
    creatorId: SYSTEM_HOLIDAY_OWNER_ID,
    isSystemHoliday: true,
  }
}

export function toPublicHolidayTasks(publicHolidays: PublicHoliday[]) {
  return publicHolidays.map(toPublicHolidayTask)
}
