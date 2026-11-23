"use client"

import { NavigationArchivedProjectsSection } from "@/components/sidebar/navigation-archived-projects-section"
import { NavigationProjectsSection } from "@/components/sidebar/navigation-projects-section"
import { NavigationTeamsSection } from "@/components/sidebar/navigation-teams-section"

import { useState,type DragEvent } from "react"
import { cn } from "@/lib/utils"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { useCalendarState } from "@/lib/store/use-calendar-state"
import { useSidebarData } from "@/hooks/use-sidebar-data"
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
import type { Team,Project } from "@/lib/types"
import { projectAPI,userAPI } from "@/lib/api-client"
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
    reorderTeams,
    reorderProjects,
    setCurrentUser,
  } = useCalendarState(
    "navigationMode",
    "setNavigationMode",
    "selectedTeamId",
    "setSelectedTeamId",
    "selectedProjectId",
    "setSelectedProjectId",
    "teams",
    "projects",
    "currentUser",
    "deleteTeam",
    "deleteProject",
    "leaveTeam",
    "leaveProject",
    "reorderTeams",
    "reorderProjects",
    "setCurrentUser"
  )

  const [draggedTeamId, setDraggedTeamId] = useState<string | null>(null)
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null)

  // 对话框状态
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | undefined>()
  const [viewingTeam, setViewingTeam] = useState<Team | undefined>()
  const [editingProject, setEditingProject] = useState<Project | undefined>()
  const [viewingProject, setViewingProject] = useState<Project | undefined>()

  const moveItem = (ids: string[], activeId: string, targetId: string) => {
    const fromIndex = ids.indexOf(activeId)
    const toIndex = ids.indexOf(targetId)

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return ids
    }

    const nextIds = [...ids]
    const [movedId] = nextIds.splice(fromIndex, 1)
    nextIds.splice(toIndex, 0, movedId)
    return nextIds
  }

  const handleTeamDragOver = (event: DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault()
    if (!draggedTeamId || draggedTeamId === targetId) return

    const currentIds = myTeams.map((team) => team.id)
    const nextIds = moveItem(currentIds, draggedTeamId, targetId)
    if (nextIds === currentIds) return

    void reorderTeams(nextIds, { persist: false })
  }

  const handleProjectDragOver = (event: DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault()
    if (!draggedProjectId || draggedProjectId === targetId) return

    const currentIds = myProjects.map((project) => project.id)
    const nextIds = moveItem(currentIds, draggedProjectId, targetId)
    if (nextIds === currentIds) return

    void reorderProjects(nextIds, { persist: false })
  }

  const persistTeamOrder = () => {
    if (!draggedTeamId) return
    void reorderTeams(myTeams.map(team => team.id))
    setDraggedTeamId(null)
  }

  const persistProjectOrder = () => {
    if (!draggedProjectId) return
    void reorderProjects(myProjects.map(project => project.id))
    setDraggedProjectId(null)
  }

  const { myTeams, myProjects, archivedProjects, canManageTeam, canManageProject } =
    useSidebarData({ teams, projects, currentUser })

  // 删除确认对话框状态
  const [deleteTeamConfirm, setDeleteTeamConfirm] = useState<Team | null>(null)
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState<Project | null>(null)
  // 退出确认对话框状态
  const [leaveTeamConfirm, setLeaveTeamConfirm] = useState<Team | null>(null)
  const [leaveProjectConfirm, setLeaveProjectConfirm] = useState<Project | null>(null)

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

  const handleArchiveProject = async (project: Project) => {
    try {
      await projectAPI.archive(project.id)

      // 更新本地状态
      const updatedProjects = projects.map(p =>
        p.id === project.id ? { ...p, isArchived: true, archivedAt: new Date() } : p
      )
      useCalendarStore.setState({ projects: updatedProjects })

      // 如果当前选中的是被归档的项目，切换到 My Days
      if (selectedProjectId === project.id) {
        setNavigationMode("my-days")
        setSelectedProjectId(null)
      }

      showToast.success('归档成功', '项目已归档')
    } catch (error: any) {
      console.error('Failed to archive project:', error)
      showToast.error('归档失败', error.message || '请稍后重试')
    }
  }

  const handleUnarchiveProject = async (project: Project) => {
    try {
      await projectAPI.unarchive(project.id)

      // 更新本地状态
      const updatedProjects = projects.map(p =>
        p.id === project.id ? { ...p, isArchived: false, archivedAt: undefined } : p
      )
      useCalendarStore.setState({ projects: updatedProjects })

      showToast.success('取消归档成功', '项目已恢复')
    } catch (error: any) {
      console.error('Failed to unarchive project:', error)
      showToast.error('取消归档失败', error.message || '请稍后重试')
    }
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
        <NavigationTeamsSection
          handleCreateTeam={handleCreateTeam}
          myTeams={myTeams}
          handleTeamDragOver={handleTeamDragOver}
          persistTeamOrder={persistTeamOrder}
          draggedTeamId={draggedTeamId}
          setDraggedTeamId={setDraggedTeamId}
          setNavigationMode={setNavigationMode}
          setSelectedTeamId={setSelectedTeamId}
          navigationMode={navigationMode}
          selectedTeamId={selectedTeamId}
          currentUser={currentUser}
          canManageTeam={canManageTeam}
          handleEditTeam={handleEditTeam}
          handleDeleteTeam={handleDeleteTeam}
          handleViewTeam={handleViewTeam}
          handleLeaveTeam={handleLeaveTeam}
          handleSetDefaultTeam={handleSetDefaultTeam}
        />

        {/* My Projects */}
        <NavigationProjectsSection
          handleCreateProject={handleCreateProject}
          myProjects={myProjects}
          handleProjectDragOver={handleProjectDragOver}
          persistProjectOrder={persistProjectOrder}
          draggedProjectId={draggedProjectId}
          setDraggedProjectId={setDraggedProjectId}
          setNavigationMode={setNavigationMode}
          setSelectedProjectId={setSelectedProjectId}
          navigationMode={navigationMode}
          selectedProjectId={selectedProjectId}
          currentUser={currentUser}
          canManageProject={canManageProject}
          handleEditProject={handleEditProject}
          handleArchiveProject={handleArchiveProject}
          handleDeleteProject={handleDeleteProject}
          handleViewProject={handleViewProject}
          handleLeaveProject={handleLeaveProject}
        />

        {/* Archived Projects */}
        <NavigationArchivedProjectsSection
          archivedProjects={archivedProjects}
          setNavigationMode={setNavigationMode}
          setSelectedProjectId={setSelectedProjectId}
          navigationMode={navigationMode}
          selectedProjectId={selectedProjectId}
          currentUser={currentUser}
          canManageProject={canManageProject}
          handleUnarchiveProject={handleUnarchiveProject}
          handleDeleteProject={handleDeleteProject}
          handleViewProject={handleViewProject}
          handleLeaveProject={handleLeaveProject}
        />
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
