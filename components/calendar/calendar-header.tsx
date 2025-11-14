"use client"

import { ChevronLeft, ChevronRight, Calendar,CalendarMinus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { getMonthName } from "@/lib/utils/date-utils"
import { cn } from "@/lib/utils"
import { TaskSizeToggle } from "./task-size-toggle"
import { ListGroupToggle } from "@/components/views/list-group-toggle"
import { ListLayoutToggle } from "@/components/views/list-layout-toggle"

export function CalendarHeader() {
  const { currentDate, setCurrentDate, viewMode, hideWeekends, toggleWeekends, mainViewMode } = useCalendarStore()

  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() - 1)
    setCurrentDate(newDate)
  }

  const goToNextMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + 1)
    setCurrentDate(newDate)
  }

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentDate(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // 判断是否是月视图 (个人周视图除外)
  const isMonthView = viewMode === "month"
  
  // 判断是否是周视图
  const isWeekView = viewMode === "week" || viewMode === "personal"

  const getWeekRange = () => {
    const date = new Date(currentDate)
    const dayOfWeek = date.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() + diff)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    return `${startOfWeek.getMonth() + 1}月${startOfWeek.getDate()}日 - ${endOfWeek.getMonth() + 1}月${endOfWeek.getDate()}日`
  }

  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-semibold text-foreground">
          {isMonthView ? (
            <>
              {getMonthName(currentDate.getMonth())}
              <span className="ml-2 text-muted-foreground">{currentDate.getFullYear()}</span>
            </>
          ) : (
            <>
              {getWeekRange()}
              <span className="ml-2 text-muted-foreground">{currentDate.getFullYear()}</span>
            </>
          )}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        {/* 清单视图下显示分组切换和布局切换 */}
        {mainViewMode === "list" && (
          <>
            <ListGroupToggle />
            <div className="h-6 w-px bg-border" />
            <ListLayoutToggle />
          </>
        )}
        
        {/* 只在日历视图下显示任务条大小切换 */}
        {mainViewMode === "calendar" && <TaskSizeToggle />}
        
        {/* 只在日历视图下显示隐藏周末按钮 */}
        {mainViewMode === "calendar" && (
          <Button 
            variant="outline" 
            size="icon"
            onClick={toggleWeekends}
            className={cn(
              "transition-colors",
              hideWeekends && "bg-primary/10 text-primary hover:bg-primary/20"
            )}
            title={hideWeekends ? "显示周末" : "隐藏周末"}
          >
            <CalendarMinus className="h-4 w-4" />
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={goToToday}>
          <Calendar className="mr-2 h-4 w-4" />
          {isMonthView ? "本月" : "本周"}
        </Button>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={isMonthView ? goToPreviousMonth : goToPreviousWeek}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={isMonthView ? goToNextMonth : goToNextWeek}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
