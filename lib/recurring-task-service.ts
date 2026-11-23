import { addDays, addWeeks, differenceInCalendarDays, differenceInCalendarMonths, endOfDay, startOfDay } from "date-fns"
import type { Prisma, RecurringTaskSeries } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import type { TaskRecurrenceType } from "@/lib/types"

export const DEFAULT_RECURRING_TASK_HORIZON_DAYS = 180

const BATCH_SIZE = 500
const MAX_BATCHES_PER_SERIES = 10
const backgroundRuns = new Map<string, { horizon: number; promise: Promise<void> }>()

export function getRecurringGenerationHorizon(
  ...dates: Array<Date | null | undefined>
): Date {
  // 按天取整，保证同一 organization/series 当天只生成一次，
  // 避免每次 GET 因 horizon 前进几秒而重复执行生成事务
  const defaultHorizon = startOfDay(
    addDays(new Date(), DEFAULT_RECURRING_TASK_HORIZON_DAYS)
  )
  let latest = defaultHorizon

  for (const date of dates) {
    if (date) {
      const candidate = startOfDay(date)
      if (candidate > latest) {
        latest = candidate
      }
    }
  }

  return latest
}

export function validateTaskRecurrenceConfig(input: {
  recurrenceType?: string
  intervalDays?: number | null
} | null | undefined) {
  if (!input) {
    return { valid: true as const }
  }

  const validTypes: TaskRecurrenceType[] = ["WEEKLY", "MONTHLY", "INTERVAL_DAYS"]
  if (!input.recurrenceType || !validTypes.includes(input.recurrenceType as TaskRecurrenceType)) {
    return { valid: false as const, message: "定时任务类型无效" }
  }

  if (input.recurrenceType === "INTERVAL_DAYS") {
    const intervalDays = Number(input.intervalDays)
    if (!Number.isInteger(intervalDays) || intervalDays <= 0) {
      return { valid: false as const, message: "指定天数提醒必须填写大于 0 的整数天数" }
    }
  }

  return { valid: true as const }
}

function getMonthlyOccurrenceDate(anchorDate: Date, occurrenceIndex: number) {
  const anchorDay = anchorDate.getDate()
  const monthStart = new Date(
    anchorDate.getFullYear(),
    anchorDate.getMonth() + occurrenceIndex,
    1,
    anchorDate.getHours(),
    anchorDate.getMinutes(),
    anchorDate.getSeconds(),
    anchorDate.getMilliseconds()
  )

  const lastDayOfMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0
  ).getDate()

  return new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    Math.min(anchorDay, lastDayOfMonth),
    anchorDate.getHours(),
    anchorDate.getMinutes(),
    anchorDate.getSeconds(),
    anchorDate.getMilliseconds()
  )
}

function getOccurrenceDate(series: RecurringTaskSeries, occurrenceIndex: number) {
  if (occurrenceIndex === 0) return new Date(series.startDate)

  switch (series.recurrenceType) {
    case "WEEKLY":
      return addWeeks(series.startDate, occurrenceIndex)
    case "MONTHLY":
      return getMonthlyOccurrenceDate(series.startDate, occurrenceIndex)
    case "INTERVAL_DAYS":
      return addDays(series.startDate, (series.intervalDays || 1) * occurrenceIndex)
    default:
      return new Date(series.startDate)
  }
}

function buildRecurringTaskPayload(series: RecurringTaskSeries, recurrenceDate: Date) {
  const durationDays = differenceInCalendarDays(series.endDate, series.startDate)

  return {
    title: series.title,
    description: series.description,
    startDate: recurrenceDate,
    endDate: addDays(recurrenceDate, durationDays),
    startTime: series.startTime,
    endTime: series.endTime,
    type: series.type,
    color: series.type === "daily" ? series.color : null,
    progress: series.progress,
    creatorId: series.creatorId,
    projectId: series.projectId,
    teamId: series.teamId,
    recurringSeriesId: series.id,
    recurrenceDate,
  }
}

function getFirstOccurrenceIndex(series: RecurringTaskSeries, cursor: Date | null) {
  if (!cursor || cursor < series.startDate) return 0
  const days = differenceInCalendarDays(cursor, series.startDate)
  const index = series.recurrenceType === "MONTHLY"
    ? differenceInCalendarMonths(cursor, series.startDate)
    : Math.floor(days / (series.recurrenceType === "WEEKLY" ? 7 : (series.intervalDays || 1)))
  return getOccurrenceDate(series, index) <= cursor ? index + 1 : index
}

