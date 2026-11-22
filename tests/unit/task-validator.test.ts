import { describe, expect, it } from 'vitest'

import {
  normalizeAssigneeIds,
  parseCreateTaskInput,
  parseUpdateTaskInput,
  validateUpdateContent,
} from '@/lib/modules/task/task.validator'
import { TaskServiceError } from '@/lib/modules/task/task.types'

const validCreateBody = {
  title: '  测试任务  ',
  description: '  描述  ',
  startDate: '2026-11-20',
  endDate: '2026-11-21',
  startTime: '09:00',
  endTime: '18:00',
  type: 'daily',
  color: 'blue',
  progress: 120,
  projectId: 'project-1',
  userId: ['user-1', 'user-1', 'user-2'],
}

describe('task.validator', () => {
  it('解析并规范化创建参数', () => {
    const input = parseCreateTaskInput(validCreateBody)

    expect(input.title).toBe('测试任务')
    expect(input.description).toBe('描述')
    expect(input.progress).toBe(100)
    expect(input.assigneeIds).toEqual(['user-1', 'user-2'])
    expect(input.color).toBe('blue')
  })

  it('非日常任务颜色置空', () => {
    const input = parseCreateTaskInput({
      ...validCreateBody,
      type: 'meeting',
      color: 'red',
    })

    expect(input.color).toBeNull()
  })

  it('缺少必填字段时抛出 400', () => {
    expect(() =>
      parseCreateTaskInput({ ...validCreateBody, title: '' })
    ).toThrowError(TaskServiceError)
  })

  it('日期范围无效时抛出 400', () => {
    expect(() =>
      parseCreateTaskInput({
        ...validCreateBody,
        startDate: '2026-11-21',
        endDate: '2026-11-20',
      })
    ).toThrowError('开始日期不能晚于结束日期')
  })

  it('时间、类型、颜色、重复配置非法时抛出 400', () => {
    expect(() =>
      parseCreateTaskInput({ ...validCreateBody, startTime: '25:00' })
    ).toThrowError(TaskServiceError)

    expect(() =>
      parseCreateTaskInput({ ...validCreateBody, type: 'unknown' })
    ).toThrowError(TaskServiceError)

    expect(() =>
      parseCreateTaskInput({ ...validCreateBody, color: 'pink' })
    ).toThrowError(TaskServiceError)

    expect(() =>
      parseCreateTaskInput({
        ...validCreateBody,
        recurrence: { recurrenceType: 'INTERVAL_DAYS', intervalDays: 0 },
      })
    ).toThrowError(TaskServiceError)
  })

  it('规范化负责人列表', () => {
    expect(normalizeAssigneeIds('u1')).toEqual(['u1'])
    expect(normalizeAssigneeIds(['u1', 'u1', '', null])).toEqual(['u1'])
    expect(normalizeAssigneeIds(undefined)).toEqual([])
  })

  it('更新参数允许只传部分字段', () => {
    expect(parseUpdateTaskInput({ title: '新标题' })).toMatchObject({
      title: '新标题',
      projectId: undefined,
    })

    expect(() => parseUpdateTaskInput({ projectId: '  ' })).toThrowError(
      TaskServiceError
    )
  })

  it('canOnlyReassignProject 时跳过内容校验', () => {
    expect(() =>
      validateUpdateContent(
        { startTime: 'bad', type: 'unknown' as never },
        'daily',
        { skipContentValidation: true }
      )
    ).not.toThrow()
  })

  it('正常更新时校验日期、时间、类型和颜色', () => {
    expect(() =>
      validateUpdateContent(
        {
          startDate: '2026-11-21',
          endDate: '2026-11-20',
        },
        'daily',
        { skipContentValidation: false }
      )
    ).toThrowError(TaskServiceError)

    expect(() =>
      validateUpdateContent(
        { startTime: '25:00' },
        'daily',
        { skipContentValidation: false }
      )
    ).toThrowError(TaskServiceError)

    expect(() =>
      validateUpdateContent(
        { type: 'unknown' as never },
        'daily',
        { skipContentValidation: false }
      )
    ).toThrowError(TaskServiceError)

    expect(() =>
      validateUpdateContent(
        { color: 'pink' },
        'daily',
        { skipContentValidation: false }
      )
    ).toThrowError(TaskServiceError)
  })
})
