"use client"

import { useMemo } from "react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, differenceInDays } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from "recharts"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]

export function StatsView() {
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
    projects,
    users,
  } = useCalendarStore()

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
    let filtered = tasks

    // 根据导航模式过滤
    if (navigationMode === "my-days") {
      if (selectedProjectIds.length === 0) {
        filtered = []
      } else {
        filtered = filtered.filter(
          (task) => selectedProjectIds.includes(task.projectId) && task.userId === currentUser.id
        )
      }
    } else if (navigationMode === "team" && selectedTeamId) {
      const team = getTeamById(selectedTeamId)
      if (team) {
        filtered = filtered.filter((task) => team.memberIds.includes(task.userId))
      }
    } else if (navigationMode === "project" && selectedProjectId) {
      const project = getProjectById(selectedProjectId)
      if (project) {
        filtered = filtered.filter(
          (task) => task.projectId === selectedProjectId && project.memberIds.includes(task.userId)
        )
      }
    } else {
      if (selectedProjectIds.length === 0) {
        filtered = []
      } else {
        filtered = filtered.filter((task) => selectedProjectIds.includes(task.projectId))
      }
    }

    // 根据日期范围过滤
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
    currentUser.id,
    getTeamById,
    getProjectById,
    dateRange,
  ])

  // 按任务类型统计
  const tasksByType = useMemo(() => {
    const typeMap: Record<string, number> = {}
    
    filteredTasks.forEach((task) => {
      const type = task.type === "daily" ? "日常" : task.type === "meeting" ? "会议" : "假期"
      typeMap[type] = (typeMap[type] || 0) + 1
    })

    return Object.entries(typeMap).map(([name, value]) => ({ name, value }))
  }, [filteredTasks])

  // 按项目统计任务数和工时
  const tasksByProject = useMemo(() => {
    const projectMap: Record<string, { name: string; count: number; days: number; color: string }> = {}

    filteredTasks.forEach((task) => {
      const project = getProjectById(task.projectId)
      if (!project) return

      if (!projectMap[project.id]) {
        projectMap[project.id] = {
          name: project.name,
          count: 0,
          days: 0,
          color: project.color,
        }
      }

      projectMap[project.id].count += 1
      
      // 计算任务天数
      const taskDays = differenceInDays(new Date(task.endDate), new Date(task.startDate)) + 1
      projectMap[project.id].days += taskDays
    })

    return Object.values(projectMap)
  }, [filteredTasks, getProjectById])

  // 按成员统计任务数
  const tasksByUser = useMemo(() => {
    const userMap: Record<string, { name: string; count: number; days: number }> = {}

    filteredTasks.forEach((task) => {
      const user = getUserById(task.userId)
      if (!user) return

      if (!userMap[user.id]) {
        userMap[user.id] = {
          name: user.name,
          count: 0,
          days: 0,
        }
      }

      userMap[user.id].count += 1
      
      // 计算任务天数
      const taskDays = differenceInDays(new Date(task.endDate), new Date(task.startDate)) + 1
      userMap[user.id].days += taskDays
    })

    return Object.values(userMap).sort((a, b) => b.count - a.count)
  }, [filteredTasks, getUserById])

  return (
    <div className="flex h-full flex-col bg-muted/30">
      {/* Stats Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* 总览卡片 */}
          <Card>
            <CardHeader>
              <CardTitle>任务总览</CardTitle>
              <CardDescription>当前时间段内的任务统计</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-bold text-primary">{filteredTasks.length}</div>
                  <div className="text-sm text-muted-foreground">总任务数</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xl font-semibold text-blue-500">
                      {filteredTasks.filter((t) => t.type === "daily").length}
                    </div>
                    <div className="text-xs text-muted-foreground">日常</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-yellow-500">
                      {filteredTasks.filter((t) => t.type === "meeting").length}
                    </div>
                    <div className="text-xs text-muted-foreground">会议</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-red-500">
                      {filteredTasks.filter((t) => t.type === "vacation").length}
                    </div>
                    <div className="text-xs text-muted-foreground">假期</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 任务类型分布 - 饼图 */}
          <Card className="md:col-span-2 lg:col-span-2">
            <CardHeader>
              <CardTitle>任务类型分布</CardTitle>
              <CardDescription>各类型任务占比</CardDescription>
            </CardHeader>
            <CardContent>
              {tasksByType.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={tasksByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {tasksByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* 项目任务分布 - 柱状图 */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>项目任务分布</CardTitle>
              <CardDescription>各项目的任务数量和工作天数</CardDescription>
            </CardHeader>
            <CardContent>
              {tasksByProject.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tasksByProject}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="任务数" fill="#3b82f6" />
                    <Bar dataKey="days" name="工作天数" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* 成员任务统计 - 横向柱状图 */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>成员任务统计</CardTitle>
              <CardDescription>各成员的任务量和投入天数</CardDescription>
            </CardHeader>
            <CardContent>
              {tasksByUser.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tasksByUser} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="任务数" fill="#8b5cf6" />
                    <Bar dataKey="days" name="投入天数" fill="#ec4899" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
