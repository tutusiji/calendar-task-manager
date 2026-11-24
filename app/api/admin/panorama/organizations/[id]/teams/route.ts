import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { countPanoramaTasksForPeople } from "@/lib/modules/task/panorama-task-count"
import { requirePanoramaAccess } from "@/lib/server/auth/require"

// GET /api/admin/panorama/organizations/[id]/teams - 获取组织的所有团队
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requirePanoramaAccess(request)
  if ("error" in access) return access.error

  try {
    const { id } = await params

    const teams = await prisma.team.findMany({
      where: {
        organizationId: id
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
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
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const teamsWithTaskCount = await Promise.all(
      teams.map(async (team) => {
        const memberIds = Array.from(
          new Set(team.members.map(member => member.userId))
        )

        const taskCount = await countPanoramaTasksForPeople(id, memberIds)

        return {
          ...team,
          _count: {
            tasks: taskCount
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: teamsWithTaskCount
    })
  } catch (error) {
    console.error("Error fetching teams:", error)
    return NextResponse.json(
      { success: false, error: "获取团队列表失败" },
      { status: 500 }
    )
  }
}
