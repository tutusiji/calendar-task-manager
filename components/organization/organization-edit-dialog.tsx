"use client"

import type { ManagedOrganization } from "./organization-types"

import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import type * as React from "react"

export function OrganizationEditDialog({
  editingOrg,
  setEditingOrg,
  formData,
  setFormData,
  isLoading,
  handleSaveEdit,
}: {
  editingOrg: ManagedOrganization | null
  setEditingOrg: React.Dispatch<React.SetStateAction<ManagedOrganization | null>>
  formData: { name: string; description: string; joinRequiresApproval: boolean; }
  setFormData: React.Dispatch<React.SetStateAction<{ name: string; description: string; joinRequiresApproval: boolean; }>>
  isLoading: boolean
  handleSaveEdit: () => Promise<void>
}) {
  return (
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

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">加入需要审批</Label>
              <div className="text-sm text-muted-foreground">
                开启后,即使通过邀请码加入也需要管理员审批
              </div>
            </div>
            <Switch
              checked={formData.joinRequiresApproval}
              onCheckedChange={(checked) => setFormData({ ...formData, joinRequiresApproval: checked })}
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
  )
}
