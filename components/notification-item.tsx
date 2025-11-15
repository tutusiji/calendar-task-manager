"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  Edit, 
  Trash2, 
  Plus,
  Clock
} from "lucide-react"
import { getToken } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"

interface Notification {
  id: string
  type: string
  title: string
  content: string
  metadata?: any
  isRead: boolean
  createdAt: string
}

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onActionComplete: () => void
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onActionComplete,
}: NotificationItemProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  // 根据metadata中的status判断是否已处理
  const [isHandled, setIsHandled] = useState(
    notification.metadata?.status === "APPROVED" || notification.metadata?.status === "REJECTED"
  )

  const getIcon = () => {
    switch (notification.type) {
      case "ORG_JOIN_REQUEST":
        return <UserPlus className="h-5 w-5 text-blue-500" />
      case "ORG_JOIN_APPROVED":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "ORG_JOIN_REJECTED":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "TASK_CREATED":
        return <Plus className="h-5 w-5 text-blue-500" />
      case "TASK_UPDATED":
        return <Edit className="h-5 w-5 text-orange-500" />
      case "TASK_DELETED":
        return <Trash2 className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const handleApprove = async () => {
    if (!notification.metadata?.requestId) return

    setIsProcessing(true)
    try {
      const token = getToken()
      if (!token) throw new Error("未登录")

      const response = await fetch(
        `/api/organizations/join-requests/${notification.metadata.requestId}/approve`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()
      if (data.success) {
        toast({
          title: "已同意",
          description: "已同意加入申请",
          duration: 3000,
        })
        // 标记消息为已读
        onMarkAsRead(notification.id)
        // 标记为已处理
        setIsHandled(true)
        // 刷新列表
        onActionComplete()
      } else {
        toast({
          title: "操作失败",
          description: data.error || "无法处理申请",
          variant: "destructive",
          duration: 3000,
        })
      }
    } catch (error) {
      console.error("处理申请失败:", error)
      toast({
        title: "操作失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!notification.metadata?.requestId) return

    setIsProcessing(true)
    try {
      const token = getToken()
      if (!token) throw new Error("未登录")

      const response = await fetch(
        `/api/organizations/join-requests/${notification.metadata.requestId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            reason: "管理员拒绝了您的申请",
          }),
        }
      )

      const data = await response.json()
      if (data.success) {
        toast({
          title: "已拒绝",
          description: "已拒绝加入申请",
          duration: 3000,
        })
        // 标记消息为已读
        onMarkAsRead(notification.id)
        // 标记为已处理
        setIsHandled(true)
        // 刷新列表
        onActionComplete()
      } else {
        toast({
          title: "操作失败",
          description: data.error || "无法处理申请",
          variant: "destructive",
          duration: 3000,
        })
      }
    } catch (error) {
      console.error("处理申请失败:", error)
      toast({
        title: "操作失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const renderActions = () => {
    if (notification.type === "ORG_JOIN_REQUEST") {
      return (
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={isProcessing || isHandled}
            className="h-7 px-3 text-xs"
          >
            {isHandled ? "已同意" : "同意"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReject}
            disabled={isProcessing || isHandled}
            className="h-7 px-3 text-xs"
          >
            {isHandled ? "已拒绝" : "拒绝"}
          </Button>
        </div>
      )
    }

    return null
  }

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: zhCN,
  })

  return (
    <div
      className={cn(
        "p-4 hover:bg-muted/50 transition-colors",
        !notification.isRead && "bg-blue-50/50 dark:bg-blue-950/20"
      )}
    >
      <div className="flex gap-3">
        <div className="shrink-0 mt-1">{getIcon()}</div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm">{notification.title}</h4>
            <Badge 
              variant={notification.isRead ? "outline" : "secondary"} 
              className="shrink-0 text-xs"
            >
              {notification.isRead ? "已读" : "未读"}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mt-1 wrap-break-word">
            {notification.content}
          </p>

          {notification.metadata?.message && (
            <p className="text-xs text-muted-foreground mt-2 italic border-l-2 pl-2">
              留言：{notification.metadata.message}
            </p>
          )}

          <p className="text-xs text-muted-foreground mt-2">{timeAgo}</p>

          {notification.type === "ORG_JOIN_REQUEST" && renderActions()}
          
          {/* 标记已读按钮放在时间下方 */}
          {notification.type !== "ORG_JOIN_REQUEST" && !notification.isRead && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMarkAsRead(notification.id)}
              className="mt-2 h-7 px-3 text-xs font-semibold shadow-sm"
            >
              标记已读
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
