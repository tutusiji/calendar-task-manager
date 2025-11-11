"use client"

import { CalendarHeader } from "@/components/calendar/calendar-header"
import { MonthView } from "@/components/calendar/month-view"
import { WeekView } from "@/components/calendar/week-view"
import { ViewToggle } from "@/components/calendar/view-toggle"
import { TaskDetailPanel } from "@/components/task/task-detail-panel"
import { TaskEditPanel } from "@/components/task/task-edit-panel"
import { MiniCalendar } from "@/components/sidebar/mini-calendar"
import { ProjectList } from "@/components/sidebar/project-list"
import { useCalendarStore } from "@/lib/store/calendar-store"

export default function Home() {
  const { viewMode, taskCreation, closeTaskCreation, taskEdit, closeTaskEdit } = useCalendarStore()

  return (
    <div className="flex h-screen">
      <aside className="w-72 border-r border-border bg-background flex flex-col">
        {/* Logo */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              {/* 积木块组合 - 表示计划和任务的拼接 */}
              <div className="absolute top-0 left-0 w-5 h-5 bg-purple-500 rounded-sm shadow-md transform -rotate-6"></div>
              <div className="absolute top-0 right-0 w-5 h-5 bg-blue-500 rounded-sm shadow-md transform rotate-6"></div>
              <div className="absolute bottom-0 left-0 w-5 h-5 bg-blue-400 rounded-sm shadow-md transform rotate-3"></div>
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-red-500 rounded-sm shadow-md transform -rotate-3"></div>
              {/* 中心连接点 */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-lg"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-linear-to-r from-purple-600 via-blue-500 to-red-500 bg-clip-text text-transparent">
                OxHorse Planner
              </h1>
              <p className="text-xs text-muted-foreground">Happy every day</p>
            </div>
          </div>
        </div>
        
        {/* Sidebar Content */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <MiniCalendar />
          <ProjectList />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-end border-b border-border bg-card px-6 py-4">
          <ViewToggle />
        </div>

        <CalendarHeader />

        <div className="flex-1 overflow-hidden">{viewMode === "personal" ? <MonthView /> : <WeekView />}</div>
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
