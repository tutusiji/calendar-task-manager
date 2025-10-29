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
      <aside className="w-72 border-r border-border bg-background p-4 space-y-4 overflow-y-auto">
        <MiniCalendar />
        <ProjectList />
      </aside>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
          <h1 className="text-xl font-semibold text-foreground">日历任务管理</h1>
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
