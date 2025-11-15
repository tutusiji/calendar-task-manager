"use client"

import { useState } from "react"
import { Calendar, Users, FolderKanban, Plus, ChevronDown, ChevronRight, MoreVertical, Pencil, Trash2, Crown, Eye, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
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
import { TeamDialog } from "./team-dialog"
import { ProjectDialog } from "./project-dialog"
import type { Team, Project } from "@/lib/types"

export function NavigationMenu() {
  const { 
    navigationMode, 
    setNavigationMode, 
    selectedTeamId, 
    setSelectedTeamId,
    selectedProjectId,
    setSelectedProjectId,
    teams,
    projects,
    currentUser,
    deleteTeam,
    deleteProject,
    leaveTeam,
    leaveProject,
  } = useCalendarStore()
  
  const [teamsExpanded, setTeamsExpanded] = useState(true)
  const [projectsExpanded, setProjectsExpanded] = useState(true)
  
  // 对话框状态
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | undefined>()
  const [viewingTeam, setViewingTeam] = useState<Team | undefined>()
  const [editingProject, setEditingProject] = useState<Project | undefined>()
  const [viewingProject, setViewingProject] = useState<Project | undefined>()
  
  // 过滤当前用户的项目，个人事务项目置顶
  const myProjects = currentUser 
    ? projects
        .filter(p => p.memberIds.includes(currentUser.id))
        .sort((a, b) => {
          // 个人事务项目置顶
          const aIsPersonal = a.name.includes('个人事务')
          const bIsPersonal = b.name.includes('个人事务')
          if (aIsPersonal && !bIsPersonal) return -1
          if (!aIsPersonal && bIsPersonal) return 1
          return a.name.localeCompare(b.name)
        })
    : []
  
  // 删除确认对话框状态
  const [deleteTeamConfirm, setDeleteTeamConfirm] = useState<Team | null>(null)
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState<Project | null>(null)
  // 退出确认对话框状态
  const [leaveTeamConfirm, setLeaveTeamConfirm] = useState<Team | null>(null)
  const [leaveProjectConfirm, setLeaveProjectConfirm] = useState<Project | null>(null)

  // 检查是否可以管理团队（创建者或超管）
  const canManageTeam = (team: Team) => {
    return team.creatorId === currentUser?.id || currentUser?.isAdmin
  }

  // 检查是否可以管理项目（创建者或超管）
  const canManageProject = (project: Project) => {
    return project.creatorId === currentUser?.id || currentUser?.isAdmin
  }

  const handleCreateTeam = () => {
    setEditingTeam(undefined)
    setViewingTeam(undefined)
    setTeamDialogOpen(true)
  }

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team)
    setViewingTeam(undefined)
    setTeamDialogOpen(true)
  }

  const handleViewTeam = (team: Team) => {
    setViewingTeam(team)
    setEditingTeam(undefined)
    setTeamDialogOpen(true)
  }

  const handleDeleteTeam = (team: Team) => {
    setDeleteTeamConfirm(team)
  }

  const handleLeaveTeam = (team: Team) => {
    setLeaveTeamConfirm(team)
  }

  const confirmDeleteTeam = () => {
    if (deleteTeamConfirm) {
      deleteTeam(deleteTeamConfirm.id)
      if (selectedTeamId === deleteTeamConfirm.id) {
        setNavigationMode("my-days")
        setSelectedTeamId(null)
      }
      setDeleteTeamConfirm(null)
    }
  }

  const confirmLeaveTeam = async () => {
    if (leaveTeamConfirm) {
      await leaveTeam(leaveTeamConfirm.id)
      if (selectedTeamId === leaveTeamConfirm.id) {
        setNavigationMode("my-days")
        setSelectedTeamId(null)
      }
      setLeaveTeamConfirm(null)
    }
  }

  const handleCreateProject = () => {
    setEditingProject(undefined)
    setViewingProject(undefined)
    setProjectDialogOpen(true)
  }

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    setViewingProject(undefined)
    setProjectDialogOpen(true)
  }

  const handleViewProject = (project: Project) => {
    setViewingProject(project)
    setEditingProject(undefined)
    setProjectDialogOpen(true)
  }

  const handleDeleteProject = (project: Project) => {
    setDeleteProjectConfirm(project)
  }

  const handleLeaveProject = (project: Project) => {
    setLeaveProjectConfirm(project)
  }

  const confirmDeleteProject = () => {
    if (deleteProjectConfirm) {
      deleteProject(deleteProjectConfirm.id)
      if (selectedProjectId === deleteProjectConfirm.id) {
        setNavigationMode("my-days")
        setSelectedProjectId(null)
      }
      setDeleteProjectConfirm(null)
    }
  }

  const confirmLeaveProject = async () => {
    if (leaveProjectConfirm) {
      await leaveProject(leaveProjectConfirm.id)
      if (selectedProjectId === leaveProjectConfirm.id) {
        setNavigationMode("my-days")
        setSelectedProjectId(null)
      }
      setLeaveProjectConfirm(null)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-1 py-4">
        {/* My Days */}
        <button
          onClick={() => setNavigationMode("my-days")}
          className={cn(
            "flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/50 rounded-md mx-2",
            navigationMode === "my-days" && !selectedTeamId && !selectedProjectId && "bg-muted"
          )}
        >
          <Calendar className="h-4 w-4" />
          <span>My Days</span>
        </button>

        {/* My Teams */}
        <div>
          <div className="flex items-center gap-2 px-4 py-2 mx-2">
            <button
              onClick={() => setTeamsExpanded(!teamsExpanded)}
              className="flex items-center gap-2 flex-1 text-sm font-medium hover:bg-muted/50 rounded-md p-1"
            >
              {teamsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Users className="h-4 w-4" />
              <span>My Teams</span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCreateTeam}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {teamsExpanded && (
            <div className="ml-6 mt-1 space-y-1">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="group flex items-center gap-2 pr-2"
                >
                  <button
                    onClick={() => {
                      setNavigationMode("team")
                      setSelectedTeamId(team.id)
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-muted/50 rounded-md flex-1 text-left",
                      navigationMode === "team" && selectedTeamId === team.id && "bg-muted"
                    )}
                  >
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="truncate">{team.name}</span>
                    {/* 创建者标识 */}
                    {currentUser && team.creatorId === currentUser.id && (
                      <Crown className="h-3 w-3 text-yellow-600 shrink-0 ml-auto" />
                    )}
                  </button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canManageTeam(team) ? (
                        <>
                          <DropdownMenuItem onClick={() => handleEditTeam(team)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            <span>编辑</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteTeam(team)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>删除</span>
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={() => handleViewTeam(team)}>
                            <Eye className="mr-2 h-4 w-4" />
                            <span>查看</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleLeaveTeam(team)}
                            className="text-orange-600 focus:text-orange-600"
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>退出</span>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Projects */}
        <div>
          <div className="flex items-center gap-2 px-4 py-2 mx-2">
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className="flex items-center gap-2 flex-1 text-sm font-medium hover:bg-muted/50 rounded-md p-1"
            >
              {projectsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <FolderKanban className="h-4 w-4" />
              <span>My Projects</span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCreateProject}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {projectsExpanded && (
            <div className="ml-6 mt-1 space-y-1">
              {myProjects.map((project) => (
                <div
                  key={project.id}
                  className="group flex items-center gap-2 pr-2"
                >
                  <button
                    onClick={() => {
                      setNavigationMode("project")
                      setSelectedProjectId(project.id)
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-muted/50 rounded-md flex-1 text-left",
                      navigationMode === "project" && selectedProjectId === project.id && "bg-muted"
                    )}
                  >
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate">{project.name}</span>
                    {/* 创建者标识 */}
                    {currentUser && project.creatorId === currentUser.id && (
                      <Crown className="h-3 w-3 text-yellow-600 shrink-0 ml-auto" />
                    )}
                  </button>
                  
                  {/* 个人事务项目不显示编辑/删除按钮 */}
                  {!project.name.includes('个人事务') && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canManageProject(project) ? (
                          <>
                            <DropdownMenuItem onClick={() => handleEditProject(project)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>编辑</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteProject(project)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>删除</span>
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => handleViewProject(project)}>
                              <Eye className="mr-2 h-4 w-4" />
                              <span>查看</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleLeaveProject(project)}
                              className="text-orange-600 focus:text-orange-600"
                            >
                              <LogOut className="mr-2 h-4 w-4" />
                              <span>退出</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 团队对话框 */}
      {teamDialogOpen && (
        <TeamDialog
          team={editingTeam || viewingTeam}
          viewOnly={!!viewingTeam}
          onClose={() => {
            setTeamDialogOpen(false)
            setEditingTeam(undefined)
            setViewingTeam(undefined)
          }}
        />
      )}

      {/* 项目对话框 */}
      {projectDialogOpen && (
        <ProjectDialog
          project={editingProject || viewingProject}
          viewOnly={!!viewingProject}
          onClose={() => {
            setProjectDialogOpen(false)
            setEditingProject(undefined)
            setViewingProject(undefined)
          }}
        />
      )}

      {/* 删除团队确认对话框 */}
      <AlertDialog open={!!deleteTeamConfirm} onOpenChange={(open) => !open && setDeleteTeamConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除团队</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除团队 "{deleteTeamConfirm?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTeam} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除项目确认对话框 */}
      <AlertDialog open={!!deleteProjectConfirm} onOpenChange={(open) => !open && setDeleteProjectConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除项目</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除项目 "{deleteProjectConfirm?.name}" 吗?此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 退出团队确认对话框 */}
      <AlertDialog open={!!leaveTeamConfirm} onOpenChange={(open) => !open && setLeaveTeamConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认退出团队</AlertDialogTitle>
            <AlertDialogDescription>
              确定要退出团队 "{leaveTeamConfirm?.name}" 吗?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeaveTeam} className="bg-orange-600 hover:bg-orange-700">
              退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 退出项目确认对话框 */}
      <AlertDialog open={!!leaveProjectConfirm} onOpenChange={(open) => !open && setLeaveProjectConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认退出项目</AlertDialogTitle>
            <AlertDialogDescription>
              确定要退出项目 "{leaveProjectConfirm?.name}" 吗?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeaveProject} className="bg-orange-600 hover:bg-orange-700">
              退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
