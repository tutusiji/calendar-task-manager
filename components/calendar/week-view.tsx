"use client"

import { useEffect, useState, useRef } from "react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { getWeekDays, getWeekDayName } from "@/lib/utils/date-utils"
import { TeamMemberRow } from "./team-member-row"

export function WeekView() {
  const { currentDate, users, dragState, cancelDragCreate, hideWeekends, dragMoveState, endDragMove } = useCalendarStore()
  const [showPlaceholder, setShowPlaceholder] = useState(false)
  const placeholderTimerRef = useRef<NodeJS.Timeout | null>(null)

  const weekDays = getWeekDays(currentDate, hideWeekends)

  // 全局 mouseup 事件处理，防止拖拽状态未清除
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState.isCreating) {
        // 如果在其他地方释放鼠标，取消拖拽
        cancelDragCreate()
      }
      if (dragMoveState.isMoving) {
        // 结束拖拽移动
        endDragMove()
        setShowPlaceholder(false)
        if (placeholderTimerRef.current) {
          clearTimeout(placeholderTimerRef.current)
          placeholderTimerRef.current = null
        }
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [dragState.isCreating, dragMoveState.isMoving, cancelDragCreate, endDragMove])

  // 监听 dragMoveState 变化，实现防抖逻辑
  useEffect(() => {
    // 清除之前的定时器
    if (placeholderTimerRef.current) {
      clearTimeout(placeholderTimerRef.current)
      placeholderTimerRef.current = null
    }

    if (dragMoveState.isMoving && dragMoveState.offsetDays !== 0) {
      // 如果正在拖拽且有偏移,200ms 后显示占位条
      placeholderTimerRef.current = setTimeout(() => {
        setShowPlaceholder(true)
      }, 0)
    } else {
      // 如果停止拖拽或回到原位，立即隐藏占位条
      setShowPlaceholder(false)
    }

    return () => {
      if (placeholderTimerRef.current) {
        clearTimeout(placeholderTimerRef.current)
      }
    }
  }, [dragMoveState.isMoving, dragMoveState.offsetDays])

  return (
    <div className="flex h-full flex-col">
      {/* Week day headers */}
      <div className="flex border-b border-border bg-muted/30">
        <div className="w-[120px] shrink-0 border-r border-border px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">团队成员</span>
        </div>
        <div className="flex flex-1">
          {weekDays.map((day, index) => (
            <div key={index} className="flex-1 border-r border-border px-4 py-3 text-center last:border-r-0">
              <div className="text-xs text-muted-foreground">{getWeekDayName(day.getDay())}</div>
              <div className="mt-1 text-sm font-medium text-foreground">{day.getDate()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Team member rows */}
      <div className="flex-1 overflow-y-auto">
        {users.map((user) => (
          <TeamMemberRow key={user.id} user={user} weekDays={weekDays} showPlaceholder={showPlaceholder} />
        ))}
      </div>
    </div>
  )
}
