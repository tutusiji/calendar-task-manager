"use client"

import { useState } from "react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronDown, X, Search, Users, UsersRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface UserMultiSelectorProps {
  selectedUserIds: string[]
  onUserChange: (userIds: string[]) => void
  lockedUserIds?: string[] // 不可移除的用户ID列表
  creatorId?: string // 创建者ID，用于显示标签
  disabled?: boolean // 是否禁用选择器
}

export function UserMultiSelector({ selectedUserIds, onUserChange, lockedUserIds = [], creatorId, disabled = false }: UserMultiSelectorProps) {
  const { users, teams, getUserById, currentUser } = useCalendarStore()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // 过滤当前组织的用户
  const organizationUsers = currentUser?.currentOrganizationId
    ? users.filter(u => u.currentOrganizationId === currentUser.currentOrganizationId || !u.currentOrganizationId)
    : users

  // 过滤当前组织的团队
  const organizationTeams = currentUser?.currentOrganizationId
    ? teams.filter(t => t.organizationId === currentUser.currentOrganizationId)
    : teams

  // 根据搜索词过滤用户
  const filteredUsers = organizationUsers.filter(user => {
    const query = searchQuery.toLowerCase()
    return (
      user.name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query)
    )
  })

  // 根据搜索词过滤团队
  const filteredTeams = organizationTeams.filter(team => {
    const query = searchQuery.toLowerCase()
    return team.name.toLowerCase().includes(query)
  })

  const getUserInitial = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      // 如果用户在锁定列表中，不允许取消选择
      if (lockedUserIds.includes(userId)) {
        return
      }
      onUserChange(selectedUserIds.filter(id => id !== userId))
    } else {
      onUserChange([...selectedUserIds, userId])
    }
  }

  const toggleTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    if (!team) return

    const memberIds = team.memberIds
    // 检查是否所有成员都已选中
    const allSelected = memberIds.every(id => selectedUserIds.includes(id))

    if (allSelected) {
      // 如果全选了，则取消选择该团队的所有成员（除了锁定的）
      const newSelectedIds = selectedUserIds.filter(id => 
        !memberIds.includes(id) || lockedUserIds.includes(id)
      )
      onUserChange(newSelectedIds)
    } else {
      // 否则，添加所有未选中的成员
      const newIds = memberIds.filter(id => !selectedUserIds.includes(id))
      onUserChange([...selectedUserIds, ...newIds])
    }
  }

  const removeUser = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    // 如果用户在锁定列表中，不允许移除
    if (lockedUserIds.includes(userId)) {
      return
    }
    onUserChange(selectedUserIds.filter(id => id !== userId))
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (disabled) return
    setOpen(isOpen)
    if (!isOpen) {
      setSearchQuery("") // 关闭时重置搜索
    }
  }

  return (
    <Popover modal={false} open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-start min-h-10 h-auto px-3 py-2"
        >
          <div className="flex flex-wrap gap-1 flex-1 max-h-[84px] overflow-y-auto custom-scrollbar">
            {selectedUserIds.length === 0 ? (
              <span className="text-muted-foreground py-1">选择团队成员...</span>
            ) : (
              selectedUserIds.map(userId => {
                const user = getUserById(userId)
                if (!user) return null
                const isLocked = lockedUserIds.includes(userId)
                return (
                  <Badge key={userId} variant="secondary" className="gap-1 pr-1">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-[8px]">
                        {getUserInitial(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{user.name}</span>
                    {!isLocked && !disabled && (
                      <span
                        onClick={(e) => removeUser(userId, e)}
                        className="ml-1 rounded-full hover:bg-muted cursor-pointer inline-flex items-center justify-center"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            removeUser(userId, e as any)
                          }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </span>
                    )}
                  </Badge>
                )
              })
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[550px] p-0" align="start" onWheel={(e) => e.stopPropagation()}>
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索团队、姓名或用户名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 h-9"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex h-[300px]">
          {/* 团队列表 */}
          <div className="w-1/2 border-r flex flex-col overflow-hidden">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 flex items-center gap-2 shrink-0">
              <Users className="h-3 w-3" />
              团队
            </div>
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="p-2 space-y-1">
                {filteredTeams.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    未找到匹配团队
                  </div>
                ) : (
                  filteredTeams.map((team) => {
                    const memberIds = team.memberIds || []
                    const selectedCount = memberIds.filter(id => selectedUserIds.includes(id)).length
                    const isAllSelected = memberIds.length > 0 && selectedCount === memberIds.length
                    const isPartialSelected = selectedCount > 0 && selectedCount < memberIds.length

                    return (
                      <button
                        key={team.id}
                        onClick={() => toggleTeam(team.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors",
                          (isAllSelected || isPartialSelected) && "bg-accent/50"
                        )}
                      >
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary shrink-0">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="flex-1 text-left overflow-hidden">
                          <div className="font-medium truncate">{team.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {memberIds.length} 位成员
                          </div>
                        </div>
                        {isAllSelected && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                        {isPartialSelected && (
                          <div className="h-2 w-2 rounded-full bg-primary/50 shrink-0" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* 用户列表 */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 flex items-center gap-2 shrink-0">
              <UsersRound className="h-3 w-3" />
              成员
            </div>
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="p-2 space-y-1">
                {filteredUsers.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    未找到匹配用户
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id)
                    const isLocked = lockedUserIds.includes(user.id)
                    return (
                      <button
                        key={user.id}
                        onClick={() => toggleUser(user.id)}
                        disabled={isLocked}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors",
                          isSelected && "bg-accent",
                          isLocked && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {getUserInitial(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left overflow-hidden">
                          <div className="font-medium truncate">
                            {user.name}
                            {creatorId === user.id && <span className="ml-1 text-xs text-muted-foreground">(创建者)</span>}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            @{user.username}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
