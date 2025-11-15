import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'

// GET /api/projects - 获取当前用户可访问的项目列表
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)

    // 只获取用户是成员的项目
    const where: any = {
      members: {
        some: {
          userId: auth.userId
        }
      }
    }

    const projects = await prisma.project.findMany({
      where,
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
            tasks: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: projects
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch projects'
      },
      { status: 500 }
    )
  }
}

// POST /api/projects - 创建项目
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, color, description, memberIds, creatorId } = body

    if (!name || !color) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name and color are required'
        },
        { status: 400 }
      )
    }

    if (!creatorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Creator ID is required'
        },
        { status: 400 }
      )
    }

    const project = await prisma.project.create({
      data: {
        name,
        color,
        description,
        creatorId, // 设置创建者
        members: memberIds
          ? {
              create: memberIds.map((userId: string) => ({
                userId
              }))
            }
          : undefined
      },
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
        }
      }
    })

    return NextResponse.json(
      {
        success: true,
        data: project
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create project'
      },
      { status: 500 }
    )
  }
}
