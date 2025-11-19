"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Users, Briefcase, FolderKanban, Trash2, Plus } from "lucide-react"
import { organizationAPI } from "@/lib/api/organization"
import { useToast } from "@/hooks/use-toast"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { UserSelectorDialog } from "@/components/user-selector-dialog"
import { TeamDialog } from "@/components/sidebar/team-dialog"
import { ProjectDialog } from "@/components/sidebar/project-dialog"

interface OrganizationDetailDialogProps {
  organizationId: string | null
  organizationName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface OrgDetails {
  creatorId?: string // 组织创建人ID
  members: Array<{ 
    id: string // 用户ID
    name: string
    email: string
    avatar?: string | null
    role: string
    joinedAt?: Date
    inviter?: {
      id: string
      name: string
    } | null
  }>
  teams: Array<{ id: string; name: string; color: string; memberCount: number }>
  projects: Array<{ id: string; name: string; color: string; memberCount: number }>
}

export function OrganizationDetailDialog({
  organizationId,
  organizationName,
  open,
  onOpenChange,
}: OrganizationDetailDialogProps) {
  const { toast } = useToast()
  const { currentUser } = useCalendarStore()
  const [orgDetails, setOrgDetails] = useState<OrgDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    type: 'member' | 'team' | 'project'
    id: string
    name: string
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [userSelectorOpen, setUserSelectorOpen] = useState(false)
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)

  // 检查当前用户是否是组织所有者(OWNER角色)
  const isOwner = orgDetails?.members.find(m => m.id === currentUser?.id)?.role === 'OWNER'

  useEffect(() => {
    if (open && organizationId) {
      fetchOrganizationDetails(organizationId)
    }
  }, [open, organizationId])

