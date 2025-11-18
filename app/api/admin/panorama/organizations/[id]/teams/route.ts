import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/admin/panorama/organizations/[id]/teams - 获取组织的所有团队
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        },
        _count: {
          select: {
            tasks: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: teams
    })
  } catch (error) {
    console.error("Error fetching teams:", error)
    return NextResponse.json(
      { success: false, error: "获取团队列表失败" },
      { status: 500 }
    )
  }
}
