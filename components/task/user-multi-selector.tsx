"use client"

import { useState } from "react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface UserMultiSelectorProps {
  selectedUserIds: string[]
  onUserChange: (userIds: string[]) => void
  lockedUserIds?: string[] // 不可移除的用户ID列表
  creatorId?: string // 创建者ID，用于显示标签
  disabled?: boolean // 是否禁用选择器
}

export function UserMultiSelector({ selectedUserIds, onUserChange, lockedUserIds = [], creatorId, disabled = false }: UserMultiSelectorProps) {
  const { users, getUserById, currentUser } = useCalendarStore()
  const [open, setOpen] = useState(false)

  // 过滤当前组织的用户
  const organizationUsers = currentUser?.currentOrganizationId
    ? users.filter(u => u.currentOrganizationId === currentUser.currentOrganizationId || !u.currentOrganizationId)
    : users

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

  const removeUser = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    // 如果用户在锁定列表中，不允许移除
    if (lockedUserIds.includes(userId)) {
      return
    }
    onUserChange(selectedUserIds.filter(id => id !== userId))
  }

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-start min-h-10 h-auto px-3 py-2"
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedUserIds.length === 0 ? (
              <span className="text-muted-foreground">选择团队成员...</span>
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
      <PopoverContent className="w-[300px] p-2" align="start">
        <div className="space-y-1">
          {organizationUsers.map((user) => {
            const isSelected = selectedUserIds.includes(user.id)
            const isLocked = lockedUserIds.includes(user.id)
            return (
              <button
                key={user.id}
                onClick={() => toggleUser(user.id)}
                disabled={isLocked}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent",
                  isSelected && "bg-accent",
                  isLocked && "opacity-60 cursor-not-allowed"
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getUserInitial(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <div className="font-medium">
                    {user.name}
                    {creatorId === user.id && <span className="ml-1 text-xs text-muted-foreground">(创建者)</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
