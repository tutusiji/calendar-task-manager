import { addDays, startOfDay } from 'date-fns'
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_RECURRING_TASK_HORIZON_DAYS,
  getRecurringGenerationHorizon,
  validateTaskRecurrenceConfig,
} from '@/lib/recurring-task-service'

describe('recurring-task-service', () => {
  it('默认 horizon 为 180 天后的当天 0 点', () => {
    const horizon = getRecurringGenerationHorizon()
    const expected = startOfDay(
      addDays(new Date(), DEFAULT_RECURRING_TASK_HORIZON_DAYS)
    )

    expect(DEFAULT_RECURRING_TASK_HORIZON_DAYS).toBe(180)
    expect(horizon.getTime()).toBe(expected.getTime())
    expect(horizon.getHours()).toBe(0)
  })

  it('传入更晚日期时取更晚的日期，并按天取整', () => {
    const laterDate = new Date(2030, 5, 15, 18, 30)
    const horizon = getRecurringGenerationHorizon(laterDate)

    expect(horizon.getTime()).toBe(new Date(2030, 5, 15).getTime())
  })

  it('传入更早日期时仍使用默认 horizon', () => {
    const earlierDate = new Date(2020, 0, 1, 12, 0)
    const horizon = getRecurringGenerationHorizon(earlierDate)
    const defaultHorizon = startOfDay(
      addDays(new Date(), DEFAULT_RECURRING_TASK_HORIZON_DAYS)
    )

    expect(horizon.getTime()).toBe(defaultHorizon.getTime())
  })

  it('校验合法的重复配置', () => {
    expect(validateTaskRecurrenceConfig(null)).toEqual({ valid: true })
    expect(
      validateTaskRecurrenceConfig({ recurrenceType: 'WEEKLY' })
    ).toEqual({ valid: true })
    expect(
      validateTaskRecurrenceConfig({ recurrenceType: 'MONTHLY' })
    ).toEqual({ valid: true })
    expect(
      validateTaskRecurrenceConfig({
        recurrenceType: 'INTERVAL_DAYS',
        intervalDays: 3,
      })
    ).toEqual({ valid: true })
  })

  it('拒绝无效的重复配置', () => {
    expect(
      validateTaskRecurrenceConfig({ recurrenceType: 'YEARLY' as never })
    ).toMatchObject({ valid: false })
    expect(
      validateTaskRecurrenceConfig({
        recurrenceType: 'INTERVAL_DAYS',
        intervalDays: 0,
      })
    ).toMatchObject({ valid: false })
    expect(
      validateTaskRecurrenceConfig({
        recurrenceType: 'INTERVAL_DAYS',
        intervalDays: 1.5,
      })
    ).toMatchObject({ valid: false })
  })
})
