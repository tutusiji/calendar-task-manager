"use client"

import { UserProfileSummary } from "@/components/profile/user-profile-summary"

import { UserProfileProjects } from "@/components/profile/user-profile-projects"
import { UserProfileTeams } from "@/components/profile/user-profile-teams"

import { useState,useEffect,useRef } from "react"
import { useCalendarState } from "@/lib/store/use-calendar-state"
import {
Dialog,
DialogContent,
DialogDescription,
DialogHeader,
DialogTitle,
} from "@/components/ui/dialog"
import { EditProfileDialog } from "@/components/edit-profile-dialog"
import { ChangePasswordDialog } from "@/components/change-password-dialog"
import type { User } from "@/lib/types"
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
import { showToast } from "@/lib/toast"
import { userAPI,teamAPI,projectAPI,type TeamWithMembers,type ProjectWithMembers } from "@/lib/api-client"
import { TeamDialog } from "@/components/sidebar/team-dialog"
import { ProjectDialog } from "@/components/sidebar/project-dialog"

interface UserProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserProfileDialog({ open, onOpenChange }: UserProfileDialogProps) {
  const { currentUser, teams, projects, setCurrentUser, fetchAllData } = useCalendarState("currentUser", "teams", "projects", "setCurrentUser", "fetchAllData")
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [confirmLeaveTeam, setConfirmLeaveTeam] = useState<string | null>(null)
  const [confirmLeaveProject, setConfirmLeaveProject] = useState<string | null>(null)
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<string | null>(null)
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState<string | null>(null)
  const [isLeaving, setIsLeaving] = useState<string | null>(null)
  const [editingTeam, setEditingTeam] = useState<TeamWithMembers | null>(null)
  const [editingProject, setEditingProject] = useState<ProjectWithMembers | null>(null)

  // 存储所有团队和项目（包括未加入的）
  const [allTeams, setAllTeams] = useState<TeamWithMembers[]>([])
  const [allProjects, setAllProjects] = useState<ProjectWithMembers[]>([])

  // 使用 ref 跟踪是否已经加载过数据，避免重复加载
  const hasLoadedRef = useRef(false)

  // 加载所有团队和项目
  useEffect(() => {
    if (open && currentUser && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadAllTeamsAndProjects()
      refreshCurrentUser() // 刷新用户信息以获取最新积分
    }

    // 对话框关闭时重置标记
    if (!open) {
      hasLoadedRef.current = false
    }
  }, [open, currentUser])

  const loadAllTeamsAndProjects = async () => {
    try {
      const [teamsData, projectsData] = await Promise.all([
        teamAPI.getAll(),
        projectAPI.getAll()
      ])

      setAllTeams(teamsData)
      // 过滤掉个人事务项目（名称包含"的个人事务"）
      const nonPersonalProjects = projectsData.filter(p => !p.name.includes('的个人事务'))
      setAllProjects(nonPersonalProjects)
    } catch (error) {
      console.error('Load teams and projects failed:', error)
    }
  }

  // 刷新当前用户信息（包括积分）
  const refreshCurrentUser = async () => {
    try {
      const updatedUser = await userAPI.getMe()
      setCurrentUser(updatedUser)
      localStorage.setItem('currentUser', JSON.stringify(updatedUser))
    } catch (error) {
      console.error('Refresh user info failed:', error)
    }
  }

  if (!currentUser) return null

  // 获取用户所在的团队
  const userTeams = teams.filter((team) => team.memberIds.includes(currentUser.id))

  // 获取用户参与的项目
  const userProjects = projects.filter((project) => project.memberIds.includes(currentUser.id))

  // 处理头像上传
  const handleAvatarUpload = async (file: File) => {
    try {
      showToast.info('处理中', '正在处理头像...')

      // 1. 前端压缩图片
      const { compressImage } = await import('@/lib/image-utils')
      const compressedBase64 = await compressImage(file)

      // 2. 直接更新用户头像 (Base64)
      const updatedUser = await userAPI.updateMe({ avatar: compressedBase64 })

      // 3. 更新本地状态
      setCurrentUser(updatedUser)
      localStorage.setItem('currentUser', JSON.stringify(updatedUser))

      showToast.success('上传成功', '头像已更新')
    } catch (error: any) {
      console.error('Upload avatar failed:', error)
      showToast.error('上传失败', error.message || '请稍后重试')
    }
  }

