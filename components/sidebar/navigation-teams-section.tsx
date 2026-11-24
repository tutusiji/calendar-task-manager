"use client"

import type { DragEvent } from "react"
import { Eye, LogOut, Pencil, Pin, Trash2, UsersRound } from "lucide-react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import type { Team, User } from "@/lib/types"
import { SidebarItem, SidebarItemMenuTrigger, SidebarSection } from "./sidebar-navigation"

export function NavigationTeamsSection({
  compact,
  onExpandSidebar,
  handleCreateTeam,
  myTeams,
  handleTeamDragOver,
  persistTeamOrder,
  draggedTeamId,
  setDraggedTeamId,
  onSelect,
  selectedTeamId,
  currentUser,
  canManageTeam,
  handleEditTeam,
  handleDeleteTeam,
  handleViewTeam,
  handleLeaveTeam,
  handleSetDefaultTeam,
}: {
  compact: boolean
  onExpandSidebar: () => void
  handleCreateTeam: () => void
  myTeams: Team[]
  handleTeamDragOver: (event: DragEvent<HTMLDivElement>, targetId: string) => void
  persistTeamOrder: () => void
  draggedTeamId: string | null
  setDraggedTeamId: (id: string) => void
  onSelect: (id: string) => void
  selectedTeamId: string | null
  currentUser: User | null
  canManageTeam: (team: Team) => boolean
  handleEditTeam: (team: Team) => void
  handleDeleteTeam: (team: Team) => void
  handleViewTeam: (team: Team) => void
  handleLeaveTeam: (team: Team) => void
  handleSetDefaultTeam: (teamId: string) => Promise<void>
}) {
  return (
    <SidebarSection
      label="我的团队"
      icon={UsersRound}
      count={myTeams.length}
      active={myTeams.some((team) => team.id === selectedTeamId)}
      compact={compact}
      onExpandSidebar={onExpandSidebar}
      add={{ label: "新建团队", onClick: handleCreateTeam }}
    >
      {myTeams.map((team) => {
        const isDefault = currentUser?.defaultTeamId === team.id

        return (
          <SidebarItem
            key={team.id}
            name={team.name}
            icon={UsersRound}
            color={team.color}
            active={selectedTeamId === team.id}
            owner={team.creatorId === currentUser?.id}
            badge={isDefault ? { label: "默认", description: "默认团队" } : undefined}
            onSelect={() => onSelect(team.id)}
            drag={{
              active: draggedTeamId === team.id,
              label: `拖拽调整团队 ${team.name} 的顺序`,
              onStart: (event) => {
                setDraggedTeamId(team.id)
                event.dataTransfer.effectAllowed = "move"
                event.dataTransfer.setData("text/plain", team.id)
              },
              onEnd: persistTeamOrder,
              onOver: (event) => handleTeamDragOver(event, team.id),
            }}
            actions={(
              <DropdownMenu>
                <SidebarItemMenuTrigger label={`${team.name} 团队操作`} />
                <DropdownMenuContent align="end">
                  {canManageTeam(team) ? (
                    <>
                      <DropdownMenuItem onSelect={() => handleEditTeam(team)}>
                        <Pencil /> 编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => handleDeleteTeam(team)}>
                        <Trash2 /> 删除
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onSelect={() => handleViewTeam(team)}>
                        <Eye /> 查看
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-orange-600 focus:text-orange-600" onSelect={() => handleLeaveTeam(team)}>
                        <LogOut /> 退出
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={isDefault} onSelect={() => void handleSetDefaultTeam(team.id)}>
                    <Pin /> {isDefault ? "已设为默认团队" : "设为默认团队"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        )
      })}
    </SidebarSection>
  )
}
