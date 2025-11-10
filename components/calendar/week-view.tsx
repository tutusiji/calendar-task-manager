"use client"

import { useCalendarStore } from "@/lib/store/calendar-store"
import { getWeekDays, getWeekDayName } from "@/lib/utils/date-utils"
import { TeamMemberRow } from "./team-member-row"

export function WeekView() {
  const { currentDate, users } = useCalendarStore()

  const weekDays = getWeekDays(currentDate)

  return (
    <div className="flex h-full flex-col">
      {/* Week day headers */}
      <div className="flex border-b border-border bg-muted/30">
        <div className="w-[120px] shrink-0 border-r border-border px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">团队成员</span>
        </div>
        <div className="flex flex-1">
          {weekDays.map((day, index) => (
            <div key={index} className="flex-1 border-r border-border px-4 py-3 text-center last:border-r-0">
              <div className="text-xs text-muted-foreground">{getWeekDayName(day.getDay())}</div>
              <div className="mt-1 text-sm font-medium text-foreground">{day.getDate()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Team member rows */}
      <div className="flex-1 overflow-y-auto">
        {users.map((user) => (
          <TeamMemberRow key={user.id} user={user} weekDays={weekDays} />
        ))}
      </div>
    </div>
  )
}