  // 处理个人信息保存
  const handleSaveProfile = async (data: Partial<User>) => {
    try {
      // 调用 API 更新用户信息
      const updatedUser = await userAPI.updateMe(data)

      // 更新本地状态
      setCurrentUser(updatedUser)
      localStorage.setItem('currentUser', JSON.stringify(updatedUser))

      showToast.success('保存成功', '个人信息已更新')
    } catch (error: any) {
      console.error('Save profile failed:', error)
      showToast.error('保存失败', error.message || '请稍后重试')
      throw error
    }
  }

  // 处理修改密码
  const handleChangePassword = async (data: { oldPassword: string; newPassword: string }) => {
    try {
      await userAPI.changePassword(data)
      showToast.success('修改成功', '密码已更新，请牢记新密码')
    } catch (error: any) {
      console.error('Change password failed:', error)
      showToast.error('修改失败', error.message || '请稍后重试')
      throw error
    }
  }

  // 处理退出团队
  const handleLeaveTeam = async (teamId: string) => {
    try {
      setIsLeaving(teamId)
      await teamAPI.leave(teamId)
      showToast.success('退出成功', '已退出团队')
      setConfirmLeaveTeam(null)
      // 重新加载数据
      await Promise.all([
        loadAllTeamsAndProjects(),
        fetchAllData()
      ])
    } catch (error: any) {
      showToast.error('退出失败', error.message || '请稍后重试')
    } finally {
      setIsLeaving(null)
    }
  }

  // 处理加入团队
  const handleJoinTeam = async (teamId: string) => {
    try {
      setIsJoining(teamId)
      await teamAPI.join(teamId)
      showToast.success('加入成功', '已加入团队')
      // 重新加载数据
      await Promise.all([
        loadAllTeamsAndProjects(),
        fetchAllData()
      ])
    } catch (error: any) {
      showToast.error('加入失败', error.message || '请稍后重试')
    } finally {
      setIsJoining(null)
    }
  }

  // 处理退出项目
  const handleLeaveProject = async (projectId: string) => {
    try {
      setIsLeaving(projectId)
      await projectAPI.leave(projectId)
      showToast.success('退出成功', '已退出项目')
      setConfirmLeaveProject(null)
      // 重新加载数据
      await Promise.all([
        loadAllTeamsAndProjects(),
        fetchAllData()
      ])
    } catch (error: any) {
      showToast.error('退出失败', error.message || '请稍后重试')
    } finally {
      setIsLeaving(null)
    }
  }

  // 处理加入项目
  const handleJoinProject = async (projectId: string) => {
    try {
      setIsJoining(projectId)
      await projectAPI.join(projectId)
      showToast.success('加入成功', '已加入项目')
      // 重新加载数据
      await Promise.all([
        loadAllTeamsAndProjects(),
        fetchAllData()
      ])
    } catch (error: any) {
      showToast.error('加入失败', error.message || '请稍后重试')
    } finally {
      setIsJoining(null)
    }
  }

  // 处理删除团队
  const handleDeleteTeam = async (teamId: string) => {
    try {
      // TODO: 调用 API 删除团队
      console.log('Delete team:', teamId)
      showToast.success('删除成功', '团队已删除')
      setConfirmDeleteTeam(null)
    } catch (error) {
      showToast.error('删除失败', '请稍后重试')
    }
  }

  // 处理删除项目
  const handleDeleteProject = async (projectId: string) => {
    try {
      // TODO: 调用 API 删除项目
      console.log('Delete project:', projectId)
      showToast.success('删除成功', '项目已删除')
      setConfirmDeleteProject(null)
    } catch (error) {
      showToast.error('删除失败', '请稍后重试')
    }
  }

