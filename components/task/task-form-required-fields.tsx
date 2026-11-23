"use client"

import type React from "react"
import { AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select"
import type { Task,TaskType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { UserMultiSelector } from "@/components/task/user-multi-selector"
import { ColorPicker } from "@/components/task/color-picker"
import { ProgressSlider } from "@/components/task/progress-slider"
import type { User,Project } from "@/lib/types"

export function TaskFormRequiredFields({
  title,
  setTitle,
  isPersonalProject,
  isSelectedProjectSelfOnlyMode,
  canEditAssignees,
  isEditMode,
  assigneeIds,
  setAssigneeIds,
  task,
  currentUser,
  projectId,
  setProjectId,
  setProjectError,
  projectError,
  selectableProjects,
  isProjectOnlyEditMode,
  setTaskType,
  taskType,
  color,
  setColor,
  progress,
  setProgress,
}: {
  title: string
  setTitle: React.Dispatch<React.SetStateAction<string>>
  isPersonalProject: boolean
  isSelectedProjectSelfOnlyMode: boolean
  canEditAssignees: boolean
  isEditMode: boolean
  assigneeIds: string[]
  setAssigneeIds: React.Dispatch<React.SetStateAction<string[]>>
  task: Task | undefined
  currentUser: User | null
  projectId: string
  setProjectId: React.Dispatch<React.SetStateAction<string>>
  setProjectError: React.Dispatch<React.SetStateAction<boolean>>
  projectError: boolean
  selectableProjects: Project[]
  isProjectOnlyEditMode: boolean
  setTaskType: React.Dispatch<React.SetStateAction<TaskType>>
  taskType: TaskType
  color: string
  setColor: React.Dispatch<React.SetStateAction<string>>
  progress: number
  setProgress: React.Dispatch<React.SetStateAction<number>>
}) {
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

  return (
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
          ) : isSelectedProjectSelfOnlyMode && !canEditAssignees ? (
            <span className="ml-2 text-xs text-muted-foreground">
              {isEditMode
                ? "(当前目标项目下只能指派给自己)"
                : "(普通成员只能为自己创建任务)"}
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

      {/* Project */}
      <div className="space-y-2">
        <Label htmlFor="project" className="text-sm font-medium">
          归属项目 <span className="text-red-500">*</span>
        </Label>
        <Select value={projectId || ''} onValueChange={(value) => {
          setProjectId(value)
          setProjectError(false)
        }}>
          <SelectTrigger className={cn(
            projectError && "border-red-500 text-red-600 ring-1 ring-red-500 focus:ring-red-500 bg-red-50"
          )}>
            <SelectValue placeholder="请选择项目" />
          </SelectTrigger>
          <SelectContent>
            {selectableProjects.map((project) => (
              <SelectItem key={project.id} value={project.id} title={project.name}>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                  <span className="truncate max-w-[240px]">{project.name}</span>
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
        {isProjectOnlyEditMode && (
          <p className="text-xs text-muted-foreground">
            当前事项来自“仅创建人”项目。你现在只能调整归属项目，其他字段不会保存。
          </p>
        )}
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
  )
}