async function generateRecurringBatch(seriesId: string, horizonEnd: Date) {
  return prisma.$transaction(async (tx) => {
    // Serialize generation and stop operations on the same series across processes.
    await tx.$queryRaw`SELECT id FROM "RecurringTaskSeries" WHERE id = ${seriesId} FOR UPDATE`
    const series = await tx.recurringTaskSeries.findUnique({ where: { id: seriesId } })
    if (!series) return false

    const effectiveEnd = series.stopsAfter && series.stopsAfter < horizonEnd
      ? series.stopsAfter
      : horizonEnd
    if (series.generatedUntil && series.generatedUntil >= effectiveEnd) return false

    const occurrenceDates: Date[] = []
    let index = getFirstOccurrenceIndex(series, series.generatedUntil)
    let next = getOccurrenceDate(series, index)
    while (next <= effectiveEnd && occurrenceDates.length < BATCH_SIZE) {
      occurrenceDates.push(next)
      index += 1
      next = getOccurrenceDate(series, index)
    }

    if (occurrenceDates.length > 0) {
      const tasks = await tx.task.createManyAndReturn({
        data: occurrenceDates.map((date) => buildRecurringTaskPayload(series, date)),
        skipDuplicates: true,
        select: { id: true },
      })
      const assignees = tasks.flatMap(({ id }) => series.assigneeIds.map((userId) => ({ taskId: id, userId })))
      if (assignees.length > 0) {
        await tx.taskAssignee.createMany({ data: assignees, skipDuplicates: true })
      }
    }

    const hasMore = next <= effectiveEnd
    await tx.recurringTaskSeries.update({
      where: { id: seriesId },
      data: { generatedUntil: hasMore ? occurrenceDates[occurrenceDates.length - 1] : effectiveEnd },
    })
    return hasMore
  }, { timeout: 15_000 })
}

async function generateRecurringTasksForSeries(seriesId: string, through: Date) {
  // Bound a single run; each committed batch advances the cursor for the next run.
  for (let batch = 0; batch < MAX_BATCHES_PER_SERIES; batch += 1) {
    if (!(await generateRecurringBatch(seriesId, through))) return true
  }
  return false
}

function seriesNeedingCoverage(organizationId: string, through: Date): Prisma.RecurringTaskSeriesWhereInput {
  return {
    project: { organizationId },
    startDate: { lte: through },
    AND: [
      { OR: [{ generatedUntil: null }, { generatedUntil: { lt: through } }] },
      { OR: [
        { generatedUntil: null },
        { stopsAfter: null },
        { stopsAfter: { gt: prisma.recurringTaskSeries.fields.generatedUntil } },
      ] },
    ],
  }
}

export async function hasPendingRecurringTasks(organizationId: string, through: Date) {
  return Boolean(await prisma.recurringTaskSeries.findFirst({
    where: seriesNeedingCoverage(organizationId, through),
    select: { id: true },
  }))
}

export async function ensureRecurringTasksGeneratedForOrganization(
  organizationId: string,
  requestedEnd?: Date
) {
  const baseline = endOfDay(getRecurringGenerationHorizon())
  const through = requestedEnd && requestedEnd > baseline ? requestedEnd : baseline
  const series = await prisma.recurringTaskSeries.findMany({
    where: seriesNeedingCoverage(organizationId, through),
    select: { id: true },
  })

  let complete = true
  for (const { id } of series) {
    if (!(await generateRecurringTasksForSeries(id, through))) complete = false
  }
  return complete
}

export function replenishRecurringTasksInBackground(organizationId: string) {
  const horizon = getRecurringGenerationHorizon().getTime()
  const previous = backgroundRuns.get(organizationId)
  if (previous?.horizon === horizon) return previous.promise

  if (backgroundRuns.size >= 256) {
    const oldest = backgroundRuns.keys().next().value
    if (oldest !== undefined) backgroundRuns.delete(oldest)
  }

  const run = {
    horizon,
    promise: ensureRecurringTasksGeneratedForOrganization(organizationId)
      .then((complete) => {
        if (!complete && backgroundRuns.get(organizationId) === run) backgroundRuns.delete(organizationId)
      })
      .catch((error) => {
        if (backgroundRuns.get(organizationId) === run) backgroundRuns.delete(organizationId)
        throw error
      }),
  }
  backgroundRuns.set(organizationId, run)
  return run.promise
}

export async function ensureRecurringTasksGeneratedForSeries(
  seriesId: string,
  minimumHorizonDate: Date,
) {
  await generateRecurringTasksForSeries(
    seriesId,
    endOfDay(getRecurringGenerationHorizon(minimumHorizonDate)),
  )
}