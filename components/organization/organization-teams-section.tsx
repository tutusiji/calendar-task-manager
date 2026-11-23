"use client"

import { Button } from "@/components/ui/button"
import { Briefcase,Trash2,Plus } from "lucide-react"
import type * as React from "react"
import type { OrgDetails } from "./organization-types"

export function OrganizationTeamsSection({
  orgDetails,
  isOwner,
  setTeamDialogOpen,
  setDeleteDialog,
}: {
  orgDetails: OrgDetails
  isOwner: boolean
  setTeamDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  setDeleteDialog: React.Dispatch<React.SetStateAction<{ open: boolean; type: "member" | "team" | "project"; id: string; name: string; } | null>>
}) {
  return (
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
  )
}
