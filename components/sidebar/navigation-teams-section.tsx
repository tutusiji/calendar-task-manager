"use client"

import { useState,type DragEvent } from "react"
import { Plus,ChevronDown,ChevronRight,MoreVertical,Pencil,Trash2,Crown,Eye,LogOut,Pin,GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger,DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import type { Team } from "@/lib/types"
import type * as React from "react"
import type { NavigationMode,User } from "@/lib/types"

export function NavigationTeamsSection({
  handleCreateTeam,
  myTeams,
  handleTeamDragOver,
  persistTeamOrder,
  draggedTeamId,
  setDraggedTeamId,
  setNavigationMode,
  setSelectedTeamId,
  navigationMode,
  selectedTeamId,
  currentUser,
  canManageTeam,
  handleEditTeam,
  handleDeleteTeam,
  handleViewTeam,
  handleLeaveTeam,
  handleSetDefaultTeam,
}: {
  handleCreateTeam: () => void
  myTeams: Team[]
  handleTeamDragOver: (event: DragEvent<HTMLDivElement>, targetId: string) => void
  persistTeamOrder: () => void
  draggedTeamId: string | null
  setDraggedTeamId: React.Dispatch<React.SetStateAction<string | null>>
  setNavigationMode: (mode: NavigationMode) => void
  setSelectedTeamId: (id: string | null) => Promise<void>
  navigationMode: NavigationMode
  selectedTeamId: string | null
  currentUser: User | null
  canManageTeam: (team: Team) => boolean
  handleEditTeam: (team: Team) => void
  handleDeleteTeam: (team: Team) => void
  handleViewTeam: (team: Team) => void
  handleLeaveTeam: (team: Team) => void
  handleSetDefaultTeam: (teamId: string) => Promise<void>
}) {
  const [teamsExpanded, setTeamsExpanded] = useState(true)

  return (
    <div>
      <div className="flex items-center gap-2 py-2 px-1 mx-1">
        <button
          onClick={() => setTeamsExpanded(!teamsExpanded)}
          className="flex items-center gap-2 flex-1 text-sm font-medium hover:bg-muted/50 rounded-md p-1"
        >
          {teamsExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="7" r="4" fill="#3B82F6" />
            <path d="M5 20c0-4 3-7 7-7s7 3 7 7" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
            <circle cx="18" cy="6" r="3" fill="#60A5FA" />
            <circle cx="6" cy="6" r="3" fill="#60A5FA" />
          </svg>
          <span style={{ fontFamily: 'Micro, sans-serif', fontWeight: 900, fontSize: '16px', letterSpacing: '0.5px' }}>My Teams</span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCreateTeam}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {teamsExpanded && (
        <div className="ml-6 mt-1 space-y-1">
          {myTeams.map((team) => (
            <div
              key={team.id}
              onDragOver={(event) => handleTeamDragOver(event, team.id)}
              onDrop={persistTeamOrder}
              className={cn(
                "group flex items-center gap-1 pr-2 transition-opacity",
                draggedTeamId === team.id && "opacity-60"
              )}
            >
              <button
                type="button"
                draggable
                onDragStart={(event) => {
                  setDraggedTeamId(team.id)
                  event.dataTransfer.effectAllowed = "move"
                  event.dataTransfer.setData("text/plain", team.id)
                }}
                onDragEnd={persistTeamOrder}
                className="flex h-8 w-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
                aria-label={`拖拽调整团队 ${team.name} 的顺序`}
                title="拖拽调整顺序"
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <button
                onClick={async () => {
                  setNavigationMode("team")
                  await setSelectedTeamId(team.id)
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/50 rounded-md flex-1 text-left",
                  navigationMode === "team" && selectedTeamId === team.id && "bg-muted"
                )}
              >
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: team.color }}
                />
                <span className="truncate max-w-[150px]" title={team.name}>{team.name}</span>
                {/* 创建者标识 */}
                <div className="ml-auto flex items-center gap-2">
                  {currentUser?.defaultTeamId === team.id && (
                    <Pin className="h-3 w-3 text-blue-500 rotate-45" />
                  )}
                  {currentUser && team.creatorId === currentUser.id && (
                    <Crown className="h-3 w-3 text-yellow-600 shrink-0" />
                  )}
                </div>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canManageTeam(team) ? (
                    <>
                      <DropdownMenuItem onClick={() => handleEditTeam(team)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>编辑</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteTeam(team)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>删除</span>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => handleViewTeam(team)}>
                        <Eye className="mr-2 h-4 w-4" />
                        <span>查看</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleLeaveTeam(team)}
                        className="text-orange-600 focus:text-orange-600"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>退出</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleSetDefaultTeam(team.id)}>
                    <Pin className="mr-2 h-4 w-4" />
                    <span>设为默认</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
