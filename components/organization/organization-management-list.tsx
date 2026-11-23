"use client"

import type { ManagedOrganization } from "@/components/organization/organization-types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield,Trash2,Edit,Users,Briefcase,FolderKanban,LogOut,Eye,Copy,Check } from "lucide-react"
import type * as React from "react"

export function OrganizationManagementList({
  organizations,
  currentOrgId,
  setViewingOrgId,
  handleEdit,
  setDeleteOrgId,
  setLeaveOrgId,
  inviteCodes,
  handleCopyInviteCode,
  copiedCode,
}: {
  organizations: ManagedOrganization[]
  currentOrgId: string | null
  setViewingOrgId: React.Dispatch<React.SetStateAction<string | null>>
  handleEdit: (org: ManagedOrganization) => void
  setDeleteOrgId: React.Dispatch<React.SetStateAction<string | null>>
  setLeaveOrgId: React.Dispatch<React.SetStateAction<string | null>>
  inviteCodes: Record<string, string>
  handleCopyInviteCode: (orgId: string, orgName: string) => Promise<void>
  copiedCode: string | null
}) {
  const getRoleBadge = (role?: string) => {
    const roleMap = {
      OWNER: { label: "所有者", variant: "default" as const },
      ADMIN: { label: "管理员", variant: "secondary" as const },
      MEMBER: { label: "成员", variant: "outline" as const },
    }
    const info = roleMap[role as keyof typeof roleMap] || roleMap.MEMBER
    return <Badge variant={info.variant}>{info.label}</Badge>
  }

  return (
    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
      {organizations.map((org) => (
        <div
          key={org.id}
          className="rounded-lg border p-4 space-y-3"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{org.name}</h3>
                {org.isVerified && (
                  <div title="已认证">
                    <Shield className="h-4 w-4 text-blue-500" />
                  </div>
                )}
                {getRoleBadge(org.role)}
                {org.id === currentOrgId && (
                  <Badge variant="default">当前空间</Badge>
                )}
              </div>
              {org.description && (
                <p className="text-sm text-muted-foreground">
                  {org.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingOrgId(org.id)}
                title="查看详情"
              >
                <Eye className="h-4 w-4" />
              </Button>
              {(org.role === "OWNER" || org.role === "ADMIN") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(org)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {org.role === "OWNER" && org.id !== currentOrgId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteOrgId(org.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {org.role !== "OWNER" && org.id !== currentOrgId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLeaveOrgId(org.id)}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  title="退出空间"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{org.memberCount || 0} 成员</span>
            </div>
            <div className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              <span>{org.teamCount || 0} 团队</span>
            </div>
            <div className="flex items-center gap-1">
              <FolderKanban className="h-4 w-4" />
              <span>{org.projectCount || 0} 项目</span>
            </div>
          </div>

          {/* 邀请码区域 */}
          {inviteCodes[org.id] && (
            <div className="flex items-center gap-2 pt-3 border-t">
              <span className="text-sm text-muted-foreground">邀请码:</span>
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {inviteCodes[org.id]}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyInviteCode(org.id, org.name)}
                className="h-7 px-2"
              >
                {copiedCode === org.id ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      ))}

      {organizations.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          暂无组织
        </div>
      )}
    </div>
  )
}
