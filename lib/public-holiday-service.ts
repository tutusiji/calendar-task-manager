import { prisma } from "@/lib/prisma"

type PublicHolidaySeed = {
  code: string
  year: number
  name: string
  startDate: string
  endDate: string
}

const PUBLIC_HOLIDAY_SEEDS: PublicHolidaySeed[] = [
  { code: "2024-new-year", year: 2024, name: "元旦", startDate: "2024-01-01", endDate: "2024-01-01" },
  { code: "2024-spring-festival", year: 2024, name: "春节", startDate: "2024-02-10", endDate: "2024-02-17" },
  { code: "2024-qingming", year: 2024, name: "清明节", startDate: "2024-04-04", endDate: "2024-04-06" },
  { code: "2024-labor-day", year: 2024, name: "劳动节", startDate: "2024-05-01", endDate: "2024-05-05" },
  { code: "2024-dragon-boat", year: 2024, name: "端午节", startDate: "2024-06-10", endDate: "2024-06-10" },
  { code: "2024-mid-autumn", year: 2024, name: "中秋节", startDate: "2024-09-15", endDate: "2024-09-17" },
  { code: "2024-national-day", year: 2024, name: "国庆节", startDate: "2024-10-01", endDate: "2024-10-07" },

  { code: "2025-new-year", year: 2025, name: "元旦", startDate: "2025-01-01", endDate: "2025-01-01" },
  { code: "2025-spring-festival", year: 2025, name: "春节", startDate: "2025-01-28", endDate: "2025-02-04" },
  { code: "2025-qingming", year: 2025, name: "清明节", startDate: "2025-04-04", endDate: "2025-04-06" },
  { code: "2025-labor-day", year: 2025, name: "劳动节", startDate: "2025-05-01", endDate: "2025-05-05" },
  { code: "2025-dragon-boat", year: 2025, name: "端午节", startDate: "2025-05-31", endDate: "2025-06-02" },
  { code: "2025-national-mid-autumn", year: 2025, name: "国庆节、中秋节", startDate: "2025-10-01", endDate: "2025-10-08" },

  { code: "2026-new-year", year: 2026, name: "元旦", startDate: "2026-01-01", endDate: "2026-01-03" },
  { code: "2026-spring-festival", year: 2026, name: "春节", startDate: "2026-02-15", endDate: "2026-02-23" },
  { code: "2026-qingming", year: 2026, name: "清明节", startDate: "2026-04-04", endDate: "2026-04-06" },
  { code: "2026-labor-day", year: 2026, name: "劳动节", startDate: "2026-05-01", endDate: "2026-05-05" },
  { code: "2026-dragon-boat", year: 2026, name: "端午节", startDate: "2026-06-19", endDate: "2026-06-21" },
  { code: "2026-mid-autumn", year: 2026, name: "中秋节", startDate: "2026-09-25", endDate: "2026-09-27" },
  { code: "2026-national-day", year: 2026, name: "国庆节", startDate: "2026-10-01", endDate: "2026-10-07" },
]

let seedPromise: Promise<void> | null = null

function toHolidayDate(dateString: string) {
  return new Date(`${dateString}T12:00:00+08:00`)
}

export async function ensurePublicHolidaysSeeded() {
  if (!seedPromise) {
    seedPromise = (async () => {
      await prisma.$transaction(
        PUBLIC_HOLIDAY_SEEDS.map((holiday) =>
          prisma.publicHoliday.upsert({
            where: { code: holiday.code },
            update: {
              year: holiday.year,
              name: holiday.name,
              startDate: toHolidayDate(holiday.startDate),
              endDate: toHolidayDate(holiday.endDate),
            },
            create: {
              code: holiday.code,
              year: holiday.year,
              name: holiday.name,
              startDate: toHolidayDate(holiday.startDate),
              endDate: toHolidayDate(holiday.endDate),
            },
          })
        )
      )
    })().catch((error) => {
      seedPromise = null
      throw error
    })
  }

  await seedPromise
}

export async function getPublicHolidaysInRange(startDate?: Date, endDate?: Date) {
  const where =
    startDate && endDate
      ? {
          AND: [
            {
              startDate: {
                lte: endDate,
              },
            },
            {
              endDate: {
                gte: startDate,
              },
            },
          ],
        }
      : undefined

  return prisma.publicHoliday.findMany({
    where,
    orderBy: [
      { startDate: "asc" },
      { endDate: "asc" },
    ],
  })
}
