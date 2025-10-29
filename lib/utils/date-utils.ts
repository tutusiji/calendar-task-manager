export function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days: Date[] = []

  // Add previous month's days to fill the first week
  const firstDayOfWeek = firstDay.getDay()
  const prevMonthLastDay = new Date(year, month, 0)
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push(new Date(year, month - 1, prevMonthLastDay.getDate() - i))
  }

  // Add current month's days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i))
  }

  // Add next month's days to fill the last week
  const remainingDays = 42 - days.length // 6 weeks * 7 days
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(year, month + 1, i))
  }

  return days
}

export function getWeekDays(date: Date): Date[] {
  const days: Date[] = []
  const currentDay = new Date(date)
  const dayOfWeek = currentDay.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Monday as first day

  currentDay.setDate(currentDay.getDate() + diff)

  for (let i = 0; i < 7; i++) {
    days.push(new Date(currentDay))
    currentDay.setDate(currentDay.getDate() + 1)
  }

  return days
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

export function getMonthName(month: number): string {
  const months = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]
  return months[month]
}

export function getWeekDayName(day: number): string {
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
  return days[day]
}
