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

interface UserSingleSelectorProps {
  selectedUserId: string
  onUserChange: (userId: string) => void
  disabled?: boolean
  placeholder?: string
}

export function UserSingleSelector({ 
  selectedUserId, 
  onUserChange, 
  disabled = false,
  placeholder = "选择用户..."
}: UserSingleSelectorProps) {
  const { users, getUserById, currentUser } = useCalendarStore()
  const [open, setOpen] = useState(false)

  // 过滤当前组织的用户
  const organizationUsers = currentUser?.currentOrganizationId
    ? users.filter(u => u.currentOrganizationId === currentUser.currentOrganizationId || !u.currentOrganizationId)
    : users

  const getUserInitial = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  const selectedUser = getUserById(selectedUserId)

  const selectUser = (userId: string) => {
    onUserChange(userId)
    setOpen(false)
  }

  if (disabled && selectedUser) {
    return (
      <div className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-muted px-3 py-2 text-sm">
        <Avatar className="h-6 w-6">
          <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {getUserInitial(selectedUser.name)}
          </AvatarFallback>
        </Avatar>
        <span className="text-muted-foreground">{selectedUser.name}</span>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-start h-10 px-3"
        >
          {selectedUser ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getUserInitial(selectedUser.name)}
                </AvatarFallback>
              </Avatar>
              <span>{selectedUser.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-2" align="start">
        <div className="space-y-1">
          {organizationUsers.map((user) => {
            const isSelected = selectedUserId === user.id
            return (
              <button
                key={user.id}
                onClick={() => selectUser(user.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent",
                  isSelected && "bg-accent"
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
