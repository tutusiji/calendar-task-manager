"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCalendarStore } from "@/lib/store/calendar-store"
import type { Task, TaskType } from "@/lib/types"
import { formatDate } from "@/lib/utils/date-utils"
import { cn } from "@/lib/utils"
import { UserSelector } from "./user-selector"

interface TaskEditPanelProps {
  task: Task
  onClose: () => void
}

export function TaskEditPanel({ task, onClose }: TaskEditPanelProps) {
  const { updateTask, deleteTask, projects } = useCalendarStore()

  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || "")
  const [startTime, setStartTime] = useState(task.startTime || "")
  const [endTime, setEndTime] = useState(task.endTime || "")
  const [taskType, setTaskType] = useState<TaskType>(task.type)
  const [projectId, setProjectId] = useState(task.projectId)
  const [assigneeId, setAssigneeId] = useState(task.userId) // 负责人ID

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) return

    updateTask(task.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      type: taskType,
      projectId,
      userId: assigneeId, // 更新负责人
    })

    onClose()
  }

  const handleDelete = () => {
    if (confirm("确定要删除这个事项吗？")) {
      deleteTask(task.id)
      onClose()
    }
  }

  const getTaskTypeColor = (type: TaskType) => {
    switch (type) {
      case "daily":
        return "bg-blue-500"
      case "meeting":
        return "bg-yellow-500"
      case "vacation":
        return "bg-red-500"
    }
  }

  const daysDiff =
    Math.ceil((new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1

  // Escape 关闭：仅在挂载期添加监听，避免重复绑定
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
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">编辑事项</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleDelete} className="text-red-500 hover:text-red-600">
              <Trash2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              事项名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入事项名称"
              autoFocus
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              详情
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="添加详细描述（可选）"
              rows={3}
            />
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">时间范围</Label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-foreground">{formatDate(new Date(task.startDate))}</span>
              {daysDiff > 1 && (
                <>
                  <span className="text-muted-foreground">至</span>
                  <span className="text-foreground">{formatDate(new Date(task.endDate))}</span>
                  <span className="ml-auto text-muted-foreground">({daysDiff} 天)</span>
                </>
              )}
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime" className="text-sm font-medium">
                开始时间
              </Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="选择时间（可选）"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime" className="text-sm font-medium">
                结束时间
              </Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="选择时间（可选）"
              />
            </div>
          </div>

          {/* Task Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">事项类型</Label>
            <div className="flex gap-2">
              {(["daily", "meeting", "vacation"] as TaskType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTaskType(type)}
                  className={cn(
                    "flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all",
                    taskType === type
                      ? "border-current shadow-sm"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted",
                    taskType === type && type === "daily" && "text-blue-600 bg-blue-50",
                    taskType === type && type === "meeting" && "text-yellow-600 bg-yellow-50",
                    taskType === type && type === "vacation" && "text-red-600 bg-red-50",
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className={cn("h-3 w-3 rounded-full", getTaskTypeColor(type))} />
                    {type === "daily" && "日常"}
                    {type === "meeting" && "会议"}
                    {type === "vacation" && "休假"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">负责人</Label>
            <UserSelector 
              selectedUserId={assigneeId} 
              onUserChange={setAssigneeId}
            />
          </div>

          {/* Project */}
          <div className="space-y-2">
            <Label htmlFor="project" className="text-sm font-medium">
              归属项目
            </Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              取消
            </Button>
            <Button type="submit" className="flex-1" disabled={!title.trim()}>
              保存更改
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

