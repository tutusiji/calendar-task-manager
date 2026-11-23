"use client"

import { Badge } from "@/components/ui/badge"
import { Avatar,AvatarFallback,AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Users,Trash2,Plus } from "lucide-react"
import type * as React from "react"
import type { User } from "@/lib/types"
import type { OrgDetails } from "./organization-types"

export function OrganizationMembersSection({
  orgDetails,
  isOwner,
  setUserSelectorOpen,
  currentUser,
  setDeleteDialog,
}: {
  orgDetails: OrgDetails
  isOwner: boolean
  setUserSelectorOpen: React.Dispatch<React.SetStateAction<boolean>>
  currentUser: User | null
  setDeleteDialog: React.Dispatch<React.SetStateAction<{ open: boolean; type: "member" | "team" | "project"; id: string; name: string; } | null>>
}) {
  return (
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
  )
}
