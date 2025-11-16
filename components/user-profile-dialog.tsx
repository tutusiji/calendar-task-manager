"use client"

import { useState } from "react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Mail, 
  Briefcase, 
  Users, 
  FolderKanban, 
  Edit, 
  LogOut, 
  Trash2, 
  Crown,
  User as UserIcon,
  Key
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { AvatarUpload } from "@/components/avatar-upload"
import { EditProfileDialog } from "@/components/edit-profile-dialog"
import { ChangePasswordDialog } from "@/components/change-password-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
import { userAPI, teamAPI, projectAPI } from "@/lib/api-client"
import { useEffect } from "react"
import { TeamDialog } from "@/components/sidebar/team-dialog"
import { ProjectDialog } from "@/components/sidebar/project-dialog"

interface UserProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserProfileDialog({ open, onOpenChange }: UserProfileDialogProps) {
  const { currentUser, teams, projects, setCurrentUser, fetchAllData } = useCalendarStore()
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [confirmLeaveTeam, setConfirmLeaveTeam] = useState<string | null>(null)
  const [confirmLeaveProject, setConfirmLeaveProject] = useState<string | null>(null)
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<string | null>(null)
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState<string | null>(null)
  const [isLeaving, setIsLeaving] = useState<string | null>(null)
  const [editingTeam, setEditingTeam] = useState<any | null>(null)
  const [editingProject, setEditingProject] = useState<any | null>(null)

  // 存储所有团队和项目（包括未加入的）
  const [allTeams, setAllTeams] = useState<any[]>([])
  const [allProjects, setAllProjects] = useState<any[]>([])

