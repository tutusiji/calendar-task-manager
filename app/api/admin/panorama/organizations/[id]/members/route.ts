import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/admin/panorama/organizations/[id]/members - 获取组织的所有成员
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId: id
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            isAdmin: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 转换数据格式并添加事项统计
    const formattedMembers = await Promise.all(
      members.map(async (m) => {
        const taskCount = await prisma.task.count({
          where: {
            OR: [
              { creatorId: m.user.id },
              { assignees: { some: { userId: m.user.id } } }
            ],
            OR: [
              { project: { organizationId: id } },
              { team: { organizationId: id } }
            ]
          }
        })
        
        return {
          id: m.user.id,
          username: m.user.username,
          name: m.user.name,
          email: m.user.email,
          avatar: m.user.avatar,
          role: m.user.role || '未设置',
          isAdmin: m.user.isAdmin,
          createdAt: m.user.createdAt,
          orgRole: m.role,
          taskCount
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: formattedMembers
    })
  } catch (error) {
    console.error("Error fetching members:", error)
    return NextResponse.json(
      { success: false, error: "获取成员列表失败" },
      { status: 500 }
    )
  }
}
