"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { useToast } from "@/hooks/use-toast"
import type { TaskType } from "@/lib/types"
import { formatDate } from "@/lib/utils/date-utils"
import { cn } from "@/lib/utils"
import { UserSelector } from "./user-selector"

interface TaskDetailPanelProps {
  startDate: Date
  endDate: Date
  onClose: () => void
}

export function TaskDetailPanel({ startDate, endDate, onClose }: TaskDetailPanelProps) {
  const { addTask, projects, teams, currentUser, settings, updateSettings, taskCreation, fetchTasks } = useCalendarStore()
  const { toast } = useToast()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [taskType, setTaskType] = useState<TaskType>("daily")
  const [teamId, setTeamId] = useState<string>(taskCreation.teamId || "none")
  const [projectId, setProjectId] = useState(taskCreation.projectId || settings.lastSelectedProjectId || "personal")
  const [rememberProject, setRememberProject] = useState(settings.rememberLastProject)
  const [showNewProject, setShowNewProject] = useState(false)
  const [assigneeId, setAssigneeId] = useState(taskCreation.userId || currentUser?.id || "") // 负责人 ID
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [projectError, setProjectError] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !currentUser) return

    // 验证项目是否选择
    if (!projectId || projectId === '') {
      setProjectError(true)
      toast({
        title: "请选择项目",
        description: "任务必须归属于一个项目",
        variant: "destructive",
      })
      return
    }
    setProjectError(false)

    setIsSubmitting(true)

    try {
      const newTask = {
        title: title.trim(),
        description: description.trim() || undefined,
        startDate,
        endDate,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        type: taskType,
        projectId,
        teamId: teamId === "none" ? undefined : teamId,
        userId: assigneeId || currentUser.id,
      }

      // await API 调用,确保创建成功(数据刷新在Store内部后台执行)
      await addTask(newTask)

      // 更新设置
      if (rememberProject) {
        updateSettings({ lastSelectedProjectId: projectId, rememberLastProject: true })
      } else {
        updateSettings({ rememberLastProject: false })
      }

      // API 成功后立即显示提示并关闭弹窗
      toast({
        variant: 'success' as any,
        title: "创建成功",
        description: `任务「${title}」已创建`,
      })
      onClose()
    } catch (error) {
      console.error('Failed to create task:', error)
      toast({
        title: "创建失败",
        description: "创建任务失败，请重试",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
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

  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

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
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-4xl rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">新建事项</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Required Fields */}
            <div className="space-y-4">
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

              {/* Assignee */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  负责人 <span className="text-red-500">*</span>
                </Label>
                <UserSelector 
                  selectedUserId={assigneeId} 
                  onUserChange={setAssigneeId}
                />
              </div>

              {/* Project */}
              <div className="space-y-2">
                <Label htmlFor="project" className="text-sm font-medium">
                  归属项目 <span className="text-red-500">*</span>
                </Label>
                <Select value={projectId} onValueChange={(value) => {
                  setProjectId(value)
                  setProjectError(false)
                }}>
                  <SelectTrigger className={cn(projectError && "border-red-500 ring-1 ring-red-500")}>
                    <SelectValue placeholder="请选择项目" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects
                      .filter(p => currentUser && p.memberIds.includes(currentUser.id))
                      .sort((a, b) => {
                        // 个人事务项目置顶
                        const aIsPersonal = a.name.includes('个人事务')
                        const bIsPersonal = b.name.includes('个人事务')
                        if (aIsPersonal && !bIsPersonal) return -1
                        if (!aIsPersonal && bIsPersonal) return 1
                        return a.name.localeCompare(b.name)
                      })
                      .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {projectError && (
                  <p className="text-sm text-red-500">请选择一个项目</p>
                )}
              </div>

              {/* Task Type */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  事项类型 <span className="text-red-500">*</span>
                </Label>
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
            </div>

            {/* Right Column - Details and Optional Fields */}
            <div className="space-y-4">
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
                  <span className="text-foreground">{formatDate(startDate)}</span>
                  {daysDiff > 1 && (
                    <>
                      <span className="text-muted-foreground">至</span>
                      <span className="text-foreground">{formatDate(endDate)}</span>
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

              {/* Team */}
              <div className="space-y-2">
                <Label htmlFor="team" className="text-sm font-medium">
                  所属团队
                </Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择团队（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无团队</SelectItem>
                    {teams
                      .filter(t => currentUser && t.memberIds.includes(currentUser.id))
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((team) => (
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

              {/* Remember Project */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberProject}
                  onCheckedChange={(checked) => setRememberProject(!!checked)}
                />
                <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                  记住此项目，下次创建时自动选择
                </Label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent" disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" className="flex-1" disabled={!title.trim() || isSubmitting}>
              {isSubmitting ? '创建中...' : '创建事项'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
