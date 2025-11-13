"use client"

import Image from "next/image"
import { CalendarHeader } from "@/components/calendar/calendar-header"
import { MonthView } from "@/components/calendar/month-view"
import { WeekView } from "@/components/calendar/week-view"
import { PersonalWeekView } from "@/components/calendar/personal-week-view"
import { ViewToggle } from "@/components/calendar/view-toggle"
import { TaskDetailPanel } from "@/components/task/task-detail-panel"
import { TaskEditPanel } from "@/components/task/task-edit-panel"
import { MiniCalendar } from "@/components/sidebar/mini-calendar"
import { NavigationMenu } from "@/components/sidebar/navigation-menu"
import { UserMenu } from "@/components/user-menu"
import { useCalendarStore } from "@/lib/store/calendar-store"

export default function Home() {
  const { viewMode, navigationMode, taskCreation, closeTaskCreation, taskEdit, closeTaskEdit } = useCalendarStore()

  // 根据 navigationMode 决定渲染哪个视图
  const renderCalendarView = () => {
    if (viewMode === "month") {
      return <MonthView />
    }
    
    // 周视图
    if (navigationMode === "my-days") {
      // My Days 下的周视图是个人单行视图
      return <PersonalWeekView />
    } else {
      // Team 或 Project 下的周视图是团队多行视图
      return <WeekView />
    }
  }

  return (
    <div className="flex h-screen">
      <aside className="w-72 border-r border-border bg-background flex flex-col">
        {/* Logo */}
        <div className="border-b border-border bg-card px-6 py-[18px]">
          <div className="flex items-center gap-3">
            {/* Logo 图片 */}
            <div className="relative w-10 h-10 shrink-0">
              <Image
                src="/logo.png"
                alt="OxHorse Planner Logo"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-linear-to-r from-purple-600 via-blue-500 to-red-500 bg-clip-text text-transparent">
                OxHorse Planner
              </h1>
              <p className="text-xs text-muted-foreground">Every day so happy</p>
            </div>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto">
          <NavigationMenu />
        </div>
        
        {/* Mini Calendar at bottom */}
        <div className="">
          <MiniCalendar />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex-1"></div>
          <div className="flex items-center gap-4">
            <ViewToggle />
            <UserMenu />
          </div>
        </div>

        <CalendarHeader />

        <div className="flex-1 overflow-hidden">{renderCalendarView()}</div>
      </div>

      {taskCreation.isOpen && taskCreation.startDate && taskCreation.endDate && (
        <TaskDetailPanel
          startDate={taskCreation.startDate}
          endDate={taskCreation.endDate}
          onClose={closeTaskCreation}
        />
      )}

      {taskEdit.isOpen && taskEdit.task && <TaskEditPanel task={taskEdit.task} onClose={closeTaskEdit} />}
    </div>
  )
}
