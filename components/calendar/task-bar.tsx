"use client"

import type React from "react"

import { useCalendarStore } from "@/lib/store/calendar-store"
import type { Task } from "@/lib/types"
import { cn } from "@/lib/utils"

interface TaskBarProps {
  task: Task
  date: Date
  track: number
}

export function TaskBar({ task, date, track }: TaskBarProps) {
  const { getProjectById, openTaskEdit, hideWeekends } = useCalendarStore()
  const project = getProjectById(task.projectId)

  // 计算两个日期之间的工作日天数（可选择是否跳过周末）
  const countDays = (startDate: Date, endDate: Date): number => {
    let count = 0
    const current = new Date(startDate)
    current.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(0, 0, 0, 0)
    
    while (current <= end) {
      const dayOfWeek = current.getDay()
      // 如果隐藏周末，则跳过周六(6)和周日(0)
      if (!hideWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
        count++
      }
      current.setDate(current.getDate() + 1)
    }
    return count
  }

  // 计算任务跨越的天数
  const calculateSpanDays = () => {
    const start = new Date(task.startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(task.endDate)
    end.setHours(0, 0, 0, 0)
    return countDays(start, end)
  }

  // 计算当前段显示的天数（考虑周截断和周末隐藏）
  const calculateDisplayDays = () => {
    const currentDate = new Date(date)
    currentDate.setHours(0, 0, 0, 0)
    const endDate = new Date(task.endDate)
    endDate.setHours(0, 0, 0, 0)
    
    // 计算当前日期是周几（0=周日, 1=周一, ..., 6=周六）
    const currentDayOfWeek = currentDate.getDay()
    const dayOfWeek = currentDayOfWeek === 0 ? 7 : currentDayOfWeek // 转换为1-7，周日=7
    
    // 计算到本周末还有多少天（包括今天）
    // 如果隐藏周末，则到周五结束；否则到周日结束
    const weekEndDay = hideWeekends ? 5 : 7 // 周五=5, 周日=7
    let daysUntilWeekEnd: number
    
    if (hideWeekends) {
      // 隐藏周末时，只计算到周五
      if (dayOfWeek <= 5) {
        daysUntilWeekEnd = 6 - dayOfWeek // 到周五的天数（包括今天）
      } else {
        // 如果已经是周末（不应该出现），返回0
        daysUntilWeekEnd = 0
      }
    } else {
      daysUntilWeekEnd = 8 - dayOfWeek // 到周日的天数
    }
    
    // 计算任务实际还剩多少天（考虑周末隐藏）
    const remainingDays = countDays(currentDate, endDate)
    
    // 返回较小值：要么到周末，要么到任务结束
    return Math.min(daysUntilWeekEnd, remainingDays)
  }

  // 判断是否是任务的开始日期
  const isTaskStart = () => {
    const currentDate = new Date(date)
    currentDate.setHours(0, 0, 0, 0)
    const startDate = new Date(task.startDate)
    startDate.setHours(0, 0, 0, 0)
    return currentDate.getTime() === startDate.getTime()
  }

  // 判断当前段是否包含任务的结束日期
  const isSegmentEnd = () => {
    const currentDate = new Date(date)
    currentDate.setHours(0, 0, 0, 0)
    const endDate = new Date(task.endDate)
    endDate.setHours(0, 0, 0, 0)
    
    const displayDays = calculateDisplayDays()
    const lastDisplayDate = new Date(currentDate)
    lastDisplayDate.setDate(lastDisplayDate.getDate() + displayDays - 1)
    
    // 检查任务结束日期是否在当前段的显示范围内
    return endDate.getTime() >= currentDate.getTime() && endDate.getTime() <= lastDisplayDate.getTime()
  }

  // 判断是否在周末（周日）截断
  const isWeekEndCut = () => {
    const displayDays = calculateDisplayDays()
    const currentDate = new Date(date)
    currentDate.setHours(0, 0, 0, 0)
    const lastDisplayDate = new Date(currentDate)
    lastDisplayDate.setDate(lastDisplayDate.getDate() + displayDays - 1)
    
    // 如果最后显示日期是周日，且任务还没结束，则截断
    return lastDisplayDate.getDay() === 0 && !isSegmentEnd()
  }

  const spanDays = calculateDisplayDays()
  const taskStart = isTaskStart()
  const segmentEnd = isSegmentEnd()
  const weekEndCut = isWeekEndCut()

  // 获取圆角样式
  const getRoundedClass = () => {
    // 情况1：任务在当前段开始且结束 → 两端圆角
    if (taskStart && segmentEnd) {
      return "rounded-full"
    }
    
    // 情况2：任务开始段，但会被周末截断 → 左圆角
    if (taskStart && weekEndCut) {
      return "rounded-l-full"
    }
    
    // 情况3：任务结束段（从之前周继续，这一段包含结束日期） → 右圆角
    if (!taskStart && segmentEnd) {
      return "rounded-r-full"
    }
    
    // 情况4：任务中间段（既不是开始也不包含结束） → 无圆角
    if (!taskStart && !segmentEnd) {
      return ""
    }
    
    // 其他情况默认两端圆角
    return "rounded-full"
  }

  const getTaskColor = () => {
    switch (task.type) {
      case "daily":
        return "bg-blue-500"
      case "meeting":
        return "bg-yellow-500"
      case "vacation":
        return "bg-red-500"
      default:
        return "bg-blue-500"
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering calendar day's drag creation
    openTaskEdit(task)
  }

  const TASK_HEIGHT = 24 // 任务条高度 (px)
  const TASK_GAP = 4 // 任务条间距 (px)

  return (
    <div
      onClick={handleClick}
      className={cn(
        "task-bar group absolute cursor-pointer px-2 py-1 text-xs font-medium text-white transition-all hover:opacity-90 hover:shadow-md",
        getTaskColor(),
        getRoundedClass(),
      )}
      style={{
        width: spanDays > 1 ? `calc(100% * ${spanDays} + 18px * ${spanDays - 1})` : '100%',
        top: `${track * (TASK_HEIGHT + TASK_GAP)}px`,
        height: `${TASK_HEIGHT}px`,
        zIndex: 10,
      }}
    >
      <div className="flex items-center gap-1 truncate">
        {task.startTime && <span className="text-[10px] opacity-90">{task.startTime}</span>}
        <span className="truncate">{task.title}</span>
      </div>
    </div>
  )
}
