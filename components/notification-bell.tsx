"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { NotificationList } from "./notification-list"
import { getToken } from "@/lib/api-client"
import { cn } from "@/lib/utils"

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const fetchUnreadCount = async () => {
    try {
      const token = getToken()
      if (!token) return

      const response = await fetch("/api/notifications/unread-count", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setUnreadCount(data.data.count)
      }
    } catch (error) {
      console.error("获取未读消息数量失败:", error)
    }
  }

  useEffect(() => {
    fetchUnreadCount()

    // 每30秒轮询一次
    const interval = setInterval(fetchUnreadCount, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      // 打开时刷新未读数量
      fetchUnreadCount()
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="消息通知"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className={cn(
                "absolute -right-1 -top-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs",
                unreadCount > 99 && "px-1"
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <NotificationList onCountChange={setUnreadCount} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
