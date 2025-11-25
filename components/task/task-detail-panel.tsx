"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Plus, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { useToast } from "@/hooks/use-toast"
import type { TaskType } from "@/lib/types"
import { formatDate } from "@/lib/utils/date-utils"
import { cn } from "@/lib/utils"
import { UserSelector } from "./user-selector"
import { UserMultiSelector } from "./user-multi-selector"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ColorPicker } from "./color-picker"
import { ProgressSlider } from "./progress-slider"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date }>({
    from: startDate,
    to: endDate,
  })
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [taskType, setTaskType] = useState<TaskType>("daily")
  const [color, setColor] = useState<string>('blue')
  const [progress, setProgress] = useState<number>(0)
  const [teamId, setTeamId] = useState<string>(taskCreation.teamId || "none")
  const [projectId, setProjectId] = useState(taskCreation.projectId || settings.lastSelectedProjectId || "personal")
  const [rememberProject, setRememberProject] = useState(settings.rememberLastProject)
  const [showNewProject, setShowNewProject] = useState(false)
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    taskCreation.userId ? [taskCreation.userId] : (currentUser?.id ? [currentUser.id] : [])
  ) // 负责人 ID 列表
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [projectError, setProjectError] = useState(false)
  const [teamError, setTeamError] = useState(false)

  // 获取当前选中的项目
  const selectedProject = projects.find(p => p.id === projectId)
  
  // 检查是否只有创建者可以管理任务（CREATOR_ONLY 模式）
  const isCreatorOnlyMode = selectedProject?.taskPermission === "CREATOR_ONLY"
  
  // 检查当前用户是否是项目创建者
  const isProjectCreator = currentUser?.id === selectedProject?.creatorId
  
  // 在 CREATOR_ONLY 模式下：
  // - 如果是项目创建者，不受限制，可以随意指定负责人
  // - 如果是普通成员，负责人只能是自己，且不可编辑
  const canEditAssignees = !isCreatorOnlyMode || isProjectCreator

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

    // 团队是可选的,不需要验证
    setTeamError(false)

    // 验证是否至少有一个负责人
    if (assigneeIds.length === 0) {
      toast({
        title: "请选择负责人",
        description: "任务必须至少有一个负责人",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const newTask = {
        title: title.trim(),
        description: description.trim() || undefined,
        startDate: dateRange.from,
        endDate: dateRange.to || dateRange.from,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        type: taskType,
        color: taskType === 'daily' ? color : undefined,
        progress,
        projectId,
        teamId: teamId === "none" ? undefined : teamId,
        creatorId: currentUser.id,
        userId: assigneeIds.length > 0 ? assigneeIds : [currentUser.id], // 发送负责人 ID 数组
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

  const daysDiff = dateRange.to
    ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 1

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

      <div className="relative w-full max-w-4xl rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">新建事项</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* 左侧列 - 必填项 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground border-b pb-2">必填信息</h3>
              
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
                  {isCreatorOnlyMode && !isProjectCreator && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (普通成员只能为自己创建任务)
                    </span>
                  )}
                </Label>
                <UserMultiSelector 
                  selectedUserIds={assigneeIds}
                  onUserChange={setAssigneeIds}
                  creatorId={currentUser?.id}
                  disabled={!canEditAssignees}
                />
              </div>

              {/* Project and Team */}
              <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem key={project.id} value={project.id} title={project.name}>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                            <span className="truncate max-w-[130px]">{project.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {projectError && (
                    <p className="text-sm text-red-500">请选择一个项目</p>
                  )}
                </div>

                {/* Team */}
                <div className="space-y-2">
                  <Label htmlFor="team" className="text-sm font-medium">
                    所属团队 <span className="text-xs text-muted-foreground">(可选)</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="inline-block ml-1 h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">如果没有团队,可以去个人中心加入团队或者自己先创建团队</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Select value={teamId} onValueChange={(value) => {
                    setTeamId(value)
                    setTeamError(false)
                  }}>
                    <SelectTrigger className={cn(teamError && "border-red-500 ring-1 ring-red-500")}>
                      <SelectValue placeholder="请选择团队" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams
                        .filter(t => currentUser && t.memberIds.includes(currentUser.id))
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((team) => (
                        <SelectItem key={team.id} value={team.id} title={team.name}>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                            <span className="truncate max-w-[130px]">{team.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {teamError && (
                    <p className="text-sm text-red-500">请选择一个团队</p>
                  )}
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

              {/* Color Picker & Progress Slider - Only for daily tasks */}
              {taskType === 'daily' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">事项颜色</Label>
                    <ColorPicker value={color} onChange={setColor} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">进度</Label>
                    <ProgressSlider value={progress} onChange={setProgress} color={color} />
                  </div>
                </>
              )}
            </div>

            {/* 右侧列 - 详情信息 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground border-b pb-2">详细信息</h3>
              
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
                <DateRangePicker
                  value={dateRange}
                  onChange={(range) => range && setDateRange(range)}
                  className="w-full"
                />
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

              {/* Creator - 显示创建人（当前用户）*/}
              {currentUser && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">创建人</Label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-muted/30">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{currentUser.name}</div>
                      <div className="text-xs text-muted-foreground">{currentUser.email}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Remember Project */}
          <div className="flex items-center gap-2 mt-6">
            <Checkbox
              id="remember"
              checked={rememberProject}
              onCheckedChange={(checked) => setRememberProject(!!checked)}
            />
            <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
              记住此项目，下次创建时自动选择
            </Label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t mt-6 justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="bg-transparent min-w-24" disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" className="min-w-28" disabled={!title.trim() || !dateRange.from || isSubmitting}>
              {isSubmitting ? '创建中...' : '创建事项'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}