  // 加载所有团队和项目
  useEffect(() => {
    if (open && currentUser) {
      loadAllTeamsAndProjects()
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

  if (!currentUser) return null

  // 获取用户所在的团队
  const userTeams = teams.filter((team) => team.memberIds.includes(currentUser.id))
  
  // 获取用户参与的项目
  const userProjects = projects.filter((project) => project.memberIds.includes(currentUser.id))

  // 处理头像上传
  const handleAvatarUpload = async (file: File) => {
    try {
      showToast.info('上传中', '正在上传头像...')
      
      // 1. 上传图片文件
      const uploadResult = await userAPI.uploadAvatar(file)
      
      // 2. 更新用户头像
      const updatedUser = await userAPI.updateMe({ avatar: uploadResult.url })
      
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
            <div className="flex items-start gap-6">
              {/* 头像 */}
              <AvatarUpload
                currentAvatar={currentUser.avatar}
                userName={currentUser.name}
                onUpload={handleAvatarUpload}
              />

              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold">
                      {currentUser.name}
                      <span className="text-lg text-muted-foreground ml-2">({currentUser.username})</span>
                    </h3>
                    {currentUser.role && currentUser.role !== '未设置' && (
                      <Badge variant="secondary" className="mt-2">
                        <Briefcase className="mr-1 h-3 w-3" />
                        {currentUser.role}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditProfileOpen(true)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      编辑资料
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setChangePasswordOpen(true)}
                    >
                      <Key className="mr-2 h-4 w-4" />
                      修改密码
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{currentUser.email}</span>
                  </div>
                  {currentUser.gender && currentUser.gender !== '未设置' && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserIcon className="h-4 w-4" />
                      <span>{currentUser.gender}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* 团队和项目信息 - 并列显示 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 团队信息 */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5" />
                    团队列表
                    <Badge variant="outline" className="ml-auto">
                      {allTeams.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto max-h-[300px]">
                  {allTeams.length === 0 ? (
                    <p className="text-sm text-muted-foreground">暂无团队</p>
                  ) : (
                    <div className="space-y-3">
                      {allTeams.map((team) => {
                        const isCreator = team.creatorId === currentUser.id
                        const isMember = team.memberIds?.includes(currentUser.id) || false
                        return (
                          <div
                            key={team.id}
                            className="rounded-lg border border-border hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 p-3">
                              <div
                                className="h-10 w-10 rounded-lg shrink-0"
                                style={{ backgroundColor: team.color }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-sm">{team.name}</h4>
                                  {isCreator && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Crown className="mr-1 h-3 w-3" />
                                      创建者
                                    </Badge>
                                  )}
                                </div>
                                {team.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {team.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <TooltipProvider>
                                    <Tooltip delayDuration={200}>
                                      <TooltipTrigger asChild>
                                        <Badge variant="secondary" className="text-xs cursor-help">
                                          {team.memberIds?.length || 0} 成员
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent side="right" className="max-w-xs">
                                        <div className="space-y-2">
                                          <p className="font-semibold text-xs mb-2">团队成员</p>
                                          <div className="grid gap-2">
                                            {team.members?.map((member: any) => (
                                              <div key={member.id} className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                  <AvatarImage src={member.avatar} />
                                                  <AvatarFallback className="text-xs">
                                                    {member.name?.charAt(0)}
                                                  </AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs">{member.name}</span>
                                              </div>
                                            )) || (
                                              <p className="text-xs text-muted-foreground">暂无成员信息</p>
                                            )}
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>
                              {/* 操作按钮 - 非创建者显示在右侧 */}
                              {!isCreator && (
                                <div className="flex items-center gap-2 shrink-0">
                                  {isMember ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-orange-500 hover:text-orange-600"
                                      onClick={() => setConfirmLeaveTeam(team.id)}
                                      disabled={isLeaving === team.id}
                                    >
                                      <LogOut className="mr-1 h-3 w-3" />
                                      {isLeaving === team.id ? '退出中...' : '退出'}
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => handleJoinTeam(team.id)}
                                      disabled={isJoining === team.id}
                                    >
                                      {isJoining === team.id ? '加入中...' : '加入'}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                            {/* 创建者的编辑和删除按钮显示在底部 */}
                            {isCreator && (
                              <div className="flex items-center gap-2 px-3 pb-3 pt-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleEditTeam(team.id)}
                                >
                                  <Edit className="mr-1 h-3 w-3" />
                                  编辑
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 text-red-500 hover:text-red-600"
                                  onClick={() => setConfirmDeleteTeam(team.id)}
                                >
                                  <Trash2 className="mr-1 h-3 w-3" />
                                  删除
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 项目信息 */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FolderKanban className="h-5 w-5" />
                    项目列表
                    <Badge variant="outline" className="ml-auto">
                      {allProjects.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto max-h-[300px]">
                  {allProjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">暂无项目</p>
                  ) : (
                    <div className="space-y-3">
                      {allProjects.map((project) => {
                        const isCreator = project.creatorId === currentUser.id
                        const isMember = project.memberIds?.includes(currentUser.id) || false
                        return (
                          <div
                            key={project.id}
                            className="rounded-lg border border-border hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 p-3">
                              <div
                                className="h-10 w-10 rounded-lg shrink-0"
                                style={{ backgroundColor: project.color }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-sm">{project.name}</h4>
                                  {isCreator && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Crown className="mr-1 h-3 w-3" />
                                      创建者
                                    </Badge>
                                  )}
                                </div>
                                {project.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {project.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <TooltipProvider>
                                    <Tooltip delayDuration={200}>
                                      <TooltipTrigger asChild>
                                        <Badge variant="secondary" className="text-xs cursor-help">
                                          {project.memberIds?.length || 0} 成员
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent side="right" className="max-w-xs">
                                        <div className="space-y-2">
                                          <p className="font-semibold text-xs mb-2">项目成员</p>
                                          <div className="grid gap-2">
                                            {project.members?.map((member: any) => (
                                              <div key={member.id} className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                  <AvatarImage src={member.avatar} />
                                                  <AvatarFallback className="text-xs">
                                                    {member.name?.charAt(0)}
                                                  </AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs">{member.name}</span>
                                              </div>
                                            )) || (
                                              <p className="text-xs text-muted-foreground">暂无成员信息</p>
                                            )}
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>
                              {/* 操作按钮 - 非创建者显示在右侧 */}
                              {!isCreator && (
                                <div className="flex items-center gap-2 shrink-0">
                                  {isMember ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-orange-500 hover:text-orange-600"
                                      onClick={() => setConfirmLeaveProject(project.id)}
                                      disabled={isLeaving === project.id}
                                    >
                                      <LogOut className="mr-1 h-3 w-3" />
                                      {isLeaving === project.id ? '退出中...' : '退出'}
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => handleJoinProject(project.id)}
                                      disabled={isJoining === project.id}
                                    >
                                      {isJoining === project.id ? '加入中...' : '加入'}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                            {/* 创建者的编辑和删除按钮显示在底部 */}
                            {isCreator && (
                              <div className="flex items-center gap-2 px-3 pb-3 pt-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleEditProject(project.id)}
                                >
                                  <Edit className="mr-1 h-3 w-3" />
                                  编辑
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 text-red-500 hover:text-red-600"
                                  onClick={() => setConfirmDeleteProject(project.id)}
                                >
                                  <Trash2 className="mr-1 h-3 w-3" />
                                  删除
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
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
          onClose={() => {
            setEditingTeam(null)
            // 重新加载数据
            loadAllTeamsAndProjects()
            // 触发全局数据刷新
            window.location.reload()
          }}
        />
      )}

      {/* 编辑项目对话框 */}
      {editingProject && (
        <ProjectDialog
          project={editingProject}
          onClose={() => {
            setEditingProject(null)
            // 重新加载数据
            loadAllTeamsAndProjects()
            // 触发全局数据刷新
            window.location.reload()
          }}
        />
      )}
    </>
  )
}
