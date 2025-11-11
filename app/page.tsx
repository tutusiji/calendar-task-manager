"use client"

import Image from "next/image"
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
        <div className="border-b border-border bg-card px-6 py-[15px]">
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
              <h1 className="text-xl font-bold tracking-tight bg-linear-to-r from-purple-600 via-blue-500 to-red-500 bg-clip-text text-transparent font-(family-name:--font-cangji)">
                OxHorse Planner
              </h1>
              <p className="text-xs text-muted-foreground">Every day so happy</p>
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
