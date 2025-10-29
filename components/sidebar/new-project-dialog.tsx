"use client"

import type React from "react"
import { Plus } from "lucide-react" // Import Plus component

import { useState } from "react"
import { X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { cn } from "@/lib/utils"

interface NewProjectDialogProps {
  onClose: () => void
}

const PROJECT_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444", "#6366f1"]

export function NewProjectDialog({ onClose }: NewProjectDialogProps) {
  const { addProject, users, currentUser } = useCalendarStore()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([currentUser.id])
  const [showMemberDropdown, setShowMemberDropdown] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) return

    const newProject = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      memberIds: selectedMembers,
      createdAt: new Date(),
    }

    addProject(newProject)
    onClose()
  }

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">新建项目</h2>
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
              项目详情
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
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-8 w-8 rounded-full transition-all",
                    color === c && "ring-2 ring-offset-2 ring-current",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Members */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">项目成员</Label>

            {/* Selected members */}
            <div className="flex flex-wrap gap-2">
              {selectedMembers.map((memberId) => {
                const user = users.find((u) => u.id === memberId)
                if (!user) return null

                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground">{user.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleMember(user.id)}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Member selector */}
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start bg-transparent"
                onClick={() => setShowMemberDropdown(!showMemberDropdown)}
              >
                <Plus className="mr-2 h-4 w-4" /> {/* Use Plus component here */}
                添加成员
              </Button>

              {showMemberDropdown && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-border bg-popover shadow-lg">
                  {users.map((user) => {
                    const isSelected = selectedMembers.includes(user.id)

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => toggleMember(user.id)}
                        className="flex w-full items-center gap-3 px-3 py-2 hover:bg-muted transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                          <AvatarFallback>{user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-foreground">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              取消
            </Button>
            <Button type="submit" className="flex-1" disabled={!name.trim()}>
              创建项目
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
