import { prisma } from "@/lib/prisma"

async function getOrderedTeamIds(organizationId: string) {
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "Team"
      WHERE "organizationId" = ${organizationId}
      ORDER BY "sortOrder" ASC, name ASC, "createdAt" ASC
    `
    return rows.map(row => row.id)
  } catch (error) {
    console.warn('Team sortOrder column is unavailable, falling back to name order:', error)
    return null
  }
}

export async function findOrganizationTeams(organizationId: string) {
  const orderedTeamIds = await getOrderedTeamIds(organizationId)
  const teams = await prisma.team.findMany({
    where: {
      organizationId,
    },
    include: {
      organization: {
        select: {
          name: true
        }
      },
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
    orderBy: orderedTeamIds
      ? undefined
      : {
          name: 'asc'
        }
  })

  if (!orderedTeamIds) return teams
  const positions = new Map(orderedTeamIds.map((id, index) => [id, index]))
  return teams.sort((first, second) => (positions.get(first.id) ?? -1) - (positions.get(second.id) ?? -1))
}
