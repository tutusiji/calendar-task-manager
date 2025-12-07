"use client"

import { useState, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
// Token 管理已由请求层统一处理
import { useToast } from "@/hooks/use-toast"
import { NotificationItem } from "./notification-item"
import { Loader2, Eraser } from "lucide-react"
import { Notification } from "@/lib/api/notification"

interface NotificationListProps {
  onCountChange?: (count: number) => void
}

export function NotificationList({ onCountChange }: NotificationListProps) {
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchNotifications = async () => {
    try {
      const { notificationAPI } = await import("@/lib/api/notification")
      const data = await notificationAPI.getAll()
      setNotifications(data)
      
      // 更新未读数量
      const unreadCount = data.filter((n: Notification) => !n.isRead).length
      onCountChange?.(unreadCount)
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
      const { notificationAPI } = await import("@/lib/api/notification")
      await notificationAPI.markAsRead(id)

      // 更新本地状态
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        )
      )

      // 更新未读数量
      const unreadCount = notifications.filter((n) => !n.isRead && n.id !== id).length
      onCountChange?.(unreadCount)
    } catch (error) {
      console.error("标记已读失败:", error)
      toast({
        title: "操作失败",
        description: "无法标记消息为已读",
        variant: "destructive",
      })
    }
  }

  const handleClearAll = async () => {
    if (isClearing) return
    if (!confirm("确定要清空所有消息吗？")) return

    setIsClearing(true)
    try {
      const { notificationAPI } = await import("@/lib/api/notification")
      await notificationAPI.clearAll()

      setNotifications([])
      onCountChange?.(0)
      
      toast({
        title: "已清空",
        description: "所有消息已清空",
      })
    } catch (error) {
      console.error("清空消息失败:", error)
      toast({
        title: "操作失败",
        description: "无法清空消息",
        variant: "destructive",
      })
    } finally {
      setIsClearing(false)
    }
  }

  const handleActionComplete = () => {
    // 操作完成后刷新列表
    fetchNotifications()
  }

  const handleDeleteStart = () => {
    setIsDeleting(true)
  }

  const handleDeleteEnd = () => {
    setIsDeleting(false)
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
      <div className="flex flex-col w-full">
        <div className="px-4 py-3 border-b flex items-center justify-between bg-background z-10">
          <h3 className="font-semibold">消息通知</h3>
        </div>
        <div className="flex flex-col items-center justify-center h-64 text-center p-4">
          <p className="text-muted-foreground">暂无消息</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full relative">
      <div className="px-4 py-3 border-b flex items-center justify-between bg-background z-10 shrink-0">
        <h3 className="font-semibold">消息通知</h3>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleClearAll} 
          disabled={isClearing || isDeleting}
          title="一键清空"
          className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50"
        >
          <Eraser className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="h-[450px] relative">
        <div className="divide-y">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onActionComplete={handleActionComplete}
              onDeleteStart={handleDeleteStart}
              onDeleteEnd={handleDeleteEnd}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Loading 覆盖层 */}
      {(isClearing || isDeleting) && (
        //  backdrop-blur-sm 
        <div className="absolute inset-0 bg-background/40 flex items-center justify-center z-50 transition-opacity duration-200">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {isClearing ? "正在清空..." : "正在删除..."}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
