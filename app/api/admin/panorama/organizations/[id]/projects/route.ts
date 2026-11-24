import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { countPanoramaTasksByProject } from "@/lib/modules/task/panorama-task-count"
import { requirePanoramaAccess } from "@/lib/server/auth/require"

// GET /api/admin/panorama/organizations/[id]/projects - 获取组织的所有项目
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requirePanoramaAccess(request)
  if ("error" in access) return access.error

  try {
    const { id } = await params

    const projects = await prisma.project.findMany({
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

    const counts = await countPanoramaTasksByProject(id)

    return NextResponse.json({
      success: true,
      data: projects.map((project) => ({
        ...project,
        _count: { tasks: counts.get(project.id) ?? 0 },
      }))
    })
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json(
      { success: false, error: "获取项目列表失败" },
      { status: 500 }
    )
  }
}
