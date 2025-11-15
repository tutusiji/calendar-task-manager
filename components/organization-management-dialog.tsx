"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Shield, Trash2, Edit, Users, Briefcase, FolderKanban } from "lucide-react"
import { getToken } from "@/lib/api-client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Organization {
  id: string
  name: string
  description?: string
  isVerified: boolean
  role?: string
  memberCount?: number
  teamCount?: number
  projectCount?: number
  creatorId: string
}

interface OrganizationManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrganizationManagementDialog({
  open,
  onOpenChange,
}: OrganizationManagementDialogProps) {
  const { toast } = useToast()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  useEffect(() => {
    if (open) {
      fetchOrganizations()
      
      // 获取当前组织ID
      const userStr = localStorage.getItem("currentUser")
      if (userStr) {
        const user = JSON.parse(userStr)
        setCurrentOrgId(user.currentOrganizationId)
      }
    }
  }, [open])

  const fetchOrganizations = async () => {
    try {
      const token = getToken()
      if (!token) {
        console.error("No token found")
        return
      }

      const response = await fetch("/api/organizations", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })
      const data = await response.json()
      
      if (data.success) {
        setOrganizations(data.data)
      }
    } catch (error) {
      console.error("获取组织列表失败:", error)
      toast({
        title: "获取失败",
        description: "无法加载组织列表",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (org: Organization) => {
    setEditingOrg(org)
    setFormData({
      name: org.name,
      description: org.description || "",
    })
  }

  const handleSaveEdit = async () => {
    if (!editingOrg) return

    setIsLoading(true)
    try {
      const token = getToken()
      if (!token) {
        throw new Error("未登录")
      }

      const response = await fetch(`/api/organizations/${editingOrg.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "更新成功",
          description: "组织信息已更新",
        })
        setEditingOrg(null)
        fetchOrganizations()
      } else {
        toast({
          title: "更新失败",
          description: data.error || "无法更新组织信息",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("更新组织失败:", error)
      toast({
        title: "更新失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteOrgId) return

    setIsLoading(true)
    try {
      const token = getToken()
      if (!token) {
        throw new Error("未登录")
      }

      const response = await fetch(`/api/organizations/${deleteOrgId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "删除成功",
          description: "组织已删除",
        })
        setDeleteOrgId(null)
        fetchOrganizations()
      } else {
        toast({
          title: "删除失败",
          description: data.error || "无法删除组织",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("删除组织失败:", error)
      toast({
        title: "删除失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleBadge = (role?: string) => {
    const roleMap = {
      OWNER: { label: "所有者", variant: "default" as const },
      ADMIN: { label: "管理员", variant: "secondary" as const },
      MEMBER: { label: "成员", variant: "outline" as const },
    }
    const info = roleMap[role as keyof typeof roleMap] || roleMap.MEMBER
    return <Badge variant={info.variant}>{info.label}</Badge>
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>空间管理</DialogTitle>
            <DialogDescription>
              管理您的所有空间/组织，编辑信息或删除空间
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{org.name}</h3>
                      {org.isVerified && (
                        <Shield className="h-4 w-4 text-blue-500" title="已认证" />
                      )}
                      {getRoleBadge(org.role)}
                      {org.id === currentOrgId && (
                        <Badge variant="default">当前空间</Badge>
                      )}
                    </div>
                    {org.description && (
                      <p className="text-sm text-muted-foreground">
                        {org.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {(org.role === "OWNER" || org.role === "ADMIN") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(org)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {org.role === "OWNER" && org.id !== currentOrgId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteOrgId(org.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{org.memberCount || 0} 成员</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    <span>{org.teamCount || 0} 团队</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FolderKanban className="h-4 w-4" />
                    <span>{org.projectCount || 0} 项目</span>
                  </div>
                </div>
              </div>
            ))}

            {organizations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                暂无组织
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={!!editingOrg} onOpenChange={(open) => !open && setEditingOrg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑空间</DialogTitle>
            <DialogDescription>
              修改空间的基本信息
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">空间名称</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入空间名称"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="输入空间描述（可选）"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingOrg(null)}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button onClick={handleSaveEdit} disabled={isLoading}>
                {isLoading ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteOrgId} onOpenChange={(open) => !open && setDeleteOrgId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除该空间及其所有关联的团队、项目和任务数据。此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
