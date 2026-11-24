"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  Users,
  FolderKanban,
  Building2,
  User,
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Pencil,
  Trash2,
  MoreVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { panoramaFetch } from "@/lib/api/panorama"
import {
  PanoramaTaskDetailDialog,
  PanoramaTaskListView,
  PanoramaTaskMonthView,
  countPanoramaTasks,
  filterPanoramaTasksByDateRange,
  parsePanoramaTasks,
  type PanoramaTask,
} from "@/components/admin/panorama-task-views"

interface Organization {
  id: string
  name: string
  isVerified: boolean
  createdAt: string
  _count: {
    members: number
    teams: number
    projects: number
    tasks: number
  }
}

interface Team {
  id: string
  name: string
  color: string
  description?: string
  creatorId: string
  creator: {
    name: string
    email: string
  }
  members: Array<{
    user: {
      id: string
      name: string
      email: string
      avatar?: string
    }
  }>
  _count: {
    tasks: number
  }
}

interface Project {
  id: string
  name: string
  color: string
  description?: string
  creatorId: string
  creator: {
    name: string
    email: string
  }
  members: Array<{
    user: {
      id: string
      name: string
      email: string
      avatar?: string
    }
  }>
  _count: {
    tasks: number
  }
}

interface Member {
  id: string
  username: string
  name: string
  email: string
  avatar?: string
  role: string
  isAdmin: boolean
  createdAt: string
  orgRole?: string
  taskCount: number
}

type ScopeType = "org" | "team" | "project" | "member"

interface TaskScope {
  type: ScopeType
  id?: string
  name: string
}

function getTasksForScope(
  orgTasks: PanoramaTask[],
  scope: TaskScope,
  teams: Team[]
): PanoramaTask[] {
  if (scope.type === "org" || !scope.id) return orgTasks

  const scopeId = scope.id

  if (scope.type === "project") {
    return orgTasks.filter((task) => task.project?.id === scopeId)
  }

  if (scope.type === "member") {
    return orgTasks.filter(
      (task) =>
        task.creator.id === scopeId ||
        task.assignees.some((assignee) => assignee.user.id === scopeId)
    )
  }

  const team = teams.find((item) => item.id === scopeId)
  const memberIds = new Set((team?.members ?? []).map((m) => m.user.id))
  if (memberIds.size === 0) return []

  return orgTasks.filter(
    (task) =>
      memberIds.has(task.creator.id) ||
      task.assignees.some((assignee) => memberIds.has(assignee.user.id))
  )
}

type RightTab = "tasks" | "detail"
type TaskViewMode = "month" | "list"

interface PanoramaViewProps {
  onLogout: () => void
}

