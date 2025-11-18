"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Briefcase, FolderKanban } from "lucide-react"
import { organizationAPI } from "@/lib/api/organization"
import { useToast } from "@/hooks/use-toast"

interface OrganizationDetailDialogProps {
  organizationId: string | null
  organizationName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface OrgDetails {
  members: Array<{ id: string; name: string; email: string; avatar?: string | null; role: string }>
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
  const [orgDetails, setOrgDetails] = useState<OrgDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && organizationId) {
      fetchOrganizationDetails(organizationId)
    }
  }, [open, organizationId])

  const fetchOrganizationDetails = async (orgId: string) => {
    setIsLoading(true)
    try {
      // 使用新的 API 封装，自动处理 token 和错误
      const [members, teams, projects] = await Promise.all([
        organizationAPI.getMembers(orgId),
        organizationAPI.getTeams(orgId),
        organizationAPI.getProjects(orgId),
      ])

      setOrgDetails({
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
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Users className="h-5 w-5" />
                成员 ({orgDetails.members.length})
              </h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {orgDetails.members.map((member) => (
                  <div
                    key={member.id}
                    className="text-sm p-3 rounded-lg border hover:bg-accent/50 transition-colors relative"
                  >
                    <Badge variant="outline" className="text-[10px] absolute top-2 right-2">
                      {member.role === 'OWNER' ? '所有者' : member.role === 'ADMIN' ? '管理员' : '成员'}
                    </Badge>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={member.avatar || undefined} alt={member.name} />
                        <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-base max-w-[120px]">{member.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{member.email}</div>
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
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                团队 ({orgDetails.teams.length})
              </h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {orgDetails.teams.map((team) => (
                  <div
                    key={team.id}
                    className="text-sm p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
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
              <h3 className="font-semibold text-base flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                项目 ({orgDetails.projects.filter(p => !p.name.includes('的个人事务')).length})
              </h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {/* 正常项目 */}
                {orgDetails.projects.filter(p => !p.name.includes('的个人事务')).map((project) => (
                  <div
                    key={project.id}
                    className="text-sm p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
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
                
                {/* 个人事务项目 - 灰色显示 */}
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
    </Dialog>
  )
}
