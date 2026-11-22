import { describe, expect, it } from 'vitest'

import type { Task } from '@/lib/types'
import {
  assignTaskTracks,
  getMaxTrackForDate,
} from '@/lib/utils/task-layout'

function makeTask(overrides: Partial<Task> & Pick<Task, 'id'>): Task {
  const { id, ...rest } = overrides

  return {
    id,
    title: `任务 ${id}`,
    startDate: new Date(2026, 10, 20),
    endDate: new Date(2026, 10, 20),
    type: 'daily',
    progress: 0,
    projectId: 'project-1',
    creatorId: 'user-1',
    ...rest,
  }
}

describe('task-layout', () => {
  it('空数组返回空结果', () => {
    expect(assignTaskTracks([])).toEqual([])
    expect(getMaxTrackForDate([])).toBe(0)
  })

  it('不重叠的任务共用第 0 轨道', () => {
    const tasks = [
      makeTask({
        id: 'a',
        startDate: new Date(2026, 10, 16),
        endDate: new Date(2026, 10, 16),
      }),
      makeTask({
        id: 'b',
        startDate: new Date(2026, 10, 17),
        endDate: new Date(2026, 10, 17),
      }),
    ]

    const result = assignTaskTracks(tasks)
    expect(result.map((task) => task.track)).toEqual([0, 0])
    expect(getMaxTrackForDate(result)).toBe(1)
  })

  it('重叠任务分配到不同轨道', () => {
    const tasks = [
      makeTask({
        id: 'a',
        startDate: new Date(2026, 10, 16),
        endDate: new Date(2026, 10, 18),
      }),
      makeTask({
        id: 'b',
        startDate: new Date(2026, 10, 17),
        endDate: new Date(2026, 10, 19),
      }),
      makeTask({
        id: 'c',
        startDate: new Date(2026, 10, 18),
        endDate: new Date(2026, 10, 20),
      }),
    ]

    const result = assignTaskTracks(tasks)
    const tracks = Object.fromEntries(result.map((task) => [task.id, task.track]))

    expect(tracks.a).toBe(0)
    expect(tracks.b).toBe(1)
    expect(tracks.c).toBe(2)
    expect(getMaxTrackForDate(result)).toBe(3)
  })
})
