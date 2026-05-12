import { addDays, addWeeks, differenceInCalendarDays } from "date-fns"

import { prisma } from "@/lib/prisma"
import type { TaskRecurrenceType } from "@/lib/types"

export const DEFAULT_RECURRING_TASK_HORIZON_DAYS = 180

type RecurringTaskSeriesRecord = {
  id: string
  title: string
  description: string | null
  startDate: Date
  endDate: Date
  startTime: string | null
  endTime: string | null
  type: "daily" | "meeting" | "vacation"
  color: string | null
  progress: number
  recurrenceType: TaskRecurrenceType
  intervalDays: number | null
  assigneeIds: string[]
  creatorId: string
  projectId: string
  teamId: string | null
  generatedUntil: Date | null
  stopsAfter: Date | null
}

export function getRecurringGenerationHorizon(
  ...dates: Array<Date | null | undefined>
): Date {
  const defaultHorizon = addDays(new Date(), DEFAULT_RECURRING_TASK_HORIZON_DAYS)
  let latest = defaultHorizon

  for (const date of dates) {
    if (date && date > latest) {
      latest = date
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

function getOccurrenceDate(series: RecurringTaskSeriesRecord, occurrenceIndex: number) {
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

function buildRecurringTaskPayload(series: RecurringTaskSeriesRecord, recurrenceDate: Date) {
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
    assignees: {
      create: series.assigneeIds.map((userId) => ({
        userId,
      })),
    },
  }
}

async function generateRecurringTasksForSeries(
  series: RecurringTaskSeriesRecord,
  horizonEnd: Date
) {
  const effectiveHorizonEnd =
    series.stopsAfter && series.stopsAfter < horizonEnd
      ? series.stopsAfter
      : horizonEnd

  if (series.generatedUntil && series.generatedUntil >= effectiveHorizonEnd) {
    return
  }

  // Only extend beyond the last generated window so deleting one occurrence
  // won't cause older dates to be recreated the next time the horizon grows.
  const generationStartExclusive = series.generatedUntil
  const existingOccurrences = await prisma.task.findMany({
    where: {
      recurringSeriesId: series.id,
      recurrenceDate: {
        ...(generationStartExclusive
          ? { gt: generationStartExclusive }
          : {}),
        lte: effectiveHorizonEnd,
      },
    },
    select: {
      recurrenceDate: true,
    },
  })

  const existingOccurrenceSet = new Set(
    existingOccurrences
      .map((task) => task.recurrenceDate?.toISOString())
      .filter((value): value is string => !!value)
  )

  const occurrencesToCreate: Date[] = []
  for (let occurrenceIndex = 0; occurrenceIndex < 5000; occurrenceIndex += 1) {
    const occurrenceDate = getOccurrenceDate(series, occurrenceIndex)
    if (occurrenceDate > effectiveHorizonEnd) {
      break
    }
    if (generationStartExclusive && occurrenceDate <= generationStartExclusive) {
      continue
    }

    const occurrenceKey = occurrenceDate.toISOString()
    if (!existingOccurrenceSet.has(occurrenceKey)) {
      occurrencesToCreate.push(occurrenceDate)
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const occurrenceDate of occurrencesToCreate) {
      await tx.task.create({
        data: buildRecurringTaskPayload(series, occurrenceDate),
      })
    }

    await tx.recurringTaskSeries.update({
      where: { id: series.id },
      data: {
        generatedUntil: effectiveHorizonEnd,
      },
    })
  })
}

export async function ensureRecurringTasksGeneratedForOrganization(
  organizationId: string,
  horizonEnd?: Date
) {
  const effectiveHorizonEnd = getRecurringGenerationHorizon(horizonEnd)

  const seriesList = await prisma.recurringTaskSeries.findMany({
    where: {
      project: {
        organizationId,
      },
      OR: [
        { generatedUntil: null },
        { generatedUntil: { lt: effectiveHorizonEnd } },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      startDate: true,
      endDate: true,
      startTime: true,
      endTime: true,
      type: true,
      color: true,
      progress: true,
      recurrenceType: true,
      intervalDays: true,
      assigneeIds: true,
      creatorId: true,
      projectId: true,
      teamId: true,
      generatedUntil: true,
      stopsAfter: true,
    },
  })

  for (const series of seriesList) {
    await generateRecurringTasksForSeries(series, effectiveHorizonEnd)
  }
}

export async function ensureRecurringTasksGeneratedForSeries(
  seriesId: string,
  minimumHorizonDate?: Date
) {
  const series = await prisma.recurringTaskSeries.findUnique({
    where: { id: seriesId },
    select: {
      id: true,
      title: true,
      description: true,
      startDate: true,
      endDate: true,
      startTime: true,
      endTime: true,
      type: true,
      color: true,
      progress: true,
      recurrenceType: true,
      intervalDays: true,
      assigneeIds: true,
      creatorId: true,
      projectId: true,
      teamId: true,
      generatedUntil: true,
      stopsAfter: true,
    },
  })

  if (!series) {
    return
  }

  await generateRecurringTasksForSeries(
    series,
    getRecurringGenerationHorizon(minimumHorizonDate, series.startDate)
  )
}
