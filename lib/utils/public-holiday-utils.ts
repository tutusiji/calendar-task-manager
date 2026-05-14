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

export function getPublicHolidaysForDate(
  publicHolidays: PublicHoliday[],
  date: Date
) {
  const currentDate = new Date(date)
  currentDate.setHours(0, 0, 0, 0)

  return publicHolidays.filter((holiday) => {
    const startDate = new Date(holiday.startDate)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(holiday.endDate)
    endDate.setHours(0, 0, 0, 0)

    return currentDate >= startDate && currentDate <= endDate
  })
}

export function getPublicHolidayLabelForDate(
  publicHolidays: PublicHoliday[],
  date: Date
) {
  return getPublicHolidaysForDate(publicHolidays, date)
    .map((holiday) => holiday.name)
    .join(" / ")
}
