"use client"

import { useMemo, useState } from "react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { format, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Clock, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Task } from "@/lib/types"
import { copyToClipboard } from "@/lib/utils/clipboard"

interface GroupedTasks {
  id: string
  title: string
  color?: string
  tasks: Task[]
}

export function ListView() {
  const {
    tasks,
    currentDate,
    viewMode,
    selectedProjectIds,
    navigationMode,
    selectedTeamId,
    selectedProjectId,
    currentUser,
    getTeamById,
    getProjectById,
    getUserById,
    listGroupMode,
    listLayoutColumns,
  } = useCalendarStore()

  const [copiedId, setCopiedId] = useState<string | null>(null)

  // 计算日期范围
  const dateRange = useMemo(() => {
    if (viewMode === "personal" || viewMode === "week") {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      }
    } else {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      }
    }
  }, [currentDate, viewMode])

  // 过滤任务
  const filteredTasks = useMemo(() => {
    // 如果 currentUser 为空，返回空数组
    if (!currentUser) return []
    
    let filtered = tasks

    if (navigationMode === "my-days") {
      if (selectedProjectIds.length === 0) return []
      filtered = filtered.filter(
        (task) => selectedProjectIds.includes(task.projectId) && 
          (task.assignees?.some(a => a.userId === currentUser.id) || task.creatorId === currentUser.id)
      )
    } else if (navigationMode === "team" && selectedTeamId) {
      const team = getTeamById(selectedTeamId)
      if (team) {
        filtered = filtered.filter((task) => 
          task.assignees?.some(a => team.memberIds.includes(a.userId)) ||
          team.memberIds.includes(task.creatorId)
        )
      }
    } else if (navigationMode === "project" && selectedProjectId) {
      const project = getProjectById(selectedProjectId)
      if (project) {
        filtered = filtered.filter(
          (task) => task.projectId === selectedProjectId && 
            (task.assignees?.some(a => project.memberIds.includes(a.userId)) ||
            project.memberIds.includes(task.creatorId))
        )
      }
    } else {
      if (selectedProjectIds.length === 0) return []
      filtered = filtered.filter((task) => selectedProjectIds.includes(task.projectId))
    }

    return filtered.filter((task) => {
      const taskStart = new Date(task.startDate)
      const taskEnd = new Date(task.endDate)
      taskStart.setHours(0, 0, 0, 0)
      taskEnd.setHours(23, 59, 59, 999)

      return (
        isWithinInterval(taskStart, { start: dateRange.start, end: dateRange.end }) ||
        isWithinInterval(taskEnd, { start: dateRange.start, end: dateRange.end }) ||
        (taskStart <= dateRange.start && taskEnd >= dateRange.end)
      )
    })
  }, [
    tasks,
    navigationMode,
    selectedTeamId,
    selectedProjectId,
    selectedProjectIds,
    currentUser,
    getTeamById,
    getProjectById,
    dateRange,
  ])

  // 根据分组模式对任务分组
  const groupedTasks = useMemo((): GroupedTasks[] => {
    if (listGroupMode === "project") {
      // 按项目分组
      const projectMap = new Map<string, Task[]>()
      filteredTasks.forEach((task) => {
        if (!projectMap.has(task.projectId)) {
          projectMap.set(task.projectId, [])
        }
        projectMap.get(task.projectId)!.push(task)
      })

      return Array.from(projectMap.entries()).map(([projectId, tasks]) => {
        const project = getProjectById(projectId)
        return {
          id: projectId,
          title: project?.name || "未知项目",
          color: project?.color,
          tasks: tasks.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
        }
      })
    } else if (listGroupMode === "user") {
      // 按人头分组（按任务负责人分组）
      const userMap = new Map<string, Task[]>()
      filteredTasks.forEach((task) => {
        // 优先使用第一个负责人，如果没有负责人则使用创建人
        const userId = task.assignees?.[0]?.userId || task.creatorId
        if (!userMap.has(userId)) {
          userMap.set(userId, [])
        }
        userMap.get(userId)!.push(task)
      })

      return Array.from(userMap.entries()).map(([userId, tasks]) => {
        const user = getUserById(userId)
        return {
          id: userId,
          title: user?.name || user?.username || "未知用户",
          tasks: tasks.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
        }
      })
    } else {
      // 按时间分组 (按日期)
      const dateMap = new Map<string, Task[]>()
      filteredTasks.forEach((task) => {
        const dateKey = format(startOfDay(new Date(task.startDate)), "yyyy-MM-dd")
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, [])
        }
        dateMap.get(dateKey)!.push(task)
      })

      return Array.from(dateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, tasks]) => ({
          id: dateKey,
          title: format(new Date(dateKey), "M月d日 EEEE", { locale: zhCN }),
          tasks: tasks.sort((a, b) => {
            if (a.startTime && b.startTime) {
              return a.startTime.localeCompare(b.startTime)
            }
            return 0
          }),
        }))
    }
  }, [filteredTasks, listGroupMode, getProjectById, getUserById])

  // 复制卡片内容
  const handleCopy = async (group: GroupedTasks) => {
    let content = `${group.title}\n\n`
    
    group.tasks.forEach((task) => {
      // 获取所有负责人
      const assignees = task.assignees && task.assignees.length > 0 
        ? task.assignees.map(a => getUserById(a.userId)).filter(Boolean)
        : [getUserById(task.creatorId)].filter(Boolean)
      
      const project = getProjectById(task.projectId)
      const dateStr = format(new Date(task.startDate), "M月d日", { locale: zhCN })
      const timeStr = task.startTime ? ` ${task.startTime}` : ""
      
      content += `• ${task.title}\n`
      if (task.description) content += `  ${task.description}\n`
      content += `  时间: ${dateStr}${timeStr}`
      if (assignees.length > 0) content += ` | 负责人: ${assignees.map(u => u?.name || "未知用户").join(", ")}`
      if (project) content += ` | 项目: ${project.name}`
      content += `\n\n`
    })

    const success = await copyToClipboard(content)
    
    if (success) {
      setCopiedId(group.id)
      setTimeout(() => setCopiedId(null), 2000)
    }
    // 静默失败，不影响用户体验
  }

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case "daily": return "日常"
      case "meeting": return "会议"
      case "vacation": return "假期"
      default: return type
    }
  }

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case "daily": return "bg-blue-500"
      case "meeting": return "bg-yellow-500"
      case "vacation": return "bg-red-500"
      default: return "bg-gray-500"
    }
  }

  // 根据列数获取 grid 类名
  const getGridClassName = () => {
    switch (listLayoutColumns) {
      case 1: return "grid-cols-1"
      case 2: return "grid-cols-1 md:grid-cols-2"
      case 3: return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      case 4: return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      default: return "grid-cols-1 md:grid-cols-2"
    }
  }

  return (
    <div className="flex h-full flex-col bg-muted/30">
      <div className="flex-1 overflow-y-auto p-6 pb-24">
        {groupedTasks.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Calendar className="mx-auto h-16 w-16 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">暂无任务</p>
              <p className="mt-2 text-sm text-muted-foreground">当前时间段内没有任务安排</p>
            </div>
          </div>
        ) : (
          <div className={`grid gap-4 ${getGridClassName()}`}>
            {groupedTasks.map((group, groupIndex) => (
              <Card key={`${listGroupMode}-${group.id}-${groupIndex}`} className="overflow-hidden">
                <CardHeader className="pb-2 pt-3 px-4" style={{ borderLeftWidth: '3px', borderLeftColor: group.color || '#3b82f6' }}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold truncate">{group.title}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(group)}
                      className="h-7 px-2 gap-1 shrink-0"
                    >
                      {copiedId === group.id ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span className="text-xs">已复制</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">共 {group.tasks.length} 项</p>
                </CardHeader>
                <CardContent className="space-y-2 pt-2 px-4 pb-3">
                  {group.tasks.map((task) => {
                    // 获取所有负责人
                    const assignees = task.assignees && task.assignees.length > 0 
                      ? task.assignees.map(a => getUserById(a.userId)).filter(Boolean)
                      : [getUserById(task.creatorId)].filter(Boolean)
                    
                    const project = getProjectById(task.projectId)

                    return (
                      <div
                        key={task.id}
                        className="flex items-start gap-2 rounded-md border border-border bg-card p-2 hover:bg-accent/50 transition-colors"
                      >
                        <div className={`w-0.5 h-full min-h-8 rounded-full ${getTaskTypeColor(task.type)}`} />
                        
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-medium text-sm text-foreground truncate">{task.title}</h4>
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">
                              {getTaskTypeLabel(task.type)}
                            </Badge>
                          </div>

                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-0.5">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(task.startDate), "M/d", { locale: zhCN })}</span>
                            </div>

                            {task.startTime && (
                              <div className="flex items-center gap-0.5">
                                <Clock className="h-3 w-3" />
                                <span>{task.startTime}</span>
                              </div>
                            )}

                            {assignees.length > 0 && listGroupMode !== "user" && (
                              <div className="flex items-center gap-1">
                                {assignees.map((user) => user && (
                                  <div key={user.id} className="flex items-center gap-0.5">
                                    <Avatar className="h-3 w-3">
                                      <AvatarImage src={user.avatar} alt={user.name} />
                                      <AvatarFallback className="text-[8px]">
                                        {user.name.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate">{user.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {project && listGroupMode !== "project" && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1 py-0"
                                style={{ borderColor: project.color, color: project.color }}
                              >
                                {project.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
