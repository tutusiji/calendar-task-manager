"use client"

import { useState } from "react"
import { Plus, ChevronDown, ChevronRight, MoreVertical, Pencil, Trash2, Crown, Eye, LogOut, Pin } from "lucide-react"
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
import { userAPI } from "@/lib/api-client"
import { Badge } from "@/components/ui/badge"
import { showToast } from "@/lib/toast"

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
    setCurrentUser,
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
  
  // 过滤当前用户的团队
  const myTeams = currentUser
    ? teams.filter(t => t.memberIds.includes(currentUser.id))
    : []
  
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

  const handleSetDefaultTeam = async (teamId: string) => {
    try {
      const updatedUser = await userAPI.updateMe({ defaultTeamId: teamId })
      setCurrentUser(updatedUser)
      localStorage.setItem('currentUser', JSON.stringify(updatedUser))
      showToast.success('设置成功', '已设为默认团队')
    } catch (error) {
      console.error('Failed to set default team:', error)
      showToast.error('设置失败', '请稍后重试')
    }
  }

  return (
    <>
      <div className="flex flex-col gap-1 py-4">
        {/* My Days */}
        <button
          onClick={() => setNavigationMode("my-days")}
          className={cn(
            "flex items-center gap-2 py-2 text-sm font-medium transition-colors hover:bg-muted/50 rounded-md mx-2 pl-4",
            navigationMode === "my-days" && !selectedTeamId && !selectedProjectId && "bg-muted"
          )}
          style={{ marginLeft: '20px' }}
        >
          <svg 
            className="h-5 w-5" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="5" fill="#FDB813" />
            <path d="M12 1v3M12 20v3M23 12h-3M4 12H1M20.485 20.485l-2.121-2.121M5.636 5.636L3.515 3.515M20.485 3.515l-2.121 2.121M5.636 18.364l-2.121 2.121" stroke="#FDB813" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: 'Micro, sans-serif', fontWeight: 900, fontSize: '16px', letterSpacing: '0.5px' }}>My Days</span>
        </button>

        {/* My Teams */}
        <div>
          <div className="flex items-center gap-2 py-2 px-1 mx-1">
            <button
              onClick={() => setTeamsExpanded(!teamsExpanded)}
              className="flex items-center gap-2 flex-1 text-sm font-medium hover:bg-muted/50 rounded-md p-1"
            >
              {teamsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="7" r="4" fill="#3B82F6" />
                <path d="M5 20c0-4 3-7 7-7s7 3 7 7" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
                <circle cx="18" cy="6" r="3" fill="#60A5FA" />
                <circle cx="6" cy="6" r="3" fill="#60A5FA" />
              </svg>
              <span style={{ fontFamily: 'Micro, sans-serif', fontWeight: 900, fontSize: '16px', letterSpacing: '0.5px' }}>My Teams</span>
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
              {myTeams.map((team) => (
                <div
                  key={team.id}
                  className="group flex items-center gap-2 pr-2"
                >
                  <button
                    onClick={async () => {
                      setNavigationMode("team")
                      await setSelectedTeamId(team.id)
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
                    <span className="truncate max-w-[150px]" title={team.name}>{team.name}</span>
                    {/* 创建者标识 */}
                    <div className="ml-auto flex items-center gap-2">
                      {currentUser?.defaultTeamId === team.id && (
                        <Pin className="h-3 w-3 text-blue-500 rotate-45" />
                      )}
                      {currentUser && team.creatorId === currentUser.id && (
                        <Crown className="h-3 w-3 text-yellow-600 shrink-0" />
                      )}
                    </div>
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
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleSetDefaultTeam(team.id)}>
                        <Pin className="mr-2 h-4 w-4" />
                        <span>设为默认</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Projects */}
        <div>
          <div className="flex items-center gap-2 py-2 px-1 mx-1">
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className="flex items-center gap-2 flex-1 text-sm font-medium hover:bg-muted/50 rounded-md p-1"
            >
              {projectsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 7c0-1.1.9-2 2-2h5l2 2h7c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" fill="#A855F7" />
                <path d="M3 7h18" stroke="#7C3AED" strokeWidth="1.5" />
                <rect x="7" y="11" width="3" height="5" rx="1" fill="#E9D5FF" />
                <rect x="12" y="11" width="3" height="5" rx="1" fill="#E9D5FF" />
              </svg>
              <span style={{ fontFamily: 'Micro, sans-serif', fontWeight: 900, fontSize: '16px', letterSpacing: '0.5px' }}>My Projects</span>
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
              {myProjects.map((project, index) => (
                <div
                  key={project.id}
                  className="group flex items-center gap-2 pr-2"
                >
                  <button
                    onClick={async () => {
                      setNavigationMode("project")
                      await setSelectedProjectId(project.id)
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
                    <span className="truncate max-w-[150px]" title={project.name}>{project.name}</span>
                    {/* 第一个项目(个人事务)显示图钉图标 */}
                    {index === 0 && (
                      <Pin className="h-3 w-3 text-muted-foreground shrink-0 ml-auto translate-x-[-6px] rotate-45" />
                    )}
                    {/* 创建者标识(非第一个项目) */}
                    {index !== 0 && currentUser && project.creatorId === currentUser.id && (
                      <Crown className="h-3 w-3 text-yellow-600 shrink-0 ml-auto" />
                    )}
                  </button>
                  
                  {/* 第一个项目(个人事务)不显示编辑/删除按钮 */}
                  {index !== 0 && (
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
