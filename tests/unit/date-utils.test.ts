import { describe, expect, it } from 'vitest'

import {
  formatDate,
  formatTime,
  getMonthDays,
  getMonthName,
  getWeekDays,
  isSameDay,
} from '@/lib/utils/date-utils'

describe('date-utils', () => {
  it('getWeekDays 返回周一到周日', () => {
    const wednesday = new Date(2026, 10, 18) // 2026-11-18 周三
    const days = getWeekDays(wednesday)

    expect(days).toHaveLength(7)
    expect(formatDate(days[0])).toBe('2026-11-16')
    expect(formatDate(days[6])).toBe('2026-11-22')
    expect(days[0].getDay()).toBe(1)
  })

  it('getWeekDays 隐藏周末时返回 5 天', () => {
    const days = getWeekDays(new Date(2026, 10, 18), true)
    expect(days).toHaveLength(5)
    expect(formatDate(days[4])).toBe('2026-11-20')
  })

  it('getMonthDays 返回完整的 6 周网格', () => {
    const days = getMonthDays(2026, 10) // 2026 年 11 月
    expect(days).toHaveLength(42)
    expect(days[0].getDay()).toBe(1)
    expect(days[41].getDay()).toBe(0)
  })

  it('isSameDay 只比较年月日', () => {
    expect(
      isSameDay(new Date(2026, 10, 20, 9, 0), new Date(2026, 10, 20, 23, 59))
    ).toBe(true)
    expect(isSameDay(new Date(2026, 10, 20), new Date(2026, 10, 21))).toBe(
      false
    )
  })

  it('formatDate/formatTime 补零', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(formatTime(new Date(2026, 0, 5, 9, 7))).toBe('09:07')
  })

  it('getMonthName 返回中文月份', () => {
    expect(getMonthName(0)).toBe('一月')
    expect(getMonthName(10)).toBe('十一月')
  })
})
