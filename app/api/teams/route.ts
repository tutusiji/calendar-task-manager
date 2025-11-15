import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'

// GET /api/teams - 获取当前用户可访问的团队列表
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    // 只获取用户是成员的团队
    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: auth.userId
          }
        }
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
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: teams
    })
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch teams'
      },
      { status: 500 }
    )
  }
}

// POST /api/teams - 创建团队
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

    const team = await prisma.team.create({
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
        data: team
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create team'
      },
      { status: 500 }
    )
  }
}
