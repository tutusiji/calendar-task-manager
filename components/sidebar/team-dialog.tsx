"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useCalendarStore } from "@/lib/store/calendar-store"
import type { Team, TaskPermission } from "@/lib/types"
import { UserMultiSelector } from "../task/user-multi-selector"
import { UserSingleSelector } from "../task/user-single-selector"

interface TeamDialogProps {
  team?: Team // 如果提供则为编辑模式
  viewOnly?: boolean // 是否为查看模式
  onClose: () => void
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

export function TeamDialog({ team, viewOnly = false, onClose }: TeamDialogProps) {
  const { addTeam, updateTeam, currentUser, users } = useCalendarStore()
  
  const [name, setName] = useState(team?.name || "")
  const [description, setDescription] = useState(team?.description || "")
  const [color, setColor] = useState(team?.color || PRESET_COLORS[0])
  const [taskPermission, setTaskPermission] = useState<TaskPermission>(team?.taskPermission || "ALL_MEMBERS")
  const [memberIds, setMemberIds] = useState<string[]>(() => {
    // 初始化成员列表
    if (team?.memberIds) {
      return team.memberIds
    }
    // 新建团队时，默认包含当前用户
    return currentUser?.id ? [currentUser.id] : []
  })
  const [creatorId, setCreatorId] = useState<string>(team?.creatorId || currentUser?.id || "")

  const isEditMode = !!team
  // 判断当前用户是否是创建者或超级管理员
  const isCreator = currentUser?.id === team?.creatorId
  const canEditCreator = isCreator || currentUser?.isAdmin

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) return
    if (memberIds.length === 0) {
      alert("请至少选择一个团队成员")
      return
    }

    // 确保创建者在成员列表中
    const finalMemberIds = memberIds.includes(creatorId) 
      ? memberIds 
      : [...memberIds, creatorId]

    if (isEditMode) {
      updateTeam(team.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        memberIds: finalMemberIds,
        creatorId, // 更新创建者
        taskPermission, // 更新任务权限
      })
    } else {
      const newTeam: Team = {
        id: `team-${Date.now()}`,
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        memberIds: finalMemberIds,
        creatorId: currentUser?.id || "", // 设置创建者
        taskPermission, // 设置任务权限
        createdAt: new Date(),
      }
      addTeam(newTeam)
    }

    onClose()
  }

  // ESC 关闭支持
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {viewOnly ? "查看团队" : isEditMode ? "编辑团队" : "新建团队"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              团队名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入团队名称"
              autoFocus
              disabled={viewOnly}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              团队描述
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="添加团队描述（可选）"
              rows={3}
              disabled={viewOnly}
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">团队颜色</Label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className="h-8 w-8 rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: presetColor,
                    borderColor: color === presetColor ? presetColor : "transparent",
                    boxShadow: color === presetColor ? `0 0 0 2px white, 0 0 0 4px ${presetColor}` : "none",
                  }}
                  title={presetColor}
                  disabled={viewOnly}
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
                disabled={viewOnly || !canEditCreator}
                placeholder="选择创建人"
              />
            </div>
          )}

          {/* Members */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              团队成员 <span className="text-red-500">*</span>
            </Label>
            <UserMultiSelector 
              selectedUserIds={memberIds}
              onUserChange={setMemberIds}
              lockedUserIds={viewOnly ? memberIds : [creatorId]} // 查看模式锁定所有成员,编辑模式锁定创建者
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
                <RadioGroupItem value="ALL_MEMBERS" id="all-members" />
                <Label htmlFor="all-members" className="font-normal cursor-pointer">
                  <div className="flex flex-col">
                    <span className="text-sm">所有成员</span>
                    <span className="text-xs text-muted-foreground">
                      团队成员之间可以互相创建、编辑和删除任务
                    </span>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="CREATOR_ONLY" id="creator-only" />
                <Label htmlFor="creator-only" className="font-normal cursor-pointer">
                  <div className="flex flex-col">
                    <span className="text-sm">仅创建人</span>
                    <span className="text-xs text-muted-foreground">
                      只有创建人可以给团队中所有成员创建、编辑和删除任务
                    </span>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {viewOnly ? "关闭" : "取消"}
            </Button>
            {!viewOnly && (
              <Button type="submit">
                {isEditMode ? "保存" : "创建"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
