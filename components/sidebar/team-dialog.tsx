"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCalendarStore } from "@/lib/store/calendar-store"
import type { Team } from "@/lib/types"
import { UserMultiSelector } from "../task/user-multi-selector"

interface TeamDialogProps {
  team?: Team // 如果提供则为编辑模式
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

export function TeamDialog({ team, onClose }: TeamDialogProps) {
  const { addTeam, updateTeam } = useCalendarStore()
  
  const [name, setName] = useState(team?.name || "")
  const [description, setDescription] = useState(team?.description || "")
  const [color, setColor] = useState(team?.color || PRESET_COLORS[0])
  const [memberIds, setMemberIds] = useState<string[]>(team?.memberIds || [])

  const isEditMode = !!team

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) return
    if (memberIds.length === 0) {
      alert("请至少选择一个团队成员")
      return
    }

    if (isEditMode) {
      updateTeam(team.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        memberIds,
      })
    } else {
      const newTeam: Team = {
        id: `team-${Date.now()}`,
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        memberIds,
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
            {isEditMode ? "编辑团队" : "新建团队"}
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
                />
              ))}
            </div>
          </div>

          {/* Members */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              团队成员 <span className="text-red-500">*</span>
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
