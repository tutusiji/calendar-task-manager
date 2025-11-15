"use client"

import { useEffect, useMemo } from "react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { getWeekDays, getWeekDayName } from "@/lib/utils/date-utils"
import { TeamMemberRow } from "./team-member-row"

export function WeekView() {
  const { 
    currentDate, 
    users, 
    dragState, 
    cancelDragCreate, 
    hideWeekends, 
    dragMoveState, 
    endDragMove,
    navigationMode,
    selectedTeamId,
    selectedProjectId,
    getTeamById,
    getProjectById,
  } = useCalendarStore()

  const weekDays = getWeekDays(currentDate, hideWeekends)
  
  // 调试: 打印周天数
  useEffect(() => {
    console.log('WeekView - hideWeekends:', hideWeekends, 'weekDays.length:', weekDays.length)
  }, [hideWeekends, weekDays.length])

  // 根据当前导航模式过滤要显示的用户
  const displayUsers = useMemo(() => {
    if (navigationMode === "team" && selectedTeamId) {
      const team = getTeamById(selectedTeamId)
      if (team) {
        return users.filter(user => team.memberIds.includes(user.id))
      }
    } else if (navigationMode === "project" && selectedProjectId) {
      const project = getProjectById(selectedProjectId)
      if (project) {
        return users.filter(user => project.memberIds.includes(user.id))
      }
    }
    
    // 默认显示所有用户
    return users
  }, [navigationMode, selectedTeamId, selectedProjectId, users, getTeamById, getProjectById])

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
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [dragState.isCreating, dragMoveState.isMoving, cancelDragCreate, endDragMove])

  return (
    <div className="flex h-full flex-col" key={`week-view-${hideWeekends ? 'workdays' : 'fullweek'}`}>
      {/* Week day headers */}
      <div className="flex border-b border-border bg-muted/30">
        <div className="w-[120px] shrink-0 border-r border-border px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">团队成员</span>
        </div>
        <div key={`week-days-${hideWeekends ? '5' : '7'}`} className="flex flex-1">
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
        {displayUsers.map((user) => (
          <TeamMemberRow key={user.id} user={user} weekDays={weekDays} showPlaceholder={false} />
        ))}
      </div>
    </div>
  )
}
