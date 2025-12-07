"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, Users, FolderKanban, Building2, User, Calendar, Clock, Pencil, Trash2, MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { cn } from "@/lib/utils"

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

interface Task {
  id: string
  title: string
  description?: string
  startDate: string
  endDate: string
  startTime?: string
  endTime?: string
  type: string
  creator: {
    id: string
    name: string
    avatar?: string
  }
  assignees: Array<{
    user: {
      id: string
      name: string
      avatar?: string
    }
  }>
  project?: {
    id: string
    name: string
    color: string
  }
  team?: {
    id: string
    name: string
    color: string
  }
}

interface PanoramaViewProps {
  onLogout: () => void
}

export default function PanoramaView({ onLogout }: PanoramaViewProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [error, setError] = useState("")
  
  // 事项对话框状态
  const [tasksDialogOpen, setTasksDialogOpen] = useState(false)
  const [dialogTasks, setDialogTasks] = useState<Task[]>([])
  const [dialogTitle, setDialogTitle] = useState("")
  const [tasksLoading, setTasksLoading] = useState(false)

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

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    setDataLoading(true)
    try {
      const response = await fetch("/api/admin/panorama/organizations")
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
  }

  const handleSelectOrganization = async (org: Organization) => {
    setSelectedOrg(org)
    setDataLoading(true)
    setError("")

    try {
      const [teamsRes, projectsRes, membersRes] = await Promise.all([
        fetch(`/api/admin/panorama/organizations/${org.id}/teams`),
        fetch(`/api/admin/panorama/organizations/${org.id}/projects`),
        fetch(`/api/admin/panorama/organizations/${org.id}/members`)
      ])

      const [teamsData, projectsData, membersData] = await Promise.all([
        teamsRes.json(),
        projectsRes.json(),
        membersRes.json()
      ])

      console.log("Teams data:", teamsData)
      console.log("Projects data:", projectsData)
      console.log("Members data:", membersData)

      if (teamsData.success) setTeams(teamsData.data)
      if (projectsData.success) setProjects(projectsData.data)
      if (membersData.success) setMembers(membersData.data)
      
      if (!membersData.success) {
        console.error("Failed to fetch members:", membersData.error)
        setError(membersData.error || "获取成员数据失败")
      }
    } catch (err) {
      console.error("Failed to fetch organization details:", err)
      setError("获取组织详情失败")
    } finally {
      setDataLoading(false)
    }
  }

  const fetchTasks = async (type: string, id: string, title: string, orgId?: string) => {
    setTasksLoading(true)
    setDialogTitle(title)
    setTasksDialogOpen(true)
    setDialogTasks([])

    try {
      const params = new URLSearchParams({ type, id })
      if (orgId) params.append('orgId', orgId)
      
      const response = await fetch(`/api/admin/panorama/tasks?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setDialogTasks(data.data)
      } else {
        setError(data.error || "获取事项失败")
      }
    } catch (err) {
      console.error("Failed to fetch tasks:", err)
      setError("获取事项失败")
    } finally {
      setTasksLoading(false)
    }
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
      const response = await fetch(`/api/admin/panorama/organizations/${editingOrg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editOrgName.trim(),
          isVerified: editOrgVerified
        })
      })

      const data = await response.json()

      if (data.success) {
        // 更新本地组织列表
        setOrganizations(orgs => 
          orgs.map(org => org.id === editingOrg.id ? data.data : org)
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
      const response = await fetch(`/api/admin/panorama/organizations/${deletingOrg.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        // 从列表中移除
        setOrganizations(orgs => orgs.filter(org => org.id !== deletingOrg.id))
        // 如果当前选中的是被删除的组织，清空选择
        if (selectedOrg?.id === deletingOrg.id) {
          setSelectedOrg(null)
          setTeams([])
          setProjects([])
          setMembers([])
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
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              handleEditOrg(org)
                            }}>
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
                          fetchTasks('org', org.id, `${org.name} - 所有事项`)
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

        {/* 右侧：组织详情 */}
        <div className="flex-1 overflow-y-auto">
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
            <div className="p-6">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="mb-6">
                <h2 className="text-2xl font-bold">{selectedOrg.name}</h2>
                <p className="text-sm text-muted-foreground">
                  创建于 {new Date(selectedOrg.createdAt).toLocaleDateString()}
                </p>
              </div>

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
                                  onClick={() => fetchTasks('member', member.id, `${member.name} 的事项`, selectedOrg?.id)}
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
                                  onClick={() => fetchTasks('team', team.id, `${team.name} 的事项`)}
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
                                  onClick={() => fetchTasks('project', project.id, `${project.name} 的事项`)}
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
      </div>

      {/* 编辑组织对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑组织</DialogTitle>
            <DialogDescription>
              修改组织的基本信息
            </DialogDescription>
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
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={editLoading}
            >
              取消
            </Button>
            <Button
              onClick={handleSaveOrg}
              disabled={editLoading || !editOrgName.trim()}
            >
              {editLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
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
                '确认删除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 事项详情对话框 */}
      <Dialog open={tasksDialogOpen} onOpenChange={setTasksDialogOpen}>
        <DialogContent className="max-w-[64vw]! sm:max-w-[64vw]! flex flex-col max-h-[85vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              共 {dialogTasks.length} 个事项
            </DialogDescription>
          </DialogHeader>
          {tasksLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : dialogTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Calendar className="mb-2 h-12 w-12 opacity-20" />
              <p>暂无事项</p>
            </div>
          ) : (
            <div className="overflow-y-auto px-6 pb-6 pt-4">
              <div className="grid grid-cols-3 gap-3">
                {dialogTasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm line-clamp-1">{task.title}</h4>
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {task.project && (
                            <Badge style={{ backgroundColor: task.project.color }} className="text-white text-xs px-1.5 py-0">
                              {task.project.name}
                            </Badge>
                          )}
                          {task.team && (
                            <Badge style={{ backgroundColor: task.team.color }} className="text-white text-xs px-1.5 py-0">
                              {task.team.name}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {task.type === 'EVENT' ? '事件' : '任务'}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {new Date(task.startDate).toLocaleDateString()} - {new Date(task.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          {task.startTime && task.endTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span>{task.startTime} - {task.endTime}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground shrink-0">创建:</span>
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={task.creator.avatar} alt={task.creator.name} />
                            <AvatarFallback className="text-xs">{task.creator.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs truncate">{task.creator.name}</span>
                        </div>
                        {task.assignees.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground shrink-0">负责:</span>
                            <div className="flex flex-wrap gap-1">
                              {task.assignees.map((assignee) => (
                                <div key={assignee.user.id} className="flex items-center gap-0.5">
                                  <Avatar className="h-4 w-4">
                                    <AvatarImage src={assignee.user.avatar} alt={assignee.user.name} />
                                    <AvatarFallback className="text-xs">{assignee.user.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs truncate max-w-[60px]">{assignee.user.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
