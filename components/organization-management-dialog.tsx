"use client"

import { OrganizationManagementList } from "@/components/organization/organization-management-list"

import type { ManagedOrganization } from "@/components/organization/organization-types"

import { OrganizationCreateDialog } from "@/components/organization/organization-create-dialog"
import { OrganizationEditDialog } from "@/components/organization/organization-edit-dialog"

import { useState,useEffect } from "react"
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
import { useToast } from "@/hooks/use-toast"
import { Plus } from "lucide-react"
import { organizationAPI } from "@/lib/api/organization"
import { OrganizationDetailDialog } from "@/components/organization-detail-dialog"
import { copyToClipboard } from "@/lib/utils/clipboard"
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


interface OrganizationManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrganizationManagementDialog({
  open,
  onOpenChange,
}: OrganizationManagementDialogProps) {
  const { toast } = useToast()
  const [organizations, setOrganizations] = useState<ManagedOrganization[]>([])
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [editingOrg, setEditingOrg] = useState<ManagedOrganization | null>(null)
  const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null)
  const [leaveOrgId, setLeaveOrgId] = useState<string | null>(null)
  const [viewingOrgId, setViewingOrgId] = useState<string | null>(null)
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
    joinRequiresApproval: false,
  })
  const [inviteCodes, setInviteCodes] = useState<Record<string, string>>({}) // 存储每个组织的邀请码
  const [copiedCode, setCopiedCode] = useState<string | null>(null) // 记录刚复制的邀请码

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
      const data = await organizationAPI.getAll()
      setOrganizations(data)

      // 为每个组织获取邀请码
      for (const org of data) {
        try {
          const { inviteCode } = await organizationAPI.getInviteCode(org.id)
          setInviteCodes(prev => ({ ...prev, [org.id]: inviteCode }))
        } catch (error) {
          console.error(`获取组织 ${org.name} 的邀请码失败:`, error)
        }
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
      joinRequiresApproval: false,
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
      const data = await organizationAPI.getAll(query)
      setSearchResults(data)

      // 检查是否有完全匹配的结果
      const exactMatch = data.find((org: any) => org.name === query)
      setSelectedExistingOrg(exactMatch ? exactMatch.id : null)
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
      joinRequiresApproval: org.joinRequiresApproval || false,
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
        await organizationAPI.createJoinRequest({
          organizationId: selectedExistingOrg,
          message: formData.description || "",
        })

        toast({
          title: "申请已提交",
          description: `已向 ${formData.name} 提交加入申请，请等待审核`,
          duration: 3000,
        })
        setIsCreating(false)
        setFormData({ name: "", description: "", joinRequiresApproval: false })
        setSearchResults([])
        setSelectedExistingOrg(null)
      } catch (error) {
        console.error("提交申请失败:", error)
        toast({
          title: "申请失败",
          description: error instanceof Error ? error.message : "网络错误，请稍后重试",
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
      await organizationAPI.create(formData)

      toast({
        title: "创建成功",
        description: "空间已创建",
      })
      setIsCreating(false)
      setFormData({ name: "", description: "", joinRequiresApproval: false })
      setSearchResults([])
      setSelectedExistingOrg(null)
      fetchOrganizations()
    } catch (error) {
      console.error("创建空间失败:", error)
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "网络错误，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (org: ManagedOrganization) => {
    setEditingOrg(org)
    setFormData({
      name: org.name,
      description: org.description || "",
      joinRequiresApproval: org.joinRequiresApproval || false,
    })
  }

  const handleSaveEdit = async () => {
    if (!editingOrg) return

    setIsLoading(true)
    try {
      await organizationAPI.update(editingOrg.id, formData)

      toast({
        title: "更新成功",
        description: "组织信息已更新",
      })
      setEditingOrg(null)

        // 刷新页面以更新所有组件中的组织信息
        toast({
          title: "数据已更新",
          description: "页面将刷新以更新空间信息",
        })
        setTimeout(() => {
          window.location.reload()
        }, 1000)
    } catch (error) {
      console.error("更新组织失败:", error)
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "网络错误，请稍后重试",
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
      await organizationAPI.delete(deleteOrgId)

      toast({
        title: "删除成功",
        description: "空间已删除",
      })
      setDeleteOrgId(null)
      setDeleteConfirmText("")
      fetchOrganizations()
    } catch (error) {
      console.error("删除空间失败:", error)
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "网络错误，请稍后重试",
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
      const userStr = localStorage.getItem("currentUser")
      if (!userStr) {
        throw new Error("用户信息不存在")
      }
      const user = JSON.parse(userStr)

      await organizationAPI.removeMember(leaveOrgId, user.id)

      toast({
        title: "退出成功",
        description: "已退出该空间",
      })
      setLeaveOrgId(null)

        // 退出组织后，刷新页面以更新所有组件的组织列表
        toast({
          title: "空间已更新",
          description: "页面将刷新以更新空间列表",
        })
        setTimeout(() => {
          window.location.reload()
        }, 1000)
    } catch (error) {
      console.error("退出空间失败:", error)
      toast({
        title: "退出失败",
        description: error instanceof Error ? error.message : "退出空间失败",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 复制邀请码
  const handleCopyInviteCode = async (orgId: string, orgName: string) => {
    const code = inviteCodes[orgId]
    if (!code) {
      toast({
        title: "邀请码未加载",
        description: "请稍后再试",
        variant: "destructive",
      })
      return
    }

    // 构建完整的复制文本
    const copyText = `注册时空间组织输入"${orgName}"，并在下拉列表中选择该选项，输入邀请码 ${code}`

    const success = await copyToClipboard(copyText)

    if (success) {
      setCopiedCode(orgId)
      toast({
        title: "已复制",
        description: `${orgName} 的邀请信息已复制到剪贴板`,
      })

      // 2秒后清除复制状态
      setTimeout(() => {
        setCopiedCode(null)
      }, 2000)
    } else {
      toast({
        title: "复制失败",
        description: "请手动复制邀请码",
        variant: "destructive",
      })
    }
  }


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!max-w-[640px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>空间管理</DialogTitle>
            <DialogDescription>
              管理您的所有空间/组织，编辑信息或删除空间
            </DialogDescription>
          </DialogHeader>

          {/* 新增按钮 - 固定不滚动 */}
          <div className="pt-4">
            <Button
              onClick={handleCreate}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              新增/加入 空间
            </Button>
          </div>

          {/* 组织列表 - 可滚动区域 */}
          <OrganizationManagementList
            organizations={organizations}
            currentOrgId={currentOrgId}
            setViewingOrgId={setViewingOrgId}
            handleEdit={handleEdit}
            setDeleteOrgId={setDeleteOrgId}
            setLeaveOrgId={setLeaveOrgId}
            inviteCodes={inviteCodes}
            handleCopyInviteCode={handleCopyInviteCode}
            copiedCode={copiedCode}
          />
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <OrganizationEditDialog
        editingOrg={editingOrg}
        setEditingOrg={setEditingOrg}
        formData={formData}
        setFormData={setFormData}
        isLoading={isLoading}
        handleSaveEdit={handleSaveEdit}
      />

      {/* 新增空间对话框 */}
      <OrganizationCreateDialog
        isCreating={isCreating}
        setIsCreating={setIsCreating}
        setSearchResults={setSearchResults}
        setSelectedExistingOrg={setSelectedExistingOrg}
        searchTimeout={searchTimeout}
        formData={formData}
        handleNameChange={handleNameChange}
        isSearching={isSearching}
        searchResults={searchResults}
        selectSearchResult={selectSearchResult}
        selectedExistingOrg={selectedExistingOrg}
        setFormData={setFormData}
        isLoading={isLoading}
        handleSaveCreate={handleSaveCreate}
      />

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

      {/* 查看空间详情对话框 */}
      <OrganizationDetailDialog
        organizationId={viewingOrgId}
        organizationName={organizations.find(org => org.id === viewingOrgId)?.name}
        open={!!viewingOrgId}
        onOpenChange={(open) => !open && setViewingOrgId(null)}
      />
    </>
  )
}
