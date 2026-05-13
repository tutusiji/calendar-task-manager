"use client"

import { useMemo } from "react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import {
  differenceInDays,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { zhCN } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { Task } from "@/lib/types"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]

type DateRange = {
  start: Date
  end: Date
}

type StackedEffortRow = {
  name: string
  total: number
  [key: string]: number | string
}

function startOfDay(date: Date) {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

function endOfDay(date: Date) {
  const normalized = new Date(date)
  normalized.setHours(23, 59, 59, 999)
  return normalized
}

function getTaskOverlapDays(task: Task, range: DateRange) {
  const taskStart = startOfDay(task.startDate)
  const taskEnd = endOfDay(task.endDate)
  const overlapStart = taskStart > range.start ? taskStart : range.start
  const overlapEnd = taskEnd < range.end ? taskEnd : range.end

  if (overlapStart > overlapEnd) return 0

  return differenceInDays(endOfDay(overlapEnd), startOfDay(overlapStart)) + 1
}

function getEffectiveAssigneeIds(task: Task) {
  const assigneeIds = task.assignees?.map((assignee) => assignee.userId).filter(Boolean) ?? []

  if (assigneeIds.length > 0) {
    return Array.from(new Set(assigneeIds))
  }

  return [task.creatorId]
}

function formatMetricValue(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1)
}

function formatProjectSummary(names: string[]) {
  if (names.length === 0) return "未选择项目"
  if (names.length <= 2) return names.join(" / ")
  return `${names.slice(0, 2).join(" / ")} 等 ${names.length} 个项目`
}

function isPersonalProjectName(name?: string) {
  return Boolean(name?.includes("个人事务"))
}

