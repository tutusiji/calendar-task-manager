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
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { User } from "@/lib/types"

interface UserSelectorProps {
  selectedUserId: string
  onUserChange: (userId: string) => void
  filterUserIds?: string[] // 可选：只显示特定的用户列表
}

export function UserSelector({ selectedUserId, onUserChange, filterUserIds }: UserSelectorProps) {
  const { users, getUserById } = useCalendarStore()
  const [open, setOpen] = useState(false)

  const selectedUser = getUserById(selectedUserId)
  
  // 过滤用户列表
  const availableUsers = filterUserIds
    ? users.filter(user => filterUserIds.includes(user.id))
    : users

  const getUserInitial = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-start gap-2 px-3"
        >
          {selectedUser && (
            <>
              <Avatar className="h-6 w-6">
                <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getUserInitial(selectedUser.name)}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-left">{selectedUser.name}</span>
            </>
          )}
          <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-2" align="start">
        <div className="space-y-1">
          {availableUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => {
                onUserChange(user.id)
                setOpen(false)
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent",
                selectedUserId === user.id && "bg-accent"
              )}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getUserInitial(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <div className="font-medium">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </div>
              {selectedUserId === user.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
