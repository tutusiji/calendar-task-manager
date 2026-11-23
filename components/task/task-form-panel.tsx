"use client"

import { TaskFormDetails } from "@/components/task/task-form-details"
import { TaskFormRequiredFields } from "@/components/task/task-form-required-fields"

import type React from "react"

import { useState,useEffect } from "react"
import { X,Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useCalendarState } from "@/lib/store/use-calendar-state"
import { useToast } from "@/hooks/use-toast"
import { useTaskFormPermissions } from "@/hooks/use-task-form-permissions"
import type { Task,TaskRecurrenceType,TaskType } from "@/lib/types"

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
    stopRecurringTask,
    deleteTask,
    projects,
    currentUser,
    settings,
    updateSettings,
    taskCreation,
    getUserById,
  } = useCalendarState(
    "addTask",
    "updateTask",
    "stopRecurringTask",
    "deleteTask",
    "projects",
    "currentUser",
    "settings",
    "updateSettings",
    "taskCreation",
    "getUserById"
  )
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
  const [isRecurringEnabled, setIsRecurringEnabled] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<TaskRecurrenceType>("WEEKLY")
  const [intervalDays, setIntervalDays] = useState(7)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isStoppingRecurring, setIsStoppingRecurring] = useState(false)
  const [projectError, setProjectError] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showStopRecurringConfirm, setShowStopRecurringConfirm] = useState(false)
  const isRecurringTask = !!task?.recurringSeriesId

  // Get creator info (edit mode only)
  const creator = task ? (task.creator || getUserById(task.creatorId)) : null

  const selectableProjects = projects
    .filter((p) => {
      const isMember = currentUser ? p.memberIds.includes(currentUser.id) : false
      if (!isMember) {
        return isEditMode && task?.projectId === p.id
      }

      if (isEditMode && task?.projectId === p.id) return true
      return !p.isArchived
    })
    .sort((a, b) => {
      const aIsPersonal = a.name.includes('个人事务')
      const bIsPersonal = b.name.includes('个人事务')
      if (aIsPersonal && !bIsPersonal) return -1
      if (!aIsPersonal && bIsPersonal) return 1
      return a.name.localeCompare(b.name)
    })

  const {
    selectedProject,
    selectedProjectPermissionContext,
    sourceProject,
    sourceProjectPermissionContext,
    isPersonalProject,
    canManageAllTasksInSelectedProject,
    isSelectedProjectSelfOnlyMode,
    currentTaskAssigneeIds,
    canDeleteTask,
    canEditTaskContent,
    isProjectOnlyEditMode,
    canStopRecurringTask,
    canEditAssignees,
    shouldForceSelfAssignee,
  } = useTaskFormPermissions({
    isEditMode,
    task,
    currentUser,
    selectableProjects,
    projects,
    projectId,
  })

  const canSubmitTask =
    !!title.trim() &&
    !!dateRange.from &&
    !isSubmitting &&
    !isDeleting &&
    !isStoppingRecurring &&
    (!isProjectOnlyEditMode || projectId !== task?.projectId)

  const getWeekdayLabel = (date: Date) =>
    date.toLocaleDateString("zh-CN", { weekday: "long" })

  const getRecurrenceDescription = () => {
    if (isEditMode && task?.recurringSeries) {
      const occurrenceDate = task.recurrenceDate || task.startDate
      const seriesAnchorDate = task.recurringSeries.startDate || occurrenceDate
      switch (task.recurringSeries.recurrenceType) {
        case "WEEKLY":
          return `每周 ${getWeekdayLabel(occurrenceDate)} 创建一次`
        case "MONTHLY":
          return `每月 ${seriesAnchorDate.getDate()} 日创建一次，超出当月则取最后一天`
        case "INTERVAL_DAYS":
          return `每隔 ${task.recurringSeries.intervalDays || 1} 天创建一次`
        default:
          return "定时任务"
      }
    }

    switch (recurrenceType) {
      case "WEEKLY":
        return `每周 ${getWeekdayLabel(dateRange.from)} 创建一次`
      case "MONTHLY":
        return `每月 ${dateRange.from.getDate()} 日创建一次，超出当月则取最后一天`
      case "INTERVAL_DAYS":
        return `每隔 ${intervalDays} 天创建一次`
      default:
        return "定时任务"
    }
  }

  // 个人事务和“仅创建人”的普通成员模式下，负责人固定为自己
  useEffect(() => {
    if (shouldForceSelfAssignee && currentUser) {
      setAssigneeIds([currentUser.id])
    }
  }, [shouldForceSelfAssignee, currentUser])

  // 默认项目如果已被当前用户归档，则回退到可用项目
  useEffect(() => {
    if (selectableProjects.length === 0) return
    const exists = selectableProjects.some((p) => p.id === projectId)
    if (!exists) {
      setProjectId(selectableProjects[0].id)
    }
  }, [projectId, selectableProjects])

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

    if (!isEditMode && isRecurringEnabled) {
      if (recurrenceType === "INTERVAL_DAYS" && (!Number.isInteger(intervalDays) || intervalDays <= 0)) {
        toast({
          title: "请填写重复天数",
          description: "指定天数提醒需要填写大于 0 的整数天数",
          variant: "destructive",
        })
        return
      }
    }

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
        userId: assigneeIds.length > 0 ? assigneeIds : undefined,
        recurrence:
          !isEditMode && isRecurringEnabled
            ? {
                recurrenceType,
                intervalDays:
                  recurrenceType === "INTERVAL_DAYS" ? intervalDays : undefined,
              }
            : undefined,
      }

      const isRestrictedProjectReassignment =
        isEditMode &&
        !!task &&
        task.projectId !== projectId &&
        !canEditTaskContent

      if (isEditMode) {
        // Edit mode: update task
        const payload = isRestrictedProjectReassignment
          ? { projectId }
          : taskData
        await updateTask(task.id, payload as any)
        const successTaskTitle = isRestrictedProjectReassignment && task ? task.title : title
        toast({
          variant: 'success' as any,
          title: "保存成功",
          description: isRestrictedProjectReassignment
            ? `任务「${successTaskTitle}」已迁移到新项目`
            : `任务「${successTaskTitle}」已更新`,
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
        description: isRecurringTask
          ? `事项「${task.title}」已删除，后续定时任务保持不变`
          : `任务「${task.title}」已删除`,
      })
      onClose()
    } catch (error) {
      console.error('Failed to delete task:', error)
      const errorMessage = error instanceof Error
        ? error.message
        : '删除任务失败，请重试'
      toast({
        title: "删除失败",
        description: errorMessage,
        variant: "destructive",
      })
      setIsDeleting(false)
    }
  }

  const handleStopRecurring = async () => {
    if (!task || !isRecurringTask) return

    setIsStoppingRecurring(true)
    setShowStopRecurringConfirm(false)

    try {
      await stopRecurringTask(task.id)
      toast({
        variant: 'success' as any,
        title: "终止成功",
        description: `任务「${task.title}」的后续定时任务已终止，当前事项会保留`,
      })
      onClose()
    } catch (error) {
      console.error('Failed to stop recurring task:', error)
      const errorMessage =
        error instanceof Error ? error.message : '终止定时任务失败，请重试'
      toast({
        title: "终止失败",
        description: errorMessage,
        variant: "destructive",
      })
      setIsStoppingRecurring(false)
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
                disabled={isDeleting || isSubmitting || isStoppingRecurring || !canDeleteTask}
                title={
                  !canDeleteTask
                    ? "仅项目创建者或任务负责人可以删除"
                    : isRecurringTask
                      ? "删除当前事项"
                      : "删除任务"
                }
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isDeleting || isSubmitting || isStoppingRecurring}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Left column - Required fields */}
            <TaskFormRequiredFields
              title={title}
              setTitle={setTitle}
              isPersonalProject={isPersonalProject}
              isSelectedProjectSelfOnlyMode={isSelectedProjectSelfOnlyMode}
              canEditAssignees={canEditAssignees}
              isEditMode={isEditMode}
              assigneeIds={assigneeIds}
              setAssigneeIds={setAssigneeIds}
              task={task}
              currentUser={currentUser}
              projectId={projectId}
              setProjectId={setProjectId}
              setProjectError={setProjectError}
              projectError={projectError}
              selectableProjects={selectableProjects}
              isProjectOnlyEditMode={isProjectOnlyEditMode}
              setTaskType={setTaskType}
              taskType={taskType}
              color={color}
              setColor={setColor}
              progress={progress}
              setProgress={setProgress}
            />

            {/* Right column - Details */}
            <TaskFormDetails
              description={description}
              setDescription={setDescription}
              dateRange={dateRange}
              setDateRange={setDateRange}
              startTime={startTime}
              setStartTime={setStartTime}
              endTime={endTime}
              setEndTime={setEndTime}
              isEditMode={isEditMode}
              isRecurringTask={isRecurringTask}
              canStopRecurringTask={canStopRecurringTask}
              isStoppingRecurring={isStoppingRecurring}
              isDeleting={isDeleting}
              isSubmitting={isSubmitting}
              setShowStopRecurringConfirm={setShowStopRecurringConfirm}
              getRecurrenceDescription={getRecurrenceDescription}
              isRecurringEnabled={isRecurringEnabled}
              setIsRecurringEnabled={setIsRecurringEnabled}
              recurrenceType={recurrenceType}
              setRecurrenceType={setRecurrenceType}
              intervalDays={intervalDays}
              setIntervalDays={setIntervalDays}
              creator={creator}
              currentUser={currentUser}
            />
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
              disabled={isSubmitting || isDeleting || isStoppingRecurring}
            >
              取消
            </Button>
            <Button
              type="submit"
              className="min-w-28"
              disabled={!canSubmitTask}
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
              <AlertDialogTitle>
                {isRecurringTask ? "确认删除当前事项" : "确认删除任务"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isRecurringTask
                  ? `确定要删除当前事项「${task.title}」吗？这不会终止后续定时任务。`
                  : `确定要删除任务「${task.title}」吗？此操作无法撤销。`}
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

      {isEditMode && task && isRecurringTask && (
        <AlertDialog open={showStopRecurringConfirm} onOpenChange={setShowStopRecurringConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>终止后续定时任务</AlertDialogTitle>
              <AlertDialogDescription>
                确定要关闭任务「{task.title}」的定时任务吗？这一天之后的未来事项会被清理，当前事项和历史事项会保留。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isStoppingRecurring}>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleStopRecurring}
                disabled={isStoppingRecurring}
                className="bg-red-600 hover:bg-red-700"
              >
                {isStoppingRecurring ? '终止中...' : '确认终止'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
