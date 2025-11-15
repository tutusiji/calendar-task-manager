"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCalendarStore } from "@/lib/store/calendar-store"
import type { Project } from "@/lib/types"
import { UserMultiSelector } from "../task/user-multi-selector"
import { UserSingleSelector } from "../task/user-single-selector"

interface ProjectDialogProps {
  project?: Project // 如果提供则为编辑模式
  viewOnly?: boolean // 只读模式
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

export function ProjectDialog({ project, viewOnly = false, onClose }: ProjectDialogProps) {
  const { addProject, updateProject, teams, currentUser, users } = useCalendarStore()
  
  const [name, setName] = useState(project?.name || "")
  const [description, setDescription] = useState(project?.description || "")
  const [color, setColor] = useState(project?.color || PRESET_COLORS[0])
  const [teamId, setTeamId] = useState<string | undefined>(project?.teamId)
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
        teamId: teamId || undefined,
        memberIds: finalMemberIds,
        creatorId, // 更新创建者
      })
    } else {
      const newProject: Project = {
        id: `project-${Date.now()}`,
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        teamId: teamId || undefined,
        memberIds: finalMemberIds,
        creatorId: currentUser?.id || "", // 设置创建者
        createdAt: new Date(),
      }
      addProject(newProject)
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
            {viewOnly ? "查看项目" : isEditMode ? "编辑项目" : "新建项目"}
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

          {/* Team and Creator - 只在编辑模式时并排显示创建人，否则只显示团队 */}
          <div className={isEditMode ? "grid grid-cols-2 gap-4" : "space-y-2"}>
            {/* Team */}
            <div className="space-y-2">
              <Label htmlFor="team" className="text-sm font-medium">
                归属团队（可选）
              </Label>
              <Select 
                value={teamId || "none"} 
                onValueChange={(value) => setTeamId(value === "none" ? undefined : value)}
                disabled={viewOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择团队" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                        {team.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>

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
