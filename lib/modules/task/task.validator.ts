import { validateTaskRecurrenceConfig } from '@/lib/recurring-task-service'
import {
  isValidTime,
  sanitizeString,
  validateDateRange,
  validateRequiredFields,
} from '@/lib/validation'

import type { CreateTaskInput, UpdateTaskInput } from './task.types'
import { TaskServiceError } from './task.types'

const VALID_TASK_TYPES = ['daily', 'meeting', 'vacation'] as const
const VALID_TASK_COLORS = ['blue', 'green', 'yellow', 'red', 'purple'] as const

export function normalizeAssigneeIds(value: unknown): string[] {
  if (value === undefined || value === null) return []

  const raw = Array.isArray(value) ? value : [value]
  return Array.from(
    new Set(
      raw.filter(
        (item): item is string => typeof item === 'string' && item.length > 0
      )
    )
  )
}

function clampProgress(progress: unknown): number {
  if (typeof progress !== 'number' || Number.isNaN(progress)) return 0
  return Math.max(0, Math.min(100, progress))
}

export function parseCreateTaskInput(body: any): CreateTaskInput {
  const requiredValidation = validateRequiredFields(body, [
    'title',
    'startDate',
    'endDate',
    'type',
    'projectId',
  ])
  if (!requiredValidation.valid) {
    throw new TaskServiceError(400, requiredValidation.message!)
  }

  if (typeof body.projectId !== 'string' || body.projectId.trim() === '') {
    throw new TaskServiceError(400, '必须选择一个项目')
  }

  const dateValidation = validateDateRange(body.startDate, body.endDate)
  if (!dateValidation.valid) {
    throw new TaskServiceError(400, dateValidation.message!)
  }

  if (body.startTime && !isValidTime(body.startTime)) {
    throw new TaskServiceError(400, '开始时间格式无效，应为 HH:MM')
  }

  if (body.endTime && !isValidTime(body.endTime)) {
    throw new TaskServiceError(400, '结束时间格式无效，应为 HH:MM')
  }

  if (!VALID_TASK_TYPES.includes(body.type)) {
    throw new TaskServiceError(
      400,
      `任务类型无效，必须是: ${VALID_TASK_TYPES.join(', ')}`
    )
  }

  if (
    body.type === 'daily' &&
    body.color &&
    !(VALID_TASK_COLORS as readonly string[]).includes(body.color)
  ) {
    throw new TaskServiceError(
      400,
      `颜色无效，必须是: ${VALID_TASK_COLORS.join(', ')}`
    )
  }

  const recurrenceValidation = validateTaskRecurrenceConfig(body.recurrence)
  if (!recurrenceValidation.valid) {
    throw new TaskServiceError(400, recurrenceValidation.message!)
  }

  return {
    title: sanitizeString(body.title, 200),
    description: body.description
      ? sanitizeString(body.description, 2000)
      : null,
    startDate: body.startDate,
    endDate: body.endDate,
    startTime: body.startTime || null,
    endTime: body.endTime || null,
    type: body.type,
    color: body.type === 'daily' ? body.color || null : null,
    progress: clampProgress(body.progress),
    projectId: body.projectId,
    teamId: body.teamId || null,
    assigneeIds: normalizeAssigneeIds(body.userId),
    recurrence: body.recurrence || null,
  }
}

export function parseUpdateTaskInput(body: any): UpdateTaskInput {
  if (
    body.projectId !== undefined &&
    (typeof body.projectId !== 'string' || body.projectId.trim() === '')
  ) {
    throw new TaskServiceError(400, '项目ID不能为空')
  }

  return {
    title:
      body.title !== undefined ? sanitizeString(body.title, 200) : undefined,
    description:
      body.description !== undefined
        ? body.description
          ? sanitizeString(body.description, 2000)
          : null
        : undefined,
    startDate: body.startDate,
    endDate: body.endDate,
    startTime: body.startTime,
    endTime: body.endTime,
    type: body.type,
    color: body.color,
    progress:
      body.progress !== undefined ? clampProgress(body.progress) : undefined,
    projectId: body.projectId,
    teamId: body.teamId,
    assigneeIds:
      body.userId !== undefined
        ? normalizeAssigneeIds(body.userId)
        : undefined,
  }
}

export function validateUpdateContent(
  input: UpdateTaskInput,
  existingTaskType: string,
  options: { skipContentValidation: boolean }
): void {
  if (options.skipContentValidation) return

  if (input.startDate && input.endDate) {
    const dateValidation = validateDateRange(input.startDate, input.endDate)
    if (!dateValidation.valid) {
      throw new TaskServiceError(400, dateValidation.message!)
    }
  }

  if (
    input.startTime !== undefined &&
    input.startTime !== null &&
    !isValidTime(input.startTime)
  ) {
    throw new TaskServiceError(400, '开始时间格式无效，应为 HH:MM')
  }

  if (
    input.endTime !== undefined &&
    input.endTime !== null &&
    !isValidTime(input.endTime)
  ) {
    throw new TaskServiceError(400, '结束时间格式无效，应为 HH:MM')
  }

  if (input.type) {
    if (!VALID_TASK_TYPES.includes(input.type)) {
      throw new TaskServiceError(
        400,
        `任务类型无效，必须是: ${VALID_TASK_TYPES.join(', ')}`
      )
    }
  }

  if (input.color !== undefined) {
    const taskType = input.type || existingTaskType
    if (
      taskType === 'daily' &&
      input.color &&
      !(VALID_TASK_COLORS as readonly string[]).includes(input.color)
    ) {
      throw new TaskServiceError(
        400,
        `颜色无效，必须是: ${VALID_TASK_COLORS.join(', ')}`
      )
    }
  }
}