  const fetchOrganizationDetails = async (orgId: string) => {
    setIsLoading(true)
    try {
      // 获取组织信息、成员、团队和项目
      const [organization, members, teams, projects] = await Promise.all([
        organizationAPI.getById(orgId),
        organizationAPI.getMembers(orgId),
        organizationAPI.getTeams(orgId),
        organizationAPI.getProjects(orgId),
      ])

      setOrgDetails({
        creatorId: organization.creatorId,
        members,
        teams,
        projects,
      })
    } catch (error) {
      console.error("获取组织详情失败:", error)
      toast({
        title: "加载失败",
        description: "无法加载组织详情",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 删除成员
  const handleDeleteMember = async (memberId: string, userId: string) => {
    if (!organizationId) return
    
    setIsDeleting(true)
    try {
      await organizationAPI.removeMember(organizationId, userId)
      toast({
        title: "删除成功",
        description: "成员已从组织中移除",
      })
      // 重新加载数据
      await fetchOrganizationDetails(organizationId)
    } catch (error: any) {
      toast({
        title: "删除失败",
        description: error.message || "无法删除成员",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialog(null)
    }
  }

  // 删除团队
  const handleDeleteTeam = async (teamId: string) => {
    if (!organizationId) return
    
    setIsDeleting(true)
    try {
      await organizationAPI.deleteTeam(teamId)
      
      toast({
        title: "删除成功",
        description: "团队已删除",
      })
      // 重新加载数据
      await fetchOrganizationDetails(organizationId)
    } catch (error: any) {
      toast({
        title: "删除失败",
        description: error.message || "无法删除团队",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialog(null)
    }
  }

  // 删除项目
  const handleDeleteProject = async (projectId: string) => {
    if (!organizationId) return
    
    setIsDeleting(true)
    try {
      await organizationAPI.deleteProject(projectId)
      
      toast({
        title: "删除成功",
        description: "项目已删除",
      })
      // 重新加载数据
      await fetchOrganizationDetails(organizationId)
    } catch (error: any) {
      toast({
        title: "删除失败",
        description: error.message || "无法删除项目",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialog(null)
    }
  }

  // 确认删除
  const confirmDelete = () => {
    if (!deleteDialog) return

    switch (deleteDialog.type) {
      case 'member':
        const member = orgDetails?.members.find(m => m.id === deleteDialog.id)
        if (member) handleDeleteMember(deleteDialog.id, member.id)
        break
      case 'team':
        handleDeleteTeam(deleteDialog.id)
        break
      case 'project':
        handleDeleteProject(deleteDialog.id)
        break
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[840px]! max-h-[85vh] min-h-[340px] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-3">
            <span className="text-[22px] font-bold">【{organizationName}】</span> 
            {/* <span>空间详情</span> */}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <div className="text-sm text-muted-foreground">加载中...</div>
            </div>
          </div>
        ) : orgDetails ? (
          <div className="grid grid-cols-3 gap-6 overflow-y-auto px-1">
            {/* 成员列表 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  成员 ({orgDetails.members.length})
                </h3>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setUserSelectorOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {orgDetails.members.map((member) => (
                  <div
                    key={member.id}
                    className="text-sm p-3 rounded-lg border hover:bg-accent/50 transition-colors relative group"
                  >
                    <Badge variant="outline" className="text-[10px] absolute top-2 right-2">
                      {member.role === 'OWNER' ? '所有者' : member.role === 'ADMIN' ? '管理员' : '成员'}
                    </Badge>
                    {/* 删除按钮 - 只有所有者可见且不能删除自己 */}
                    {isOwner && member.id !== currentUser?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute bottom-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-transparent"
                        onClick={() => setDeleteDialog({
                          open: true,
                          type: 'member',
                          id: member.id,
                          name: member.name
                        })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={member.avatar || undefined} alt={member.name} />
                        <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-base max-w-[120px]">{member.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                        {member.inviter && (
                          <div className="text-xs text-muted-foreground mt-1">
                            邀请人: {member.inviter.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {orgDetails.members.length === 0 && (
                  <div className="text-sm text-muted-foreground py-8 text-center">暂无成员</div>
                )}
              </div>
            </div>

            {/* 团队列表 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  团队 ({orgDetails.teams.length})
                </h3>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setTeamDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {orgDetails.teams.map((team) => (
                  <div
                    key={team.id}
                    className="text-sm p-3 rounded-lg border hover:bg-accent/50 transition-colors relative group"
                  >
                    {/* 删除按钮 - 只有所有者可见 */}
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute bottom-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-transparent"
                        onClick={() => setDeleteDialog({
                          open: true,
                          type: 'team',
                          id: team.id,
                          name: team.name
                        })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: team.color }}
                      />
                      <span className="font-medium truncate text-base">{team.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {team.memberCount} 成员
                    </div>
                  </div>
                ))}
                {orgDetails.teams.length === 0 && (
                  <div className="text-sm text-muted-foreground py-8 text-center">暂无团队</div>
                )}
              </div>
            </div>

            {/* 项目列表 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <FolderKanban className="h-5 w-5" />
                  项目 ({orgDetails.projects.filter(p => !p.name.includes('的个人事务')).length})
                </h3>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setProjectDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {/* 正常项目 */}
                {orgDetails.projects.filter(p => !p.name.includes('的个人事务')).map((project) => (
                  <div
                    key={project.id}
                    className="text-sm p-3 rounded-lg border hover:bg-accent/50 transition-colors relative group"
                  >
                    {/* 删除按钮 - 只有所有者可见 */}
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute bottom-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-transparent"
                        onClick={() => setDeleteDialog({
                          open: true,
                          type: 'project',
                          id: project.id,
                          name: project.name
                        })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="font-medium truncate text-base">{project.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {project.memberCount} 成员
                    </div>
                  </div>
                ))}
                {orgDetails.projects.filter(p => !p.name.includes('的个人事务')).length === 0 && (
                  <div className="text-sm text-muted-foreground py-8 text-center">暂无项目</div>
                )}
                
                {/* 个人事务项目 - 灰色显示,不显示删除按钮 */}
                {orgDetails.projects.filter(p => p.name.includes('的个人事务')).length > 0 && (
                  <>
                    <div className="text-xs text-muted-foreground pt-2 pb-1 border-t">
                      个人事务项目:
                    </div>
                    {orgDetails.projects.filter(p => p.name.includes('的个人事务')).map((project) => (
                      <div
                        key={project.id}
                        className="text-sm p-3 rounded-lg border border-dashed bg-muted/20 opacity-60"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full shrink-0 opacity-50"
                            style={{ backgroundColor: project.color }}
                          />
                          <span className="font-medium truncate text-base text-muted-foreground">{project.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          {project.memberCount} 成员
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialog?.open || false} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog?.type === 'member' && `确定要将成员 "${deleteDialog.name}" 从组织中移除吗？`}
              {deleteDialog?.type === 'team' && `确定要删除团队 "${deleteDialog.name}" 吗？此操作将删除团队下的所有任务。`}
              {deleteDialog?.type === 'project' && `确定要删除项目 "${deleteDialog.name}" 吗？此操作将删除项目下的所有任务。`}
              <br />
              <span className="text-destructive font-medium">此操作无法撤销!</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 用户选择器对话框 */}
      {organizationId && organizationName && (
        <UserSelectorDialog
          organizationId={organizationId}
          organizationName={organizationName}
          open={userSelectorOpen}
          onOpenChange={setUserSelectorOpen}
          onSuccess={() => {
            // 刷新组织详情
            if (organizationId) {
              fetchOrganizationDetails(organizationId)
            }
          }}
        />
      )}

      {/* 团队创建对话框 */}
      {teamDialogOpen && (
        <TeamDialog
          onClose={(saved) => {
            setTeamDialogOpen(false)
            if (saved && organizationId) {
              fetchOrganizationDetails(organizationId)
            }
          }}
        />
      )}

      {/* 项目创建对话框 */}
      {projectDialogOpen && (
        <ProjectDialog
          onClose={(saved) => {
            setProjectDialogOpen(false)
            if (saved && organizationId) {
              fetchOrganizationDetails(organizationId)
            }
          }}
        />
      )}
    </Dialog>
  )
}
