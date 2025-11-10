import type { Task } from "../types"

export interface TaskWithTrack extends Task {
  track: number
}

/**
 * 检查两个任务的日期范围是否重叠
 */
function doTasksOverlap(task1: Task, task2: Task): boolean {
  const start1 = new Date(task1.startDate)
  start1.setHours(0, 0, 0, 0)
  const end1 = new Date(task1.endDate)
  end1.setHours(23, 59, 59, 999)

  const start2 = new Date(task2.startDate)
  start2.setHours(0, 0, 0, 0)
  const end2 = new Date(task2.endDate)
  end2.setHours(23, 59, 59, 999)

  return start1 <= end2 && start2 <= end1
}

/**
 * 为任务分配轨道，确保重叠的任务在不同的轨道上
 * 改进的算法：任务在其整个日期范围内保持相同的轨道位置
 */
export function assignTaskTracks(tasks: Task[]): TaskWithTrack[] {
  if (tasks.length === 0) return []

  // 按开始日期排序，如果开始日期相同，按结束日期排序
  const sortedTasks = [...tasks].sort((a, b) => {
    const aStart = new Date(a.startDate).getTime()
    const bStart = new Date(b.startDate).getTime()
    if (aStart !== bStart) return aStart - bStart
    
    const aEnd = new Date(a.endDate).getTime()
    const bEnd = new Date(b.endDate).getTime()
    return aEnd - bEnd
  })

  const tasksWithTracks: TaskWithTrack[] = []
  
  for (const task of sortedTasks) {
    // 找到最低可用的轨道
    let track = 0
    let trackFound = false
    
    while (!trackFound) {
      // 检查当前轨道是否有与当前任务重叠的任务
      const conflictingTask = tasksWithTracks.find(
        t => t.track === track && doTasksOverlap(t, task)
      )
      
      if (!conflictingTask) {
        // 当前轨道没有重叠任务，可以使用
        trackFound = true
      } else {
        // 当前轨道有重叠，尝试下一个轨道
        track++
      }
    }
    
    tasksWithTracks.push({ ...task, track })
  }

  return tasksWithTracks
}

/**
 * 计算给定日期的最大轨道数（用于确定容器高度）
 */
export function getMaxTrackForDate(tasks: TaskWithTrack[]): number {
  if (tasks.length === 0) return 0
  return Math.max(...tasks.map(t => t.track)) + 1
}