export default function PanoramaView({ onLogout }: PanoramaViewProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [orgTasks, setOrgTasks] = useState<PanoramaTask[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [error, setError] = useState("")

  // 右侧任务视图状态
  const [rightTab, setRightTab] = useState<RightTab>("tasks")
  const [taskViewMode, setTaskViewMode] = useState<TaskViewMode>("month")
  const [taskCurrentDate, setTaskCurrentDate] = useState(() => new Date())
  const [scope, setScope] = useState<TaskScope>({ type: "org", name: "整个组织" })
  const [selectedTask, setSelectedTask] = useState<PanoramaTask | null>(null)
  const [taskDetailOpen, setTaskDetailOpen] = useState(false)

  // 编辑组织对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [editOrgName, setEditOrgName] = useState("")
  const [editOrgVerified, setEditOrgVerified] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

  // 删除组织确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // 请求序号：避免快速切换组织时旧响应覆盖新数据
  const requestSeqRef = useRef(0)

  const fetchOrganizations = useCallback(async () => {
    setDataLoading(true)
    try {
      const response = await panoramaFetch("/api/admin/panorama/organizations")
      const data = await response.json()

      if (data.success) {
        setOrganizations(data.data)
      } else {
        setError(data.error || "获取组织列表失败")
      }
    } catch (err) {
      console.error("Failed to fetch organizations:", err)
      setError("获取数据失败，请重试")
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  const handleSelectOrganization = useCallback(async (org: Organization) => {
    const seq = ++requestSeqRef.current

    setSelectedOrg(org)
    setDataLoading(true)
    setError("")
    // 先清空上一个组织的数据，避免串台
    setTeams([])
    setProjects([])
    setMembers([])
    setOrgTasks([])
    setScope({ type: "org", name: "整个组织" })
    setRightTab("tasks")
    setTaskViewMode("month")
    setTaskCurrentDate(new Date())
    setSelectedTask(null)

    try {
      const [teamsRes, projectsRes, membersRes, tasksRes] = await Promise.all([
        panoramaFetch(`/api/admin/panorama/organizations/${org.id}/teams`),
        panoramaFetch(`/api/admin/panorama/organizations/${org.id}/projects`),
        panoramaFetch(`/api/admin/panorama/organizations/${org.id}/members`),
        panoramaFetch(`/api/admin/panorama/tasks?type=org&id=${org.id}`),
      ])

      const [teamsData, projectsData, membersData, tasksData] = await Promise.all([
        teamsRes.json(),
        projectsRes.json(),
        membersRes.json(),
        tasksRes.json(),
      ])

      if (seq !== requestSeqRef.current) return

      if (teamsData.success) setTeams(teamsData.data)
      if (projectsData.success) setProjects(projectsData.data)
      if (membersData.success) {
        setMembers(membersData.data)
      } else {
        console.error("Failed to fetch members:", membersData.error)
        setError(membersData.error || "获取成员数据失败")
      }
      if (tasksData.success) {
        setOrgTasks(parsePanoramaTasks(tasksData.data))
      } else {
        setError(tasksData.error || "获取事项失败")
      }
    } catch (err) {
      if (seq !== requestSeqRef.current) return
      console.error("Failed to fetch organization details:", err)
      setError("获取组织详情失败")
    } finally {
      if (seq === requestSeqRef.current) {
        setDataLoading(false)
      }
    }
  }, [])

  // 当前范围下的事项：全部从组织的任务集合派生，不再单独请求
  const scopedTasks = useMemo(
    () => getTasksForScope(orgTasks, scope, teams),
    [orgTasks, scope, teams]
  )

  const monthStart = useMemo(
    () => new Date(taskCurrentDate.getFullYear(), taskCurrentDate.getMonth(), 1),
    [taskCurrentDate]
  )
  const monthEnd = useMemo(
    () => new Date(taskCurrentDate.getFullYear(), taskCurrentDate.getMonth() + 1, 0),
    [taskCurrentDate]
  )
  const monthTaskCount = useMemo(
    () => countPanoramaTasks(filterPanoramaTasksByDateRange(scopedTasks, monthStart, monthEnd)),
    [scopedTasks, monthStart, monthEnd]
  )
  const totalTaskCount = useMemo(() => countPanoramaTasks(scopedTasks), [scopedTasks])

  const currentMonthLabel = `${taskCurrentDate.getFullYear()}年${taskCurrentDate.getMonth() + 1}月`

  const scopeLabel =
    scope.type === "org"
      ? "整个组织"
      : scope.type === "team"
        ? `团队 · ${scope.name}`
        : scope.type === "project"
          ? `项目 · ${scope.name}`
          : `成员 · ${scope.name}`

  const scopeValue = scope.type === "org" ? "org" : `${scope.type}:${scope.id}`

  const applyScope = (nextScope: TaskScope) => {
    // 切换到团队/项目/成员时，如果当前月份没有事项，自动跳到该范围最近有事项的月份
    if (nextScope.type !== "org") {
      const nextTasks = getTasksForScope(orgTasks, nextScope, teams)
      const hasCurrentMonthTasks =
        filterPanoramaTasksByDateRange(nextTasks, monthStart, monthEnd).length > 0

      if (!hasCurrentMonthTasks && nextTasks.length > 0) {
        const latestStart = nextTasks.reduce(
          (latest, task) => (task.startDate > latest ? task.startDate : latest),
          nextTasks[0].startDate
        )
        setTaskCurrentDate(
          new Date(latestStart.getFullYear(), latestStart.getMonth(), 1)
        )
      }
    }

    setScope(nextScope)
    setRightTab("tasks")
  }

  const handleScopeChange = (value: string) => {
    if (value === "org") {
      applyScope({ type: "org", name: "整个组织" })
      return
    }

    const [type, id] = value.split(":")
    if (!id) return

    if (type === "team") {
      const team = teams.find((item) => item.id === id)
      applyScope({ type: "team", id, name: team?.name ?? "团队" })
      return
    }
    if (type === "project") {
      const project = projects.find((item) => item.id === id)
      applyScope({ type: "project", id, name: project?.name ?? "项目" })
      return
    }
    if (type === "member") {
      const member = members.find((item) => item.id === id)
      applyScope({ type: "member", id, name: member?.name ?? "成员" })
    }
  }

  const goToScope = (type: ScopeType, id: string, name: string) => {
    applyScope({ type, id, name })
  }

  const handleTaskClick = (task: PanoramaTask) => {
    setSelectedTask(task)
    setTaskDetailOpen(true)
  }

  const shiftMonth = (offset: number) => {
    setTaskCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1))
  }

  const resetToCurrentMonth = () => {
    setTaskCurrentDate(new Date())
  }

  const handleEditOrg = (org: Organization) => {
    setEditingOrg(org)
    setEditOrgName(org.name)
    setEditOrgVerified(org.isVerified)
    setEditDialogOpen(true)
  }

  const handleSaveOrg = async () => {
    if (!editingOrg || !editOrgName.trim()) return

    setEditLoading(true)
    try {
      const response = await panoramaFetch(`/api/admin/panorama/organizations/${editingOrg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editOrgName.trim(),
          isVerified: editOrgVerified,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // 更新本地组织列表
        setOrganizations((orgs) =>
          orgs.map((org) => (org.id === editingOrg.id ? data.data : org))
        )
        // 如果当前选中的是被编辑的组织，也更新它
        if (selectedOrg?.id === editingOrg.id) {
          setSelectedOrg(data.data)
        }
        setEditDialogOpen(false)
        setError("")
      } else {
        setError(data.error || "更新组织失败")
      }
    } catch (err) {
      console.error("Failed to update organization:", err)
      setError("更新组织失败")
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteOrg = (org: Organization) => {
    setDeletingOrg(org)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteOrg = async () => {
    if (!deletingOrg) return

    setDeleteLoading(true)
    try {
      const response = await panoramaFetch(`/api/admin/panorama/organizations/${deletingOrg.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        // 从列表中移除
        setOrganizations((orgs) => orgs.filter((org) => org.id !== deletingOrg.id))
        // 如果当前选中的是被删除的组织，清空选择
        if (selectedOrg?.id === deletingOrg.id) {
          requestSeqRef.current++
          setSelectedOrg(null)
          setTeams([])
          setProjects([])
          setMembers([])
          setOrgTasks([])
        }
        setDeleteDialogOpen(false)
        setError("")
      } else {
        setError(data.error || "删除组织失败")
        setDeleteDialogOpen(false)
      }
    } catch (err) {
      console.error("Failed to delete organization:", err)
      setError("删除组织失败")
      setDeleteDialogOpen(false)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex h-screen flex-col">
      {/* 顶部导航栏 */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Logo" width={32} height={32} />
            <h1 className="text-xl font-bold">超级管理员全景视图</h1>
          </div>
          <Button variant="outline" onClick={onLogout}>
            退出登录
          </Button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：组织列表 */}
        <div className="w-80 border-r bg-muted/30 overflow-y-auto">
          <div className="p-4">
            <h2 className="mb-4 text-lg font-semibold">所有组织</h2>
            {dataLoading && !selectedOrg ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    className={cn(
                      "w-full rounded-lg border bg-card p-4 transition-all cursor-pointer hover:border-primary group",
                      selectedOrg?.id === org.id && "border-primary bg-primary/5"
                    )}
                    onClick={() => handleSelectOrganization(org)}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{org.name}</h3>
                      <div className="flex items-center gap-2">
                        {org.isVerified && (
                          <span className="text-xs text-blue-500">已认证</span>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditOrg(org)
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteOrg(org)
                              }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                      <span>{org._count.members} 成员</span>
                      <span>{org._count.teams} 团队</span>
                      <span>{org._count.projects} 项目</span>
                    </div>
                    <div className="mt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectOrganization(org)
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {org._count.tasks} 个事项
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：任务视图 / 组织详情 */}
        <div className="flex-1 overflow-hidden">
          {!selectedOrg ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Building2 className="mx-auto mb-4 h-16 w-16 opacity-20" />
                <p>请从左侧选择一个组织查看详情</p>
              </div>
            </div>
          ) : dataLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="flex h-full flex-col">
              {error && (
                <Alert variant="destructive" className="m-4 mb-0">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* 头部：组织名 + 当前范围 + tab */}
              <div className="border-b px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-2xl font-bold">{selectedOrg.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {scopeLabel} · 本月 {monthTaskCount} 个事项 · 全部 {totalTaskCount} 个 · 定时任务按系列计数
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-lg bg-muted p-1">
                    <button
                      type="button"
                      onClick={() => setRightTab("tasks")}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-sm transition-colors",
                        rightTab === "tasks"
                          ? "bg-background font-medium shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      任务视图
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightTab("detail")}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-sm transition-colors",
                        rightTab === "detail"
                          ? "bg-background font-medium shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      组织详情
                    </button>
                  </div>
                </div>
              </div>

              {rightTab === "tasks" ? (
                <>
                  {/* 工具栏 */}
                  <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3">
                    <Select value={scopeValue} onValueChange={handleScopeChange}>
                      <SelectTrigger className="w-[190px]">
                        <SelectValue placeholder="选择范围" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="org">整个组织</SelectItem>
                        {teams.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>团队</SelectLabel>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={`team:${team.id}`}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {projects.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>项目</SelectLabel>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={`project:${project.id}`}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {members.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>成员</SelectLabel>
                            {members.map((member) => (
                              <SelectItem key={member.id} value={`member:${member.id}`}>
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>

                    {scope.type !== "org" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setScope({ type: "org", name: "整个组织" })}
                      >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        返回组织
                      </Button>
                    )}

                    <div className="mx-2 h-6 w-px bg-border" />

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => shiftMonth(-1)} aria-label="上一月">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="min-w-[92px] text-center text-sm font-medium">
                        {currentMonthLabel}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => shiftMonth(1)} aria-label="下一月">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={resetToCurrentMonth}>
                        本月
                      </Button>
                    </div>

                    <div className="ml-auto flex items-center gap-1 rounded-lg bg-muted p-1">
                      <button
                        type="button"
                        onClick={() => setTaskViewMode("month")}
                        className={cn(
                          "flex items-center gap-1 rounded-md px-2.5 py-1 text-sm transition-colors",
                          taskViewMode === "month"
                            ? "bg-background font-medium shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <CalendarDays className="h-4 w-4" />
                        月视图
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskViewMode("list")}
                        className={cn(
                          "flex items-center gap-1 rounded-md px-2.5 py-1 text-sm transition-colors",
                          taskViewMode === "list"
                            ? "bg-background font-medium shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <List className="h-4 w-4" />
                        清单视图
                      </button>
                    </div>
                  </div>

                  {/* 任务视图内容 */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {taskViewMode === "month" ? (
                      <PanoramaTaskMonthView
                        tasks={scopedTasks}
                        currentDate={taskCurrentDate}
                        onTaskClick={handleTaskClick}
                      />
                    ) : (
                      <PanoramaTaskListView
                        tasks={scopedTasks}
                        currentDate={taskCurrentDate}
                        onTaskClick={handleTaskClick}
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-3 gap-6">
                    {/* 成员列表 */}
                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <User className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">成员 ({members.length})</h3>
                      </div>
                      {members.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-muted-foreground">
                          <User className="mb-2 h-12 w-12 opacity-20" />
                          <p className="text-sm">暂无成员</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {members.map((member) => (
                            <Card key={member.id}>
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={member.avatar} alt={member.name} />
                                    <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm truncate">{member.name}</h4>
                                    <p className="text-xs text-muted-foreground truncate">@{member.username}</p>
                                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {member.orgRole && (
                                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                                          {member.orgRole}
                                        </span>
                                      )}
                                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                                        {member.role}
                                      </span>
                                      {member.isAdmin && (
                                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                                          管理员
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => goToScope("member", member.id, member.name)}
                                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      {member.taskCount} 个事项
                                    </button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 团队列表 */}
                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">团队 ({teams.length})</h3>
                      </div>
                      {teams.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-muted-foreground">
                          <Users className="mb-2 h-12 w-12 opacity-20" />
                          <p className="text-sm">暂无团队</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {teams.map((team) => (
                            <Card key={team.id}>
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div
                                    className="h-10 w-10 rounded-lg shrink-0"
                                    style={{ backgroundColor: team.color }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm truncate">{team.name}</h4>
                                    {team.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-2">{team.description}</p>
                                    )}
                                    <div className="mt-2 text-xs text-muted-foreground">
                                      <p className="truncate">创建者: {team.creator.name}</p>
                                      <p>成员: {team.members.length}</p>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {team.members.map((m) => (
                                        <div key={m.user.id} className="flex items-center gap-1">
                                          <Avatar className="h-5 w-5">
                                            <AvatarImage src={m.user.avatar} alt={m.user.name} />
                                            <AvatarFallback className="text-xs">{m.user.name.charAt(0)}</AvatarFallback>
                                          </Avatar>
                                          <span className="text-xs text-muted-foreground">{m.user.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <button
                                      onClick={() => goToScope("team", team.id, team.name)}
                                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      {team._count.tasks} 个事项
                                    </button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 项目列表 */}
                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <FolderKanban className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">项目 ({projects.length})</h3>
                      </div>
                      {projects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-muted-foreground">
                          <FolderKanban className="mb-2 h-12 w-12 opacity-20" />
                          <p className="text-sm">暂无项目</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {projects.map((project) => (
                            <Card key={project.id}>
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div
                                    className="h-10 w-10 rounded-lg shrink-0"
                                    style={{ backgroundColor: project.color }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm truncate">{project.name}</h4>
                                    {project.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                                    )}
                                    <div className="mt-2 text-xs text-muted-foreground">
                                      <p className="truncate">创建者: {project.creator.name}</p>
                                      <p>成员: {project.members.length}</p>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {project.members.map((m) => (
                                        <div key={m.user.id} className="flex items-center gap-1">
                                          <Avatar className="h-5 w-5">
                                            <AvatarImage src={m.user.avatar} alt={m.user.name} />
                                            <AvatarFallback className="text-xs">{m.user.name.charAt(0)}</AvatarFallback>
                                          </Avatar>
                                          <span className="text-xs text-muted-foreground">{m.user.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <button
                                      onClick={() => goToScope("project", project.id, project.name)}
                                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      {project._count.tasks} 个事项
                                    </button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 编辑组织对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑组织</DialogTitle>
            <DialogDescription>修改组织的基本信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">组织名称</Label>
              <Input
                id="org-name"
                value={editOrgName}
                onChange={(e) => setEditOrgName(e.target.value)}
                placeholder="输入组织名称"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="org-verified"
                checked={editOrgVerified}
                onCheckedChange={(checked) => setEditOrgVerified(!!checked)}
              />
              <Label htmlFor="org-verified" className="cursor-pointer">
                已认证组织
              </Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={editLoading}>
              取消
            </Button>
            <Button onClick={handleSaveOrg} disabled={editLoading || !editOrgName.trim()}>
              {editLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除组织确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除组织</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除组织「{deletingOrg?.name}」吗？
              <br />
              <span className="text-red-600 font-medium">
                注意：只有没有成员、团队和项目的组织才能被删除。
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteOrg}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  删除中...
                </>
              ) : (
                "确认删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 事项只读详情 */}
      <PanoramaTaskDetailDialog
        task={selectedTask}
        open={taskDetailOpen}
        onOpenChange={setTaskDetailOpen}
      />
    </div>
  )
}
