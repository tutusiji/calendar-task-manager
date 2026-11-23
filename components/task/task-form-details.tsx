"use client"

import type React from "react"
import { HelpCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Switch } from "@/components/ui/switch"
import type { TaskRecurrenceType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Avatar,AvatarFallback,AvatarImage } from "@/components/ui/avatar"
import { TimePicker } from "@/components/ui/time-picker"
import { Tooltip,TooltipContent,TooltipProvider,TooltipTrigger } from "@/components/ui/tooltip"
import type { User } from "@/lib/types"

export function TaskFormDetails({
  description,
  setDescription,
  dateRange,
  setDateRange,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  isEditMode,
  isRecurringTask,
  canStopRecurringTask,
  isStoppingRecurring,
  isDeleting,
  isSubmitting,
  setShowStopRecurringConfirm,
  getRecurrenceDescription,
  isRecurringEnabled,
  setIsRecurringEnabled,
  recurrenceType,
  setRecurrenceType,
  intervalDays,
  setIntervalDays,
  creator,
  currentUser,
}: {
  description: string
  setDescription: React.Dispatch<React.SetStateAction<string>>
  dateRange: { from: Date; to?: Date; }
  setDateRange: React.Dispatch<React.SetStateAction<{ from: Date; to?: Date; }>>
  startTime: string
  setStartTime: React.Dispatch<React.SetStateAction<string>>
  endTime: string
  setEndTime: React.Dispatch<React.SetStateAction<string>>
  isEditMode: boolean
  isRecurringTask: boolean
  canStopRecurringTask: boolean
  isStoppingRecurring: boolean
  isDeleting: boolean
  isSubmitting: boolean
  setShowStopRecurringConfirm: React.Dispatch<React.SetStateAction<boolean>>
  getRecurrenceDescription: () => string
  isRecurringEnabled: boolean
  setIsRecurringEnabled: React.Dispatch<React.SetStateAction<boolean>>
  recurrenceType: TaskRecurrenceType
  setRecurrenceType: React.Dispatch<React.SetStateAction<TaskRecurrenceType>>
  intervalDays: number
  setIntervalDays: React.Dispatch<React.SetStateAction<number>>
  creator: User | null | undefined
  currentUser: User | null
}) {
  return (
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
          <Label className="text-sm font-medium">
            开始时间
          </Label>
          <TimePicker
            value={startTime}
            onChange={setStartTime}
            placeholder="选择时间（可选）"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            结束时间
          </Label>
          <TimePicker
            value={endTime}
            onChange={setEndTime}
            placeholder="选择时间（可选）"
          />
        </div>
      </div>

      {isEditMode ? (
        isRecurringTask ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="recurring-task-active" className="text-sm font-medium">
                定时任务
              </Label>
              <Switch
                id="recurring-task-active"
                checked
                disabled={!canStopRecurringTask || isStoppingRecurring || isDeleting || isSubmitting}
                onCheckedChange={(checked) => {
                  if (!checked && canStopRecurringTask) {
                    setShowStopRecurringConfirm(true)
                  }
                }}
              />
            </div>
            <div className="rounded-md border border-input bg-muted/20 px-3 py-3">
              <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                {getRecurrenceDescription()}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        修改当前事项不会影响后续定时任务；关闭后只会清理这一天之后的未来事项，当前事项和历史事项会保留。
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {!canStopRecurringTask && (
                <p className="mt-2 text-xs text-muted-foreground">
                  当前权限下不能终止这个定时任务。
                </p>
              )}
            </div>
          </div>
        ) : null
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="recurring-task" className="text-sm font-medium">
              定时任务
            </Label>
            <Switch
              id="recurring-task"
              checked={isRecurringEnabled}
              onCheckedChange={setIsRecurringEnabled}
            />
          </div>

          {isRecurringEnabled && (
            <div className="space-y-3 rounded-md border border-input bg-muted/20 p-3">
              <div
                className={cn(
                  "grid gap-3",
                  recurrenceType === "INTERVAL_DAYS"
                    ? "grid-cols-[minmax(0,1fr)_120px]"
                    : "grid-cols-1"
                )}
              >
                <div className="space-y-2">
                  <Label className="text-sm font-medium">重复方式</Label>
                  <Select
                    value={recurrenceType}
                    onValueChange={(value) => setRecurrenceType(value as TaskRecurrenceType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEKLY">按周提醒</SelectItem>
                      <SelectItem value="MONTHLY">按月提醒</SelectItem>
                      <SelectItem value="INTERVAL_DAYS">指定天数提醒</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recurrenceType === "INTERVAL_DAYS" && (
                  <div className="space-y-2">
                    <Label htmlFor="interval-days" className="text-sm font-medium">
                      间隔天数
                    </Label>
                    <Input
                      id="interval-days"
                      type="number"
                      min={1}
                      step={1}
                      value={intervalDays}
                      onChange={(e) => setIntervalDays(Math.max(1, Number(e.target.value) || 1))}
                      className="text-center"
                    />
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {getRecurrenceDescription()}
              </p>
            </div>
          )}
        </div>
      )}

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
  )
}
