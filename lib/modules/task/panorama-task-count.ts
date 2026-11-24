import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Instances may move projects or change assignees. Apply the scope before counting series.
const taskCount = Prisma.sql`(
  COUNT(*) FILTER (WHERE task."recurringSeriesId" IS NULL)
  + COUNT(DISTINCT task."recurringSeriesId")
)::int`

export async function countPanoramaTasksByOrganization(organizationIds: string[]) {
  if (organizationIds.length === 0) return new Map<string, number>()

  const counts = await prisma.$queryRaw<Array<{ id: string; count: number }>>`
    SELECT project."organizationId" AS id, ${taskCount} AS count
    FROM "Task" AS task
    JOIN "Project" AS project ON project.id = task."projectId"
    WHERE project."organizationId" IN (${Prisma.join(organizationIds)})
    GROUP BY project."organizationId"
  `
  return new Map(counts.map(({ id, count }) => [id, count]))
}

export async function countPanoramaTasksByProject(organizationId: string) {
  const counts = await prisma.$queryRaw<Array<{ id: string; count: number }>>`
    SELECT task."projectId" AS id, ${taskCount} AS count
    FROM "Task" AS task
    JOIN "Project" AS project ON project.id = task."projectId"
    WHERE project."organizationId" = ${organizationId}
    GROUP BY task."projectId"
  `
  return new Map(counts.map(({ id, count }) => [id, count]))
}

export async function countPanoramaTasksForPeople(organizationId: string, userIds: string[]) {
  if (userIds.length === 0) return 0

  const users = Prisma.join(userIds)
  const [result] = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT ${taskCount} AS count
    FROM "Task" AS task
    JOIN "Project" AS project ON project.id = task."projectId"
    WHERE project."organizationId" = ${organizationId}
      AND (
        task."creatorId" IN (${users})
        OR EXISTS (
          SELECT 1 FROM "TaskAssignee" AS assignee
          WHERE assignee."taskId" = task.id AND assignee."userId" IN (${users})
        )
      )
  `
  return result.count
}
