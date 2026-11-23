"use client"

import type { OrgDetails } from "@/components/organization/organization-types"

import { OrganizationProjectsSection } from "@/components/organization/organization-projects-section"
import { OrganizationTeamsSection } from "@/components/organization/organization-teams-section"
import { OrganizationMembersSection } from "@/components/organization/organization-members-section"

import { useState,useEffect } from "react"
import {
Dialog,
DialogContent,DialogHeader,
DialogTitle
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
import { organizationAPI } from "@/lib/api/organization"
import { useToast } from "@/hooks/use-toast"
import { useCalendarState } from "@/lib/store/use-calendar-state"
import { UserSelectorDialog } from "@/components/user-selector-dialog"
import { TeamDialog } from "@/components/sidebar/team-dialog"
import { ProjectDialog } from "@/components/sidebar/project-dialog"

interface OrganizationDetailDialogProps {
  organizationId: string | null
  organizationName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}


export function OrganizationDetailDialog({
  organizationId,
  organizationName,
  open,
  onOpenChange,
}: OrganizationDetailDialogProps) {
  const { toast } = useToast()
  const { currentUser } = useCalendarState("currentUser")
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
            <OrganizationMembersSection
              orgDetails={orgDetails}
              isOwner={isOwner}
              setUserSelectorOpen={setUserSelectorOpen}
              currentUser={currentUser}
              setDeleteDialog={setDeleteDialog}
            />

            {/* 团队列表 */}
            <OrganizationTeamsSection
              orgDetails={orgDetails}
              isOwner={isOwner}
              setTeamDialogOpen={setTeamDialogOpen}
              setDeleteDialog={setDeleteDialog}
            />

            {/* 项目列表 */}
            <OrganizationProjectsSection
              orgDetails={orgDetails}
              isOwner={isOwner}
              setProjectDialogOpen={setProjectDialogOpen}
              setDeleteDialog={setDeleteDialog}
            />
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
