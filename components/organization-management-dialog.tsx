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
import { Shield, Trash2, Edit, Users, Briefcase, FolderKanban, Plus, LogOut } from "lucide-react"
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
  const [leaveOrgId, setLeaveOrgId] = useState<string | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [searchResults, setSearchResults] = useState<Array<{
    id: string
    name: string
    description?: string
    isVerified: boolean
  }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [selectedExistingOrg, setSelectedExistingOrg] = useState<string | null>(null)
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

  const handleCreate = () => {
    setIsCreating(true)
    setFormData({
      name: "",
      description: "",
    })
    setSearchResults([])
    setSelectedExistingOrg(null)
  }

  const searchOrganizations = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setSelectedExistingOrg(null)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/organizations?search=${encodeURIComponent(query)}`)
      const data = await response.json()
      
      if (data.success) {
        setSearchResults(data.data)
        
        // 检查是否有完全匹配的结果
        const exactMatch = data.data.find((org: any) => org.name === query)
        setSelectedExistingOrg(exactMatch ? exactMatch.id : null)
      }
    } catch (error) {
      console.error("搜索组织失败:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value })
    
    // 清除之前的定时器
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    
    // 设置新的定时器，300ms 后执行搜索
    const timeout = setTimeout(() => {
      searchOrganizations(value)
    }, 300)
    
    setSearchTimeout(timeout)
  }

  const selectSearchResult = (org: any) => {
    setFormData({
      name: org.name,
      description: org.description || "",
    })
    setSelectedExistingOrg(org.id)
    setSearchResults([])
  }

  const handleSaveCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "创建失败",
        description: "空间名称不能为空",
        variant: "destructive",
      })
      return
    }

    // 如果选择了已存在的组织，则创建加入申请
    if (selectedExistingOrg) {
      setIsLoading(true)
      try {
        const token = getToken()
        if (!token) {
          throw new Error("未登录")
        }

        const response = await fetch(`/api/organizations/join-requests`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            organizationId: selectedExistingOrg,
            message: formData.description || "",
          }),
        })

        const data = await response.json()
        
        if (data.success) {
          toast({
            title: "申请已提交",
            description: `已向 ${formData.name} 提交加入申请，请等待审核`,
          })
          setIsCreating(false)
          setFormData({ name: "", description: "" })
          setSearchResults([])
          setSelectedExistingOrg(null)
        } else {
          toast({
            title: "申请失败",
            description: data.error || "无法提交申请",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("提交申请失败:", error)
        toast({
          title: "申请失败",
          description: "网络错误，请稍后重试",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
      return
    }

    // 创建新空间
    setIsLoading(true)
    try {
      const token = getToken()
      if (!token) {
        throw new Error("未登录")
      }

      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "创建成功",
          description: "空间已创建",
        })
        setIsCreating(false)
        setFormData({ name: "", description: "" })
        setSearchResults([])
        setSelectedExistingOrg(null)
        fetchOrganizations()
      } else {
        toast({
          title: "创建失败",
          description: data.error || "无法创建空间",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("创建空间失败:", error)
      toast({
        title: "创建失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
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

    const orgToDelete = organizations.find(org => org.id === deleteOrgId)
    if (!orgToDelete) return

    // 验证输入的名称是否匹配
    if (deleteConfirmText !== orgToDelete.name) {
      toast({
        title: "删除失败",
        description: "输入的空间名称不匹配",
        variant: "destructive",
      })
      return
    }

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
          description: "空间已删除",
        })
        setDeleteOrgId(null)
        setDeleteConfirmText("")
        fetchOrganizations()
      } else {
        toast({
          title: "删除失败",
          description: data.error || "无法删除空间",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("删除空间失败:", error)
      toast({
        title: "删除失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLeave = async () => {
    if (!leaveOrgId) return

    setIsLoading(true)
    try {
      const token = getToken()
      if (!token) {
        throw new Error("未登录")
      }

      const userStr = localStorage.getItem("currentUser")
      if (!userStr) {
        throw new Error("用户信息不存在")
      }
      const user = JSON.parse(userStr)

      const response = await fetch(`/api/organizations/${leaveOrgId}/members?userId=${user.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "退出成功",
          description: "已退出该空间",
        })
        setLeaveOrgId(null)
        
        // 如果退出的是当前组织，刷新页面重新加载
        if (leaveOrgId === currentOrgId) {
          toast({
            title: "空间已切换",
            description: "页面将刷新以加载新空间的数据",
          })
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        } else {
          fetchOrganizations()
        }
      } else {
        toast({
          title: "退出失败",
          description: data.error || "无法退出该空间",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("退出空间失败:", error)
      toast({
        title: "退出失败",
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
            <Button
              onClick={handleCreate}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              新增空间
            </Button>
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
                    {org.role !== "OWNER" && org.id !== currentOrgId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLeaveOrgId(org.id)}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        title="退出空间"
                      >
                        <LogOut className="h-4 w-4" />
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

      {/* 新增空间对话框 */}
      <Dialog open={isCreating} onOpenChange={(open) => {
        if (!open) {
          setIsCreating(false)
          setSearchResults([])
          setSelectedExistingOrg(null)
          if (searchTimeout) clearTimeout(searchTimeout)
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新增空间</DialogTitle>
            <DialogDescription>
              搜索并加入已有空间，或创建一个新的空间/组织
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">空间名称 *</Label>
              <div className="relative">
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="输入空间名称搜索或创建"
                  autoComplete="off"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
              </div>

              {/* 搜索结果下拉列表 */}
              {searchResults.length > 0 && (
                <div className="border rounded-md shadow-lg bg-background max-h-60 overflow-y-auto">
                  {searchResults.map((org) => (
                    <div
                      key={org.id}
                      className="px-3 py-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                      onClick={() => selectSearchResult(org)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{org.name}</span>
                            {org.isVerified && (
                              <Badge variant="secondary" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                已认证
                              </Badge>
                            )}
                          </div>
                          {org.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {org.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 提示信息 - 只在未选择已有空间时显示 */}
              {!selectedExistingOrg && formData.name.trim() && !isSearching && searchResults.length === 0 && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <div className="shrink-0 mt-0.5">
                    <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                      这是一个新的未注册空间
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      点击"创建"将创建名为 "<span className="font-semibold">{formData.name}</span>" 的新空间，您将成为所有者
                    </p>
                  </div>
                </div>
              )}

              {selectedExistingOrg && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <div className="shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                      已选择现有空间
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      点击"申请加入"将向 "<span className="font-semibold">{formData.name}</span>" 的创建者发送加入申请
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-description">
                {selectedExistingOrg ? "申请留言" : "描述"}
              </Label>
              <Textarea
                id="create-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={
                  selectedExistingOrg
                    ? "输入申请留言（可选）"
                    : "输入空间描述（可选）"
                }
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false)
                  setSearchResults([])
                  setSelectedExistingOrg(null)
                  if (searchTimeout) clearTimeout(searchTimeout)
                }}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button 
                onClick={handleSaveCreate} 
                disabled={isLoading || !formData.name.trim()}
              >
                {isLoading ? "处理中..." : selectedExistingOrg ? "申请加入" : "创建"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog 
        open={!!deleteOrgId} 
        onOpenChange={(open) => {
          if (!open) {
            setDeleteOrgId(null)
            setDeleteConfirmText("")
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除空间</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除该空间及其所有关联的团队、项目和任务数据。此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">
              请输入空间名称 <span className="font-semibold text-foreground">
                {organizations.find(org => org.id === deleteOrgId)?.name}
              </span> 以确认删除
            </Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="输入空间名称"
              disabled={isLoading}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading || deleteConfirmText !== organizations.find(org => org.id === deleteOrgId)?.name}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 退出空间确认对话框 */}
      <AlertDialog 
        open={!!leaveOrgId} 
        onOpenChange={(open) => {
          if (!open) {
            setLeaveOrgId(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认退出空间</AlertDialogTitle>
            <AlertDialogDescription>
              退出后，您将无法访问该空间的团队、项目和任务数据。如需再次访问，需要重新加入。
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isLoading ? "退出中..." : "确认退出"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
