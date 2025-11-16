"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useCalendarStore } from "@/lib/store/calendar-store"
import type { Project, TaskPermission } from "@/lib/types"
import { UserMultiSelector } from "../task/user-multi-selector"
import { UserSingleSelector } from "../task/user-single-selector"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ProjectDialogProps {
  project?: Project // 如果提供则为编辑模式
  viewOnly?: boolean // 只读模式
  onClose: (saved?: boolean) => void
}

// 预设颜色
const PRESET_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // orange
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // amber
]

export function ProjectDialog({ project, viewOnly = false, onClose }: ProjectDialogProps) {
  const { addProject, updateProject, currentUser, users } = useCalendarStore()
  
  const [name, setName] = useState(project?.name || "")
  const [description, setDescription] = useState(project?.description || "")
  const [color, setColor] = useState(project?.color || PRESET_COLORS[0])
  const [taskPermission, setTaskPermission] = useState<TaskPermission>(project?.taskPermission || "ALL_MEMBERS")
  const [memberIds, setMemberIds] = useState<string[]>(() => {
    // 初始化成员列表
    if (project?.memberIds) {
      return project.memberIds
    }
    // 新建项目时，默认包含当前用户
    return currentUser?.id ? [currentUser.id] : []
  })
  const [creatorId, setCreatorId] = useState<string>(project?.creatorId || currentUser?.id || "")

  const isEditMode = !!project
  // 判断当前用户是否是创建者或超级管理员
  const isCreator = currentUser?.id === project?.creatorId
  const canEditCreator = (isCreator || currentUser?.isAdmin) && !viewOnly

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) return
    if (memberIds.length === 0) {
      alert("请至少选择一个项目成员")
      return
    }

    // 确保创建者在成员列表中
    const finalMemberIds = memberIds.includes(creatorId) 
      ? memberIds 
      : [...memberIds, creatorId]

    if (isEditMode) {
      updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        memberIds: finalMemberIds,
        creatorId, // 更新创建者
        taskPermission, // 更新任务权限
      })
    } else {
      const newProject = {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        memberIds: finalMemberIds,
        creatorId: currentUser?.id || "", // 设置创建者
        taskPermission, // 设置任务权限
      }
      addProject(newProject as any)
    }

    onClose(true)
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose(false)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {viewOnly ? "查看项目" : isEditMode ? "编辑项目" : "新建项目"}
          </DialogTitle>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              项目名称 {!viewOnly && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入项目名称"
              autoFocus={!viewOnly}
              required={!viewOnly}
              disabled={viewOnly}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              项目描述
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="添加项目描述（可选）"
              rows={3}
              disabled={viewOnly}
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">项目颜色</Label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => !viewOnly && setColor(presetColor)}
                  disabled={viewOnly}
                  className="h-8 w-8 rounded-full border-2 transition-all hover:scale-110 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{
                    backgroundColor: presetColor,
                    borderColor: color === presetColor ? presetColor : "transparent",
                    boxShadow: color === presetColor ? `0 0 0 2px white, 0 0 0 4px ${presetColor}` : "none",
                  }}
                  title={presetColor}
                />
              ))}
            </div>
          </div>

          {/* Creator - 只在编辑模式显示 */}
          {isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="creator" className="text-sm font-medium">
                创建人
              </Label>
              <UserSingleSelector
                selectedUserId={creatorId}
                onUserChange={setCreatorId}
                disabled={!canEditCreator || viewOnly}
                placeholder="选择创建人"
              />
            </div>
          )}

          {/* Members */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              项目成员 {!viewOnly && <span className="text-red-500">*</span>}
            </Label>
            <UserMultiSelector 
              selectedUserIds={memberIds}
              onUserChange={setMemberIds}
              lockedUserIds={viewOnly ? memberIds : [creatorId]} // 查看模式下所有成员都锁定
              creatorId={creatorId} // 传入创建者ID用于显示标签
            />
          </div>

          {/* Task Permission */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              协同权限
            </Label>
            <RadioGroup
              value={taskPermission}
              onValueChange={(value) => setTaskPermission(value as TaskPermission)}
              disabled={viewOnly}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="ALL_MEMBERS" id="project-all-members" />
                <Label htmlFor="project-all-members" className="font-normal cursor-pointer">
                  <div className="flex flex-col">
                    <span className="text-sm">所有成员</span>
                    <span className="text-xs text-muted-foreground">
                      项目成员之间可以互相创建、编辑和删除任务
                    </span>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="CREATOR_ONLY" id="project-creator-only" />
                <Label htmlFor="project-creator-only" className="font-normal cursor-pointer">
                  <div className="flex flex-col">
                    <span className="text-sm">仅创建人</span>
                    <span className="text-xs text-muted-foreground">
                      只有创建人可以给项目中所有成员创建、编辑和删除任务
                    </span>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onClose(false)}>
              {viewOnly ? "关闭" : "取消"}
            </Button>
            {!viewOnly && (
              <Button type="submit">
                {isEditMode ? "保存" : "创建"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
