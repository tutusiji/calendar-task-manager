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

interface ProjectDialogProps {
  project?: Project // 如果提供则为编辑模式
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

export function ProjectDialog({ project, onClose }: ProjectDialogProps) {
  const { addProject, updateProject, teams, currentUser, users } = useCalendarStore()
  
  const [name, setName] = useState(project?.name || "")
  const [description, setDescription] = useState(project?.description || "")
  const [color, setColor] = useState(project?.color || PRESET_COLORS[0])
  const [teamId, setTeamId] = useState<string | undefined>(project?.teamId)
  const [memberIds, setMemberIds] = useState<string[]>(project?.memberIds || [])
  const [creatorId, setCreatorId] = useState<string>(project?.creatorId || currentUser?.id || "")

  const isEditMode = !!project
  // 判断当前用户是否是创建者
  const isCreator = currentUser?.id === project?.creatorId

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) return
    if (memberIds.length === 0) {
      alert("请至少选择一个项目成员")
      return
    }

    if (isEditMode) {
      updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        teamId: teamId || undefined,
        memberIds,
        creatorId, // 更新创建者
      })
    } else {
      const newProject: Project = {
        id: `project-${Date.now()}`,
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        teamId: teamId || undefined,
        memberIds,
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
            {isEditMode ? "编辑项目" : "新建项目"}
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
              项目名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入项目名称"
              autoFocus
              required
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
                  onClick={() => setColor(presetColor)}
                  className="h-8 w-8 rounded-full border-2 transition-all hover:scale-110"
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

          {/* Team */}
          <div className="space-y-2">
            <Label htmlFor="team" className="text-sm font-medium">
              归属团队（可选）
            </Label>
            <Select value={teamId || "none"} onValueChange={(value) => setTeamId(value === "none" ? undefined : value)}>
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
              {isCreator ? (
                <Select value={creatorId} onValueChange={setCreatorId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {users.find(u => u.id === creatorId)?.name || '未知'}
                </div>
              )}
            </div>
          )}

          {/* Members */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              项目成员 <span className="text-red-500">*</span>
            </Label>
            <UserMultiSelector 
              selectedUserIds={memberIds}
              onUserChange={setMemberIds}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit">
              {isEditMode ? "保存" : "创建"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