function normalizeTooltipValue(value: number | string) {
  return typeof value === "number" ? formatMetricValue(value) : value
}

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

  const selectedProjects = useMemo(
    () => projects.filter((project) => selectedProjectIds.includes(project.id)),
    [projects, selectedProjectIds]
  )

  // 过滤任务
  const filteredTasks = useMemo(() => {
    // 如果 currentUser 为空，返回空数组
    if (!currentUser) return []
    
    let filtered = tasks

    // 根据导航模式过滤
    if (navigationMode === "my-days") {
      if (selectedProjectIds.length === 0) {
        filtered = []
      } else {
        filtered = filtered.filter(
          (task) => selectedProjectIds.includes(task.projectId) && 
            (task.assignees?.some(a => a.userId === currentUser.id) || task.creatorId === currentUser.id)
        )
      }
    } else if (navigationMode === "team" && selectedTeamId) {
      const team = getTeamById(selectedTeamId)
      if (team) {
        filtered = filtered.filter(
          (task) => {
            const project = getProjectById(task.projectId)
            if (isPersonalProjectName(project?.name)) {
              return false
            }

            return (
              task.assignees?.some(a => team.memberIds.includes(a.userId)) ||
              team.memberIds.includes(task.creatorId)
            )
          }
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
    currentUser,
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

  // 按项目统计任务数和投入天数
  const tasksByProject = useMemo(() => {
    const projectMap: Record<
      string,
      { id: string; name: string; count: number; days: number; color?: string }
    > = {}

    filteredTasks.forEach((task) => {
      const project = getProjectById(task.projectId)
      const overlapDays = getTaskOverlapDays(task, dateRange)
      if (overlapDays <= 0) return

      const projectId = project?.id ?? task.projectId
      const projectName = project?.name ?? "未归类项目"

      if (!projectMap[projectId]) {
        projectMap[projectId] = {
          id: projectId,
          name: projectName,
          count: 0,
          days: 0,
          color: project?.color,
        }
      }

      projectMap[projectId].count += 1
      projectMap[projectId].days += overlapDays
    })

    return Object.values(projectMap).sort((a, b) => b.days - a.days)
  }, [filteredTasks, getProjectById, dateRange])

  // 按成员统计任务数和投入天数
  const tasksByUser = useMemo(() => {
    const userMap: Record<string, { name: string; count: number; days: number }> = {}

    filteredTasks.forEach((task) => {
      const overlapDays = getTaskOverlapDays(task, dateRange)
      if (overlapDays <= 0) return

      const assigneeIds = getEffectiveAssigneeIds(task)
      const sharedDays = overlapDays / assigneeIds.length

      assigneeIds.forEach((userId) => {
        const user = getUserById(userId)
        const userName = user?.name ?? "未命名成员"

        if (!userMap[userId]) {
          userMap[userId] = {
            name: userName,
            count: 0,
            days: 0,
          }
        }

        userMap[userId].count += 1
        userMap[userId].days += sharedDays
      })
    })

    return Object.values(userMap).sort((a, b) => b.days - a.days)
  }, [filteredTasks, getUserById, dateRange])

  // 按成员 x 项目统计人力投入
  const effortByUserAndProject = useMemo(() => {
    const seriesMap = new Map<
      string,
      { key: string; id: string; name: string; color: string; totalDays: number }
    >()
    const userMap: Record<string, StackedEffortRow> = {}

    filteredTasks.forEach((task) => {
      const overlapDays = getTaskOverlapDays(task, dateRange)
      if (overlapDays <= 0) return

      const assigneeIds = getEffectiveAssigneeIds(task)
      const sharedDays = overlapDays / assigneeIds.length
      const project = getProjectById(task.projectId)
      const projectId = project?.id ?? task.projectId
      const projectKey = `project_${projectId}`
      const projectName = project?.name ?? "未归类项目"
      const projectColor = project?.color || COLORS[seriesMap.size % COLORS.length]

      if (!seriesMap.has(projectId)) {
        seriesMap.set(projectId, {
          key: projectKey,
          id: projectId,
          name: projectName,
          color: projectColor,
          totalDays: 0,
        })
      }

      const currentSeries = seriesMap.get(projectId)!
      currentSeries.totalDays += overlapDays

      assigneeIds.forEach((userId) => {
        const user = getUserById(userId)
        const userName = user?.name ?? "未命名成员"

        if (!userMap[userId]) {
          userMap[userId] = {
            name: userName,
            total: 0,
          }
        }

        const existingProjectValue =
          typeof userMap[userId][projectKey] === "number" ? (userMap[userId][projectKey] as number) : 0

        userMap[userId][projectKey] = existingProjectValue + sharedDays
        userMap[userId].total += sharedDays
      })
    })

    return {
      data: Object.values(userMap).sort((a, b) => b.total - a.total),
      series: Array.from(seriesMap.values()).sort((a, b) => b.totalDays - a.totalDays),
    }
  }, [filteredTasks, getProjectById, getUserById, dateRange])

  const totalEffortDays = useMemo(
    () => tasksByProject.reduce((sum, project) => sum + project.days, 0),
    [tasksByProject]
  )

  const activeProjectCount = tasksByProject.length
  const activeMemberCount = tasksByUser.length

  const overviewSecondaryMetric = useMemo(() => {
    if (navigationMode === "project") {
      return {
        label: "参与成员",
        value: activeMemberCount,
      }
    }

    return {
      label: "涉及项目",
      value: activeProjectCount,
    }
  }, [activeMemberCount, activeProjectCount, navigationMode])

  const statsSummary = useMemo(() => {
    const rangeLabel =
      viewMode === "personal" || viewMode === "week"
        ? `${format(dateRange.start, "M月d日", { locale: zhCN })} - ${format(dateRange.end, "M月d日", { locale: zhCN })}`
        : format(dateRange.start, "yyyy年M月", { locale: zhCN })

    if (navigationMode === "team") {
      const team = selectedTeamId ? getTeamById(selectedTeamId) : undefined
      const memberCount = team?.memberIds.length ?? 0

      return {
        scopeLabel: "当前团队",
        scopeName: team?.name ?? "未选择团队",
        scopeSubtext:
          activeProjectCount > 0
            ? `团队成员 ${memberCount} 人，本周期有 ${activeMemberCount} 人参与，覆盖 ${activeProjectCount} 个项目`
            : `团队成员 ${memberCount} 人，本周期暂无任务数据`,
        memberCount,
        rangeLabel,
      }
    }

    if (navigationMode === "project") {
      const project = selectedProjectId ? getProjectById(selectedProjectId) : undefined
      const memberCount = project?.memberIds.length ?? 0

      return {
        scopeLabel: "当前项目",
        scopeName: project?.name ?? "未选择项目",
        scopeSubtext:
          activeMemberCount > 0
            ? `项目成员 ${memberCount} 人，本周期有 ${activeMemberCount} 人参与`
            : `项目成员 ${memberCount} 人，本周期暂无任务数据`,
        memberCount,
        rangeLabel,
      }
    }

    return {
      scopeLabel: "统计对象",
      scopeName: currentUser?.name ?? "我的事项",
      scopeSubtext: `已选项目：${formatProjectSummary(selectedProjects.map((project) => project.name))}`,
      memberCount: currentUser ? 1 : 0,
      rangeLabel,
    }
  }, [
    activeMemberCount,
    activeProjectCount,
    currentUser,
    dateRange,
    getProjectById,
    getTeamById,
    navigationMode,
    selectedProjectId,
    selectedProjects,
    selectedTeamId,
    viewMode,
  ])

  const effortDistribution = useMemo(() => {
    if (navigationMode === "project") {
      return {
        title: "项目成员投入占比",
        description: "按成员查看当前项目在所选周期内的人力分布",
        data: tasksByUser.map((user, index) => ({
          name: user.name,
          value: user.days,
          color: COLORS[index % COLORS.length],
        })),
      }
    }

    return {
      title: navigationMode === "team" ? "团队项目投入占比" : "我的项目投入占比",
      description:
        navigationMode === "team"
          ? "按项目查看当前团队在所选周期内的人力分布"
          : "按项目查看你在所选周期内的人力投入占比",
      data: tasksByProject.map((project, index) => ({
        name: project.name,
        value: project.days,
        color: project.color || COLORS[index % COLORS.length],
      })),
    }
  }, [navigationMode, tasksByProject, tasksByUser])

  const effortMatrixMeta = useMemo(() => {
    if (navigationMode === "my-days") {
      return {
        title: "我的项目投入结构",
        description: "多人事项按负责人均分投入天数，便于回看本周期项目占比",
      }
    }

    if (navigationMode === "project") {
      return {
        title: "项目成员投入明细",
        description: "当前项目下按成员对比投入天数，适合快速查看谁投入得更多",
      }
    }

    return {
      title: "成员人力分布（按项目）",
      description: "多人事项按负责人均分投入天数，便于月度统计每个人投入到哪些项目",
    }
  }, [navigationMode])

  const projectChartMeta = useMemo(() => {
    if (navigationMode === "project") {
      return {
        title: "当前项目任务与投入",
        description: "按所选周期统计当前项目的任务数与投入天数",
      }
    }

    return {
      title: "项目任务分布",
      description: "各项目的任务数量和投入天数",
    }
  }, [navigationMode])

  const userChartMeta = useMemo(() => {
    if (navigationMode === "my-days") {
      return {
        title: "我的任务与投入",
        description: "按当前周期统计你参与的任务量和投入天数",
      }
    }

    return {
      title: "成员任务统计",
      description: "各成员的任务量和投入天数，多人事项按负责人均分投入天数",
    }
  }, [navigationMode])

  return (
    <div className="flex h-full flex-col bg-muted/30">
      {/* Stats Content */}
      <div className="flex-1 overflow-y-auto p-6 pb-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* 总览卡片 */}
          <Card>
            <CardHeader>
              <CardTitle>统计总览</CardTitle>
              <CardDescription>当前范围内的任务、人力与项目概览</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="rounded-lg border bg-muted/40 p-4">
                  <div className="text-xs font-medium text-muted-foreground">{statsSummary.scopeLabel}</div>
                  <div className="mt-1 text-lg font-semibold">{statsSummary.scopeName}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{statsSummary.scopeSubtext}</div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="min-w-0 rounded-lg border bg-background px-2 py-2.5 text-center">
                    <div className="text-xl font-bold text-primary">{filteredTasks.length}</div>
                    <div className="truncate text-[11px] text-muted-foreground">总任务数</div>
                  </div>
                  <div className="min-w-0 rounded-lg border bg-background px-2 py-2.5 text-center">
                    <div className="text-xl font-bold text-emerald-600">{formatMetricValue(totalEffortDays)}</div>
                    <div className="truncate text-[11px] text-muted-foreground">投入天数</div>
                  </div>
                  <div className="min-w-0 rounded-lg border bg-background px-2 py-2.5 text-center">
                    <div className="text-xl font-bold text-blue-600">{statsSummary.memberCount}</div>
                    <div className="truncate text-[11px] text-muted-foreground">当前人数</div>
                  </div>
                  <div className="min-w-0 rounded-lg border bg-background px-2 py-2.5 text-center">
                    <div className="text-xl font-bold text-violet-600">{overviewSecondaryMetric.value}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{overviewSecondaryMetric.label}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xl font-semibold text-blue-500">
                      {filteredTasks.filter((task) => task.type === "daily").length}
                    </div>
                    <div className="text-xs text-muted-foreground">日常</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-yellow-500">
                      {filteredTasks.filter((task) => task.type === "meeting").length}
                    </div>
                    <div className="text-xs text-muted-foreground">会议</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-red-500">
                      {filteredTasks.filter((task) => task.type === "vacation").length}
                    </div>
                    <div className="text-xs text-muted-foreground">假期</div>
                  </div>
                </div>

                <div className="text-xs leading-5 text-muted-foreground">
                  统计周期：{statsSummary.rangeLabel}。多人事项按负责人均分投入天数，用于近似统计当前周期的人力分布。
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 人力投入占比 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{effortDistribution.title}</CardTitle>
              <CardDescription>{effortDistribution.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {effortDistribution.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={effortDistribution.data}
                      cx="50%"
                      cy="56%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={92}
                      dataKey="value"
                    >
                      {effortDistribution.data.map((entry, index) => (
                        <Cell key={`effort-cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={normalizeTooltipValue} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* 任务类型分布 - 饼图 */}
          <Card>
            <CardHeader>
              <CardTitle>任务类型分布</CardTitle>
              <CardDescription>各类型任务占比</CardDescription>
            </CardHeader>
            <CardContent>
              {tasksByType.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={tasksByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={78}
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
                <div className="flex h-[240px] items-center justify-center text-muted-foreground">
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* 项目任务分布 - 柱状图 */}
          <Card className="md:col-span-2 lg:col-span-4">
            <CardHeader>
              <CardTitle>{projectChartMeta.title}</CardTitle>
              <CardDescription>{projectChartMeta.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {tasksByProject.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tasksByProject}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-18} textAnchor="end" height={72} />
                    <YAxis tickFormatter={formatMetricValue} />
                    <Tooltip formatter={normalizeTooltipValue} />
                    <Legend />
                    <Bar dataKey="count" name="任务数" fill="#3b82f6" />
                    <Bar dataKey="days" name="投入天数" fill="#10b981" />
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
          <Card className="md:col-span-2 lg:col-span-4">
            <CardHeader>
              <CardTitle>{userChartMeta.title}</CardTitle>
              <CardDescription>{userChartMeta.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {tasksByUser.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tasksByUser} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={formatMetricValue} />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={normalizeTooltipValue} />
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

          {/* 成员 x 项目人力结构 */}
          <Card className="md:col-span-2 lg:col-span-4">
            <CardHeader>
              <CardTitle>{effortMatrixMeta.title}</CardTitle>
              <CardDescription>{effortMatrixMeta.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {effortByUserAndProject.data.length > 0 && effortByUserAndProject.series.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={effortByUserAndProject.data} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={formatMetricValue} />
                    <YAxis dataKey="name" type="category" width={110} />
                    <Tooltip formatter={normalizeTooltipValue} />
                    <Legend />
                    {effortByUserAndProject.series.map((series) => (
                      <Bar
                        key={series.id}
                        dataKey={series.key}
                        name={series.name}
                        stackId="effort"
                        fill={series.color}
                      />
                    ))}
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
