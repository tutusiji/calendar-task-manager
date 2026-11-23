import { prisma } from "@/lib/prisma"

async function getOrderedProjectIds(organizationId: string) {
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "Project"
      WHERE "organizationId" = ${organizationId}
      ORDER BY "sortOrder" ASC, "createdAt" ASC, name ASC
    `
    return rows.map(row => row.id)
  } catch (error) {
    console.warn('Project sortOrder column is unavailable, falling back to createdAt order:', error)
    return null
  }
}

export async function getUserArchiveMap(userId: string, organizationId: string) {
  try {
    const rows = await prisma.$queryRaw<Array<{ projectId: string; isArchived: boolean; archivedAt: Date | null }>>`
      SELECT
        pm."projectId" AS "projectId",
        pm."isArchived" AS "isArchived",
        pm."archivedAt" AS "archivedAt"
      FROM "ProjectMember" pm
      INNER JOIN "Project" p ON p.id = pm."projectId"
      WHERE pm."userId" = ${userId}
        AND p."organizationId" = ${organizationId}
    `

    return new Map(
      rows.map((row) => [
        row.projectId,
        { isArchived: row.isArchived, archivedAt: row.archivedAt },
      ])
    )
  } catch (error) {
    console.warn('ProjectMember archive columns are unavailable, falling back to unarchived state:', error)
    return new Map<string, { isArchived: boolean; archivedAt: Date | null }>()
  }
}

export async function getUserArchiveState(userId: string, projectId: string) {
  try {
    const rows = await prisma.$queryRaw<Array<{ isArchived: boolean; archivedAt: Date | null }>>`
      SELECT
        pm."isArchived" AS "isArchived",
        pm."archivedAt" AS "archivedAt"
      FROM "ProjectMember" pm
      WHERE pm."userId" = ${userId}
        AND pm."projectId" = ${projectId}
      LIMIT 1
    `
    return rows[0] || { isArchived: false, archivedAt: null }
  } catch (error) {
    console.warn('ProjectMember archive columns are unavailable, falling back to unarchived state:', error)
    return { isArchived: false, archivedAt: null }
  }
}

export async function findOrganizationProjects(organizationId: string) {
  const orderedProjectIds = await getOrderedProjectIds(organizationId)
  const projects = await prisma.project.findMany({
    where: { organizationId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          }
        }
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true
        }
      },
      _count: {
        select: {
          members: true
        }
      }
    },
    orderBy: orderedProjectIds
      ? undefined
      : {
          createdAt: 'asc' // 按创建时间升序排序,新建项目总是在最后
        }
  })

  if (!orderedProjectIds) return projects
  const positions = new Map(orderedProjectIds.map((id, index) => [id, index]))
  return projects.sort((first, second) => (positions.get(first.id) ?? -1) - (positions.get(second.id) ?? -1))
}

export function findProjectIdentity(projectId: string) {
  return prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
}

export function setProjectMemberArchive(userId: string, projectId: string, archived: boolean) {
  return prisma.$executeRaw`
    UPDATE "ProjectMember"
    SET
      "isArchived" = ${archived},
      "archivedAt" = ${archived ? new Date() : null}
    WHERE "userId" = ${userId}
      AND "projectId" = ${projectId}
  `
}
