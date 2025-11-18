import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/admin/panorama/tasks - 获取事项列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // 'org' | 'team' | 'project' | 'member'
    const id = searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数" },
        { status: 400 }
      )
    }

    let tasks

    switch (type) {
      case 'org':
        tasks = await prisma.task.findMany({
          where: {
            OR: [
              { project: { organizationId: id } },
              { team: { organizationId: id } }
            ]
          },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            },
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true
                  }
                }
              }
            },
            project: {
              select: {
                id: true,
                name: true,
                color: true
              }
            },
            team: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          },
          orderBy: {
            startDate: 'desc'
          }
        })
        break

      case 'team':
        tasks = await prisma.task.findMany({
          where: {
            teamId: id
          },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            },
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true
                  }
                }
              }
            },
            project: {
              select: {
                id: true,
                name: true,
                color: true
              }
            },
            team: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          },
          orderBy: {
            startDate: 'desc'
          }
        })
        break

      case 'project':
        tasks = await prisma.task.findMany({
          where: {
            projectId: id
          },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            },
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true
                  }
                }
              }
            },
            project: {
              select: {
                id: true,
                name: true,
                color: true
              }
            },
            team: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          },
          orderBy: {
            startDate: 'desc'
          }
        })
        break

      case 'member':
        const orgId = searchParams.get('orgId')
        tasks = await prisma.task.findMany({
          where: {
            OR: [
              { creatorId: id },
              { assignees: { some: { userId: id } } }
            ],
            ...(orgId ? {
              OR: [
                { project: { organizationId: orgId } },
                { team: { organizationId: orgId } }
              ]
            } : {})
          },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            },
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true
                  }
                }
              }
            },
            project: {
              select: {
                id: true,
                name: true,
                color: true
              }
            },
            team: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          },
          orderBy: {
            startDate: 'desc'
          }
        })
        break

      default:
        return NextResponse.json(
          { success: false, error: "无效的类型参数" },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: tasks
    })
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json(
      { success: false, error: "获取事项列表失败" },
      { status: 500 }
    )
  }
}
