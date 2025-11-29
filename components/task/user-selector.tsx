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
import { Check, ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { User } from "@/lib/types"

interface UserSelectorProps {
  selectedUserId: string
  onUserChange: (userId: string) => void
  filterUserIds?: string[] // 可选：只显示特定的用户列表
  disabled?: boolean // 是否禁用
}

export function UserSelector({ selectedUserId, onUserChange, filterUserIds, disabled = false }: UserSelectorProps) {
  const { users, getUserById } = useCalendarStore()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const selectedUser = getUserById(selectedUserId)
  
  // 过滤用户列表
  const availableUsers = filterUserIds
    ? users.filter(user => filterUserIds.includes(user.id))
    : users

  // 根据搜索词过滤用户
  const filteredUsers = availableUsers.filter(user => {
    const query = searchQuery.toLowerCase()
    return (
      user.name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query)
    )
  })

  const getUserInitial = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (disabled) return
    setOpen(isOpen)
    if (!isOpen) {
      setSearchQuery("") // 关闭时重置搜索
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-start gap-2 px-3"
        >
          {selectedUser ? (
            <>
              <Avatar className="h-6 w-6">
                <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getUserInitial(selectedUser.name)}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-left">{selectedUser.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">选择用户...</span>
          )}
          <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索姓名或用户名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
          {filteredUsers.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              未找到匹配用户
            </div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  onUserChange(user.id)
                  setOpen(false)
                  setSearchQuery("")
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors",
                  selectedUserId === user.id && "bg-accent"
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getUserInitial(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left overflow-hidden">
                  <div className="font-medium truncate">{user.name}</div>
                  <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
                </div>
                {selectedUserId === user.id && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
