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
// Token 管理已由请求层统一处理
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Notification } from "@/lib/api/notification"

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onActionComplete: () => void
  onDeleteStart?: () => void
  onDeleteEnd?: () => void
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onActionComplete,
  onDeleteStart,
  onDeleteEnd,
}: NotificationItemProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
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
      case "ORG_INVITE_RECEIVED":
        return <UserPlus className="h-5 w-5 text-purple-500" />
      case "ORG_INVITE_ACCEPTED":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "ORG_INVITE_REJECTED":
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

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation() // 防止触发点击事件
    if (isProcessing || isDeleting) return

    setIsDeleting(true)
    onDeleteStart?.() // 通知父组件开始删除
    
    // 等待动画完成
    setTimeout(async () => {
      setIsProcessing(true)
      try {
        const { notificationAPI } = await import("@/lib/api/notification")
        await notificationAPI.delete(notification.id)

        toast({
          title: "已删除",
          description: "消息已删除",
          duration: 2000,
        })
        // 刷新列表
        onActionComplete()
      } catch (error) {
        console.error("删除消息失败:", error)
        toast({
          title: "操作失败",
          description: "无法删除消息",
          variant: "destructive",
        })
        setIsDeleting(false) // 恢复状态
      } finally {
        setIsProcessing(false)
        onDeleteEnd?.() // 通知父组件删除结束
      }
    }, 300) // 300ms 动画时间
  }

  const handleApprove = async () => {
    if (!notification.metadata?.requestId) return

    setIsProcessing(true)
    try {
      const { organizationAPI } = await import("@/lib/api/organization")
      await organizationAPI.approveJoinRequest(notification.metadata.requestId)

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
    } catch (error) {
      console.error("处理申请失败:", error)
      toast({
        title: "操作失败",
        description: error instanceof Error ? error.message : "网络错误，请稍后重试",
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
      const { organizationAPI } = await import("@/lib/api/organization")
      await organizationAPI.rejectJoinRequest(
        notification.metadata.requestId,
        "管理员拒绝了您的申请"
      )

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
    } catch (error) {
      console.error("处理申请失败:", error)
      toast({
        title: "操作失败",
        description: error instanceof Error ? error.message : "网络错误，请稍后重试",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // 接受组织邀请
  const handleAcceptInvite = async () => {
    if (!notification.metadata?.inviteId) return

    setIsProcessing(true)
    try {
      const { post } = await import("@/lib/request")
      await post(`/organizations/invites/${notification.metadata.inviteId}/accept`, {})

      toast({
        title: "已加入组织",
        description: `已加入组织【${notification.metadata.organizationName}】`,
        duration: 3000,
      })
      // 标记消息为已读
      onMarkAsRead(notification.id)
      // 标记为已处理
      setIsHandled(true)
      // 刷新列表
      onActionComplete()
    } catch (error) {
      console.error("接受邀请失败:", error)
      toast({
        title: "操作失败",
        description: error instanceof Error ? error.message : "网络错误，请稍后重试",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // 拒绝组织邀请
  const handleRejectInvite = async () => {
    if (!notification.metadata?.inviteId) return

    setIsProcessing(true)
    try {
      const { post } = await import("@/lib/request")
      await post(`/organizations/invites/${notification.metadata.inviteId}/reject`, {})

      toast({
        title: "已拒绝邀请",
        description: "已拒绝加入组织",
        duration: 3000,
      })
      // 标记消息为已读
      onMarkAsRead(notification.id)
      // 标记为已处理
      setIsHandled(true)
      // 刷新列表
      onActionComplete()
    } catch (error) {
      console.error("拒绝邀请失败:", error)
      toast({
        title: "操作失败",
        description: error instanceof Error ? error.message : "网络错误，请稍后重试",
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

    if (notification.type === "ORG_INVITE_RECEIVED") {
      return (
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            onClick={handleAcceptInvite}
            disabled={isProcessing || isHandled}
            className="h-7 px-3 text-xs"
          >
            {isHandled ? "已接受" : "接受邀请"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRejectInvite}
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
        "p-4 hover:bg-muted/50 transition-all duration-300 ease-in-out relative group",
        !notification.isRead && "bg-blue-50/50 dark:bg-blue-950/20",
        isDeleting && "translate-x-full opacity-0"
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

          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
            
            {/* 删除按钮 - 鼠标悬停时显示 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2 right-2"
              onClick={handleDelete}
              title="删除消息"
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
            </Button>
          </div>

          {notification.type === "ORG_JOIN_REQUEST" && renderActions()}
          {notification.type === "ORG_INVITE_RECEIVED" && renderActions()}
          
          {/* 标记已读按钮放在时间下方 */}
          {notification.type !== "ORG_JOIN_REQUEST" && 
           notification.type !== "ORG_INVITE_RECEIVED" && 
           !notification.isRead && (
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
