"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Trash2, HelpCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { useToast } from "@/hooks/use-toast"
import type { Task, TaskType } from "@/lib/types"
import { formatDate } from "@/lib/utils/date-utils"
import { cn } from "@/lib/utils"

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface TaskFormPanelProps {
  task?: Task  // If provided = edit mode, else = create mode
  startDate?: Date  // For create mode
  endDate?: Date    // For create mode
  onClose: () => void
}

export function TaskFormPanel({ task, startDate, endDate, onClose }: TaskFormPanelProps) {
  const isEditMode = !!task
  
  const { 
    addTask, 
    updateTask, 
    deleteTask, 
    projects, 
    teams, 
    currentUser, 
    settings, 
    updateSettings, 
    taskCreation, 
    getUserById 
  } = useCalendarStore()
  const { toast } = useToast()

  const [title, setTitle] = useState(task?.title || "")
  const [description, setDescription] = useState(task?.description || "")
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date }>({
    from: task ? new Date(task.startDate) : (startDate || new Date()),
    to: task ? new Date(task.endDate) : (endDate || new Date()),
  })
  const [startTime, setStartTime] = useState(task?.startTime || "")
  const [endTime, setEndTime] = useState(task?.endTime || "")
  const [taskType, setTaskType] = useState<TaskType>(task?.type || "daily")
  const [color, setColor] = useState<string>(task?.color || 'blue')
  const [progress, setProgress] = useState<number>(task?.progress || 0)
  const [teamId, setTeamId] = useState<string>(
    task?.teamId || 
    taskCreation.teamId || 
    (currentUser?.defaultTeamId ? currentUser.defaultTeamId : "none")
  )
  const [projectId, setProjectId] = useState(
    task?.projectId || 
    taskCreation.projectId || 
    settings.lastSelectedProjectId || 
    "personal"
  )
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    task?.assignees?.map(a => a.userId) || 
    (taskCreation.userId ? [taskCreation.userId] : (currentUser?.id ? [currentUser.id] : []))
  )
  const [rememberProject, setRememberProject] = useState(settings.rememberLastProject)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [projectError, setProjectError] = useState(false)
  const [teamError, setTeamError] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Get creator info (edit mode only)
  const creator = task ? (task.creator || getUserById(task.creatorId)) : null
  
  // Get selected project
  const selectedProject = projects.find(p => p.id === projectId)
  
  // Check if it's a personal project
  const isPersonalProject = selectedProject?.name.includes('个人事务')
  
  // Check permissions
  const isCreatorOnlyMode = selectedProject?.taskPermission === "CREATOR_ONLY"
  const isTaskCreator = task ? currentUser?.id === task.creatorId : true
  const isProjectCreator = currentUser?.id === selectedProject?.creatorId
  
  const canEditAssignees = !isCreatorOnlyMode || isProjectCreator || isTaskCreator
  const canDeleteTask = !isCreatorOnlyMode || isProjectCreator || isTaskCreator

  // Auto-set assignee to current user for personal projects
  useEffect(() => {
    if (isPersonalProject && currentUser && !task) {
      setAssigneeIds([currentUser.id])
    }
  }, [isPersonalProject, currentUser, task])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !dateRange.from) return

    // Validate project selection
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
    setTeamError(false)

    // Validate assignees
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
      const taskData = {
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
        userId: assigneeIds.length > 0 ? assigneeIds : undefined,
      }

      if (isEditMode) {
        // Edit mode: update task
        await updateTask(task.id, taskData as any)
        toast({
          variant: 'success' as any,
          title: "保存成功",
          description: `任务「${title}」已更新`,
        })
      } else {
        // Create mode: add task
        await addTask({
          ...taskData,
          creatorId: currentUser!.id,
        } as any)
        
        // Update settings if remember project is checked
        if (rememberProject) {
          updateSettings({ lastSelectedProjectId: projectId, rememberLastProject: true })
        } else {
          updateSettings({ rememberLastProject: false })
        }
        
        toast({
          variant: 'success' as any,
          title: "创建成功",
          description: `任务「${title}」已创建`,
        })
      }
      
      onClose()
    } catch (error) {
      console.error('Failed to save task:', error)
      toast({
        title: isEditMode ? "保存失败" : "创建失败",
        description: isEditMode ? "更新任务失败，请重试" : "创建任务失败，请重试",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!task) return
    
    setIsDeleting(true)
    setShowDeleteConfirm(false)

    try {
      await deleteTask(task.id)
      toast({
        variant: 'success' as any,
        title: "删除成功",
        description: `任务「${task.title}」已删除`,
      })
      onClose()
    } catch (error) {
      console.error('Failed to delete task:', error)
      const errorMessage = error instanceof Error ? error.message : '删除任务失败，请重试'
      toast({
        title: "删除失败",
        description: errorMessage,
        variant: "destructive",
      })
      setIsDeleting(false)
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

  // ESC to close
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
          <h2 className="text-lg font-semibold text-foreground">
            {isEditMode ? "编辑事项" : "新建事项"}
          </h2>
          <div className="flex items-center gap-2">
            {isEditMode && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowDeleteConfirm(true)} 
                className="text-red-500 hover:text-red-600"
                disabled={isDeleting || isSubmitting || !canDeleteTask}
                title={!canDeleteTask ? "仅任务创建者或项目创建者可以删除" : "删除任务"}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} disabled={isDeleting || isSubmitting}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Left column - Required fields */}
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
                  {isPersonalProject ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (个人事务只能指派给自己)
                    </span>
                  ) : isCreatorOnlyMode && !canEditAssignees ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {isEditMode ? "(仅任务创建者或项目创建者可编辑)" : "(普通成员只能为自己创建任务)"}
                    </span>
                  ) : null}
                </Label>
                <UserMultiSelector 
                  selectedUserIds={assigneeIds}
                  onUserChange={setAssigneeIds}
                  creatorId={task?.creatorId || currentUser?.id}
                  disabled={!canEditAssignees || isPersonalProject}
                />
              </div>

              {/* Project and Team */}
              <div className="grid grid-cols-2 gap-4">
                {/* Project */}
                <div className="space-y-2">
                  <Label htmlFor="project" className="text-sm font-medium">
                    归属项目 <span className="text-red-500">*</span>
                  </Label>
                  <Select value={projectId || ''} onValueChange={(value) => {
                    setProjectId(value)
                    setProjectError(false)
                    
                    // Clear team if personal project selected
                    const project = projects.find(p => p.id === value)
                    if (project?.name.includes('个人事务')) {
                      setTeamId("none")
                    }
                  }}>
                    <SelectTrigger className={cn(
                      projectError && "border-red-500 text-red-600 ring-1 ring-red-500 focus:ring-red-500 bg-red-50"
                    )}>
                      <SelectValue placeholder="请选择项目" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects
                        .filter(p => currentUser && p.memberIds.includes(currentUser.id))
                        .sort((a, b) => {
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
                    <div className="flex items-center gap-1 mt-1.5 text-red-600 animate-in slide-in-from-top-1 fade-in-0">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <p className="text-xs font-medium">请选择一个归属项目</p>
                    </div>
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
                  <Select 
                    value={teamId} 
                    onValueChange={(value) => {
                      setTeamId(value)
                      setTeamError(false)
                    }}
                    disabled={selectedProject?.name.includes('个人事务')}
                  >
                    <SelectTrigger className={cn(teamError && "border-red-500 ring-1 ring-red-500")}>
                      <SelectValue placeholder="请选择团队" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">不设置</span>
                      </SelectItem>
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

            {/* Right column - Details */}
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

              {/* Creator - Show in edit mode or current user in create mode */}
              {(isEditMode && creator) || (!isEditMode && currentUser) ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">创建人</Label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-muted/30">
                    {(() => {
                      const displayUser = isEditMode ? creator : currentUser
                      return displayUser ? (
                        <>
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={displayUser.avatar} alt={displayUser.name} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {displayUser.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{displayUser.name}</div>
                            <div className="text-xs text-muted-foreground">{displayUser.email}</div>
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">未知创建人</span>
                      )
                    })()}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Remember Project - Create mode only */}
          {!isEditMode && (
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
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t mt-6 justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="bg-transparent min-w-24"
              disabled={isSubmitting || isDeleting}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              className="min-w-28" 
              disabled={!title.trim() || !dateRange.from || isSubmitting || isDeleting}
            >
              {isSubmitting ? (isEditMode ? '保存中...' : '创建中...') : (isEditMode ? '保存更改' : '创建事项')}
            </Button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Dialog - Edit mode only */}
      {isEditMode && task && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除任务</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除任务「{task.title}」吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? '删除中...' : '确认删除'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
