"use client"

import { useMemo } from "react"
import { Calendar, Clock, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { filterTasksByDateRange } from "@/lib/store/task-filters"
import type { Task } from "@/lib/types"
import { formatDate, getMonthDays, getWeekDayName, isSameDay } from "@/lib/utils/date-utils"
import { cn } from "@/lib/utils"

export interface PanoramaTaskPerson {
  id: string
  name: string
  avatar?: string | null
}

export interface PanoramaTask {
  id: string
  title: string
  description?: string | null
  startDate: Date
  endDate: Date
  startTime?: string | null
  endTime?: string | null
  type: string
  color?: string | null
  progress: number
  projectId: string
  teamId?: string | null
  creatorId: string
  creator: PanoramaTaskPerson
  assignees: Array<{
    id?: string
    userId?: string
    user: PanoramaTaskPerson
  }>
  project?: { id: string; name: string; color: string } | null
  team?: { id: string; name: string; color: string } | null
}

/** 将 panorama API 返回的事项转换为带 Date 字段的前端结构 */
export function parsePanoramaTasks(raw: unknown): PanoramaTask[] {
  if (!Array.isArray(raw)) return []

  return (raw as Array<Record<string, unknown>>).map((item) => ({
    ...(item as unknown as PanoramaTask),
    startDate: new Date(item.startDate as string),
    endDate: new Date(item.endDate as string),
    progress: typeof item.progress === "number" ? item.progress : 0,
    assignees: Array.isArray(item.assignees)
      ? (item.assignees as PanoramaTask["assignees"])
      : [],
  }))
}

// filterTasksByDateRange 只依赖 startDate/endDate，panorama 的轻量结构可直接复用
const asTaskList = (tasks: PanoramaTask[]) => tasks as unknown as Task[]

/** 复用主应用的日期区间过滤语义（与月/周/清单一致） */
export function filterPanoramaTasksByDateRange(
  tasks: PanoramaTask[],
  rangeStart: Date,
  rangeEnd: Date
): PanoramaTask[] {
  return filterTasksByDateRange(
    asTaskList(tasks),
    rangeStart,
    rangeEnd
  ) as unknown as PanoramaTask[]
}

export function getTaskTypeLabel(type: string): string {
  switch (type) {
    case "daily":
      return "日常"
    case "meeting":
      return "会议"
    case "vacation":
      return "假期"
    default:
      return "任务"
  }
}

function getTaskTypeClass(type: string): string {
  switch (type) {
    case "daily":
      return "bg-blue-500"
    case "meeting":
      return "bg-yellow-500"
    case "vacation":
      return "bg-red-500"
    default:
      return "bg-slate-500"
  }
}

function taskColor(task: PanoramaTask): string {
  return task.project?.color || task.color || "#6366f1"
}

function formatTaskRange(task: PanoramaTask): string {
  const start = formatDate(task.startDate)
  const end = formatDate(task.endDate)
  return start === end ? start : `${start} ~ ${end}`
}

function TaskPerson({ person, size = "sm" }: { person: PanoramaTaskPerson; size?: "sm" | "md" }) {
  return (
    <div className="flex items-center gap-1">
      <Avatar className={size === "sm" ? "h-5 w-5" : "h-8 w-8"}>
        <AvatarImage src={person.avatar ?? undefined} alt={person.name} />
        <AvatarFallback className="text-xs">{person.name?.charAt(0)}</AvatarFallback>
      </Avatar>
      <span className="truncate text-xs text-muted-foreground">{person.name}</span>
    </div>
  )
}

export function PanoramaTaskMonthView({
  tasks,
  currentDate,
  onTaskClick,
}: {
  tasks: PanoramaTask[]
  currentDate: Date
  onTaskClick: (task: PanoramaTask) => void
}) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const today = new Date()

  const days = useMemo(() => getMonthDays(year, month), [year, month])

  const tasksByDay = useMemo(() => {
    const map = new Map<string, PanoramaTask[]>()
    const taskList = asTaskList(tasks)
    for (const day of days) {
      const matched = filterTasksByDateRange(taskList, day, day) as unknown as PanoramaTask[]
      if (matched.length > 0) {
        map.set(formatDate(day), matched)
      }
    }
    return map
  }, [days, tasks])

  const monthTaskCount = useMemo(() => {
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0)
    return filterTasksByDateRange(asTaskList(tasks), start, end).length
  }, [tasks, year, month])

  const weekLabels = ["一", "二", "三", "四", "五", "六", "日"]

  return (
    <div className="flex h-full flex-col">
      {monthTaskCount === 0 && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          本月暂无事项
        </div>
      )}
      <div className="grid grid-cols-7 border-b pb-1 text-center text-xs font-medium text-muted-foreground">
        {weekLabels.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6 gap-px bg-border">
        {days.map((day) => {
          const dayTasks = tasksByDay.get(formatDate(day)) ?? []
          const visible = dayTasks.slice(0, 3)
          const hidden = dayTasks.length - visible.length
          const inMonth = day.getMonth() === month
          const isToday = isSameDay(day, today)

          return (
            <div
              key={formatDate(day)}
              className={cn(
                "flex min-h-0 flex-col gap-1 bg-background p-1.5",
                !inMonth && "bg-muted/30 text-muted-foreground"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-xs",
                    isToday && "bg-primary font-semibold text-primary-foreground"
                  )}
                >
                  {day.getDate()}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">{dayTasks.length}</span>
                )}
              </div>
              <div className="flex min-h-0 flex-col gap-0.5 overflow-hidden">
                {visible.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onTaskClick(task)}
                    title={task.title}
                    className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] leading-tight text-white transition-opacity hover:opacity-80"
                    style={{ backgroundColor: taskColor(task) }}
                  >
                    <span className="truncate">{task.title}</span>
                  </button>
                ))}
                {hidden > 0 && (
                  <button
                    type="button"
                    onClick={() => onTaskClick(dayTasks[visible.length])}
                    className="w-full rounded px-1 text-left text-[11px] text-muted-foreground hover:underline"
                  >
                    +{hidden} 更多
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function PanoramaTaskListView({
  tasks,
  currentDate,
  onTaskClick,
}: {
  tasks: PanoramaTask[]
  currentDate: Date
  onTaskClick: (task: PanoramaTask) => void
}) {
  const groups = useMemo(() => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const inMonth = filterTasksByDateRange(asTaskList(tasks), monthStart, monthEnd) as unknown as PanoramaTask[]

    const byDay = new Map<string, PanoramaTask[]>()
    for (const task of inMonth) {
      const key = formatDate(task.startDate)
      const list = byDay.get(key) ?? []
      list.push(task)
      byDay.set(key, list)
    }

    return Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, list]) => ({
        key,
        date: list[0].startDate,
        tasks: [...list].sort((a, b) => {
          const at = a.startTime ?? ""
          const bt = b.startTime ?? ""
          return at.localeCompare(bt)
        }),
      }))
  }, [tasks, currentDate])

  if (groups.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <Calendar className="mb-2 h-12 w-12 opacity-20" />
        <p className="text-sm">本月暂无事项</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 items-start gap-x-5 gap-y-6 xl:grid-cols-2 2xl:grid-cols-3">
      {groups.map((group) => (
        <div key={group.key} className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-sm font-semibold">
              {group.date.getMonth() + 1}月{group.date.getDate()}日 {getWeekDayName(group.date.getDay())}
            </h3>
            <span className="text-xs text-muted-foreground">{group.tasks.length} 个事项</span>
          </div>
          <div className="space-y-2">
            {group.tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onTaskClick(task)}
                className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1">
                      {task.project && (
                        <Badge style={{ backgroundColor: task.project.color }} className="px-1.5 py-0 text-xs text-white">
                          {task.project.name}
                        </Badge>
                      )}
                      {task.team && (
                        <Badge style={{ backgroundColor: task.team.color }} className="px-1.5 py-0 text-xs text-white">
                          {task.team.name}
                        </Badge>
                      )}
                      <Badge variant="outline" className="px-1.5 py-0 text-xs">
                        {getTaskTypeLabel(task.type)}
                      </Badge>
                    </div>
                    <h4 className="truncate text-sm font-medium">{task.title}</h4>
                    {task.description && (
                      <p className="line-clamp-1 text-xs text-muted-foreground">{task.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatTaskRange(task)}
                      </span>
                      {task.startTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.startTime}
                          {task.endTime ? ` - ${task.endTime}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="flex -space-x-1">
                      {task.assignees.slice(0, 3).map((assignee) => (
                        <Avatar key={assignee.user.id} className="h-5 w-5 border border-background">
                          <AvatarImage src={assignee.user.avatar ?? undefined} alt={assignee.user.name} />
                          <AvatarFallback className="text-xs">{assignee.user.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <div className="flex w-24 items-center gap-1">
                      <Progress value={task.progress} className="h-1.5" />
                      <span className="text-[10px] text-muted-foreground">{task.progress}%</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function PanoramaTaskDetailDialog({
  task,
  open,
  onOpenChange,
}: {
  task: PanoramaTask | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {task ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6">{task.title}</DialogTitle>
              <DialogDescription>
                {task.project?.name ? `${task.project.name} · ` : ""}
                {getTaskTypeLabel(task.type)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1">
                {task.project && (
                  <Badge style={{ backgroundColor: task.project.color }} className="text-xs text-white">
                    {task.project.name}
                  </Badge>
                )}
                {task.team && (
                  <Badge style={{ backgroundColor: task.team.color }} className="text-xs text-white">
                    {task.team.name}
                  </Badge>
                )}
                <Badge variant="outline" className={cn("text-xs text-white", getTaskTypeClass(task.type))}>
                  {getTaskTypeLabel(task.type)}
                </Badge>
              </div>

              {task.description && (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{task.description}</p>
              )}

              <div className="grid gap-3 rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatTaskRange(task)}</span>
                </div>
                {(task.startTime || task.endTime) && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {task.startTime || "--:--"}
                      {task.endTime ? ` - ${task.endTime}` : ""}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">进度</span>
                  <Progress value={task.progress} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground">{task.progress}%</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">创建人</p>
                  <TaskPerson person={task.creator} size="md" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">负责人</p>
                  {task.assignees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">未指派</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {task.assignees.map((assignee) => (
                        <TaskPerson key={assignee.user.id} person={assignee.user} size="md" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
