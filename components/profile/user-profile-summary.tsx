"use client"

import { Button } from "@/components/ui/button"
import { Mail,Briefcase,Edit,User as UserIcon,Key,Building2 } from "lucide-react"
import { AvatarUpload } from "@/components/avatar-upload"
import { RankBadge } from "@/components/rank-badge"
import type { User } from "@/lib/types"
import { type TeamWithMembers } from "@/lib/api-client"
import type * as React from "react"

export function UserProfileSummary({
  currentUser,
  handleAvatarUpload,
  setEditProfileOpen,
  setChangePasswordOpen,
  allTeams,
}: {
  currentUser: User
  handleAvatarUpload: (file: File) => Promise<void>
  setEditProfileOpen: React.Dispatch<React.SetStateAction<boolean>>
  setChangePasswordOpen: React.Dispatch<React.SetStateAction<boolean>>
  allTeams: TeamWithMembers[]
}) {
  return (
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
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-semibold">
                {currentUser.name}
                <span className="text-lg text-muted-foreground ml-2">({currentUser.username})</span>
              </h3>
              {/* 积分徽章系统 - 可点击展开详情 */}
              <RankBadge points={currentUser.points || 0} variant="minimal" clickable={true} />
            </div>
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

          {/* Default Team Display - Moved here for consistent UI */}
          {currentUser.defaultTeamId && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>
                {(() => {
                  const defaultTeam = allTeams.find(t => t.id === currentUser.defaultTeamId)
                  const orgName = defaultTeam?.organization?.name || '组织'
                  return defaultTeam ? `${orgName} - ${defaultTeam.name}` : '未知团队'
                })()}
              </span>
            </div>
          )}

          {/* Profession - Moved here for consistent UI */}
          {currentUser.role && currentUser.role !== '未设置' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span>{currentUser.role}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