  // 处理编辑团队
  const handleEditTeam = (teamId: string) => {
    const team = allTeams.find(t => t.id === teamId)
    if (team) {
      setEditingTeam(team)
    }
  }

  // 处理编辑项目
  const handleEditProject = (projectId: string) => {
    const project = allProjects.find(p => p.id === projectId)
    if (project) {
      setEditingProject(project)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[90vw] sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>个人中心</DialogTitle>
            <DialogDescription>查看和管理您的个人信息、团队和项目</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* 基本信息 */}
            <UserProfileSummary
              currentUser={currentUser}
              handleAvatarUpload={handleAvatarUpload}
              setEditProfileOpen={setEditProfileOpen}
              setChangePasswordOpen={setChangePasswordOpen}
              allTeams={allTeams}
            />

            {/* <Separator /> */}

            {/* 团队和项目信息 - 并列显示 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-[50px]">
              {/* 团队信息 */}
              <UserProfileTeams
                allTeams={allTeams}
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                setConfirmLeaveTeam={setConfirmLeaveTeam}
                isLeaving={isLeaving}
                handleJoinTeam={handleJoinTeam}
                isJoining={isJoining}
                handleEditTeam={handleEditTeam}
                setConfirmDeleteTeam={setConfirmDeleteTeam}
              />

              {/* 项目信息 */}
              <UserProfileProjects
                allProjects={allProjects}
                currentUser={currentUser}
                setConfirmLeaveProject={setConfirmLeaveProject}
                isLeaving={isLeaving}
                handleJoinProject={handleJoinProject}
                isJoining={isJoining}
                handleEditProject={handleEditProject}
                setConfirmDeleteProject={setConfirmDeleteProject}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑个人信息对话框 */}
      <EditProfileDialog
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        currentUser={currentUser}
        onSave={handleSaveProfile}
      />

      {/* 修改密码对话框 */}
      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
        onSave={handleChangePassword}
      />

      {/* 退出团队确认 */}
      <AlertDialog open={!!confirmLeaveTeam} onOpenChange={(open) => !open && setConfirmLeaveTeam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认退出团队？</AlertDialogTitle>
            <AlertDialogDescription>
              退出团队后，您将无法访问该团队的资源。您可以稍后重新加入。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmLeaveTeam && handleLeaveTeam(confirmLeaveTeam)}>
              确认退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 退出项目确认 */}
      <AlertDialog open={!!confirmLeaveProject} onOpenChange={(open) => !open && setConfirmLeaveProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认退出项目？</AlertDialogTitle>
            <AlertDialogDescription>
              退出项目后，您将无法访问该项目的任务和资源。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmLeaveProject && handleLeaveProject(confirmLeaveProject)}>
              确认退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除团队确认 */}
      <AlertDialog open={!!confirmDeleteTeam} onOpenChange={(open) => !open && setConfirmDeleteTeam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除团队？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。删除团队将同时删除团队下的所有项目和任务。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => confirmDeleteTeam && handleDeleteTeam(confirmDeleteTeam)}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除项目确认 */}
      <AlertDialog open={!!confirmDeleteProject} onOpenChange={(open) => !open && setConfirmDeleteProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除项目？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。删除项目将同时删除项目下的所有任务。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => confirmDeleteProject && handleDeleteProject(confirmDeleteProject)}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 编辑团队对话框 */}
      {editingTeam && (
        <TeamDialog
          team={editingTeam}
          onClose={(saved) => {
            setEditingTeam(null)
            if (saved) {
              // 只在保存成功时才重新加载数据和刷新页面
              loadAllTeamsAndProjects()
              window.location.reload()
            }
          }}
        />
      )}

      {/* 编辑项目对话框 */}
      {editingProject && (
        <ProjectDialog
          project={editingProject}
          onClose={(saved) => {
            setEditingProject(null)
            if (saved) {
              // 只在保存成功时才重新加载数据和刷新页面
              loadAllTeamsAndProjects()
              window.location.reload()
            }
          }}
        />
      )}
    </>
  )
}
