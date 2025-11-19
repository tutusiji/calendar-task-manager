"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { get, post } from "@/lib/request"

interface User {
  id: string
  username: string
  name: string
  email: string
  avatar?: string
}

interface UserSelectorDialogProps {
  organizationId: string
  organizationName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function UserSelectorDialog({
  organizationId,
  organizationName,
  open,
  onOpenChange,
  onSuccess,
}: UserSelectorDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const { toast } = useToast()

  // 搜索用户
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setUsers([])
        return
      }

      setIsSearching(true)
      try {
        const results = await get<User[]>(`/users/search`, {
          q: searchQuery,
          organizationId,
        })
        setUsers(results)
      } catch (error: any) {
        console.error("搜索用户失败:", error)
        toast({
          title: "搜索失败",
          description: error.message || "无法搜索用户",
          variant: "destructive",
        })
      } finally {
        setIsSearching(false)
      }
    }

    const timer = setTimeout(searchUsers, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, organizationId, toast])

  // 发送邀请
  const handleInvite = async () => {
    if (!selectedUser) return

    setIsInviting(true)
    try {
      await post(`/organizations/${organizationId}/invite`, {
        userId: selectedUser.id,
      })

      toast({
        title: "邀请已发送",
        description: `已向 ${selectedUser.name} 发送邀请`,
      })

      onSuccess?.()
      onOpenChange(false)
      
      // 重置状态
      setSearchQuery("")
      setUsers([])
      setSelectedUser(null)
    } catch (error: any) {
      toast({
        title: "邀请失败",
        description: error.message || "无法发送邀请",
        variant: "destructive",
      })
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>邀请成员加入组织</DialogTitle>
          <DialogDescription>
            搜索并邀请用户加入【{organizationName}】
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索用户名、姓名或邮箱..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* 搜索结果 */}
          {searchQuery.length >= 2 && (
            <div className="border rounded-md max-h-[300px] overflow-y-auto">
              {users.length === 0 && !isSearching && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  未找到匹配的用户
                </div>
              )}

              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-3 cursor-pointer hover:bg-accent transition-colors ${
                    selectedUser?.id === user.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>
                        {user.name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        @{user.username} · {user.email}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 已选择的用户 */}
          {selectedUser && (
            <div className="p-3 border rounded-md bg-muted/50">
              <div className="text-sm text-muted-foreground mb-2">
                已选择:
              </div>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser.avatar} />
                  <AvatarFallback>
                    {selectedUser.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{selectedUser.name}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    @{selectedUser.username} · {selectedUser.email}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              setSearchQuery("")
              setUsers([])
              setSelectedUser(null)
            }}
          >
            取消
          </Button>
          <Button
            onClick={handleInvite}
            disabled={!selectedUser || isInviting}
          >
            {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            发送邀请
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
