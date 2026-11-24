import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { countPanoramaTasksByOrganization } from "@/lib/modules/task/panorama-task-count"
import { requirePanoramaAccess } from "@/lib/server/auth/require"

// GET /api/admin/panorama/organizations - 获取所有组织列表
export async function GET(request: NextRequest) {
  const access = await requirePanoramaAccess(request)
  if ("error" in access) return access.error

  try {
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
            teams: true,
            projects: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const counts = await countPanoramaTasksByOrganization(organizations.map((org) => org.id))
    const orgsWithTaskCount = organizations.map((org) => ({
      ...org,
      _count: { ...org._count, tasks: counts.get(org.id) ?? 0 },
    }))

    return NextResponse.json({
      success: true,
      data: orgsWithTaskCount
    })
  } catch (error) {
    console.error("Error fetching organizations:", error)
    return NextResponse.json(
      { success: false, error: "获取组织列表失败" },
      { status: 500 }
    )
  }
}
