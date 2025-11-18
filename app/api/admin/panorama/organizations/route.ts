import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/admin/panorama/organizations - 获取所有组织列表
export async function GET(request: NextRequest) {
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

    // 获取每个组织的事项数量
    const orgsWithTaskCount = await Promise.all(
      organizations.map(async (org) => {
        const taskCount = await prisma.task.count({
          where: {
            OR: [
              { project: { organizationId: org.id } },
              { team: { organizationId: org.id } }
            ]
          }
        })
        return {
          ...org,
          _count: {
            ...org._count,
            tasks: taskCount
          }
        }
      })
    )

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
