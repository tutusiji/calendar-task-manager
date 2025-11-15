"use client"

import { useState, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { getToken } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { NotificationItem } from "./notification-item"
import { Loader2 } from "lucide-react"

interface Notification {
  id: string
  type: string
  title: string
  content: string
  metadata?: any
  isRead: boolean
  createdAt: string
}

interface NotificationListProps {
  onCountChange?: (count: number) => void
}

export function NotificationList({ onCountChange }: NotificationListProps) {
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchNotifications = async () => {
    try {
      const token = getToken()
      if (!token) return

      const response = await fetch("/api/notifications", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setNotifications(data.data)
        
        // 更新未读数量
        const unreadCount = data.data.filter((n: Notification) => !n.isRead).length
        onCountChange?.(unreadCount)
      }
    } catch (error) {
      console.error("获取消息列表失败:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const handleMarkAsRead = async (id: string) => {
    try {
      const token = getToken()
      if (!token) return

      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        // 更新本地状态
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          )
        )

        // 更新未读数量
        const unreadCount = notifications.filter((n) => !n.isRead && n.id !== id).length
        onCountChange?.(unreadCount)
      }
    } catch (error) {
      console.error("标记已读失败:", error)
      toast({
        title: "操作失败",
        description: "无法标记消息为已读",
        variant: "destructive",
      })
    }
  }

  const handleActionComplete = () => {
    // 操作完成后刷新列表
    fetchNotifications()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-4">
        <p className="text-muted-foreground">暂无消息</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold">消息通知</h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onActionComplete={handleActionComplete}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
