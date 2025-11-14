import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/teams - 获取团队列表
export async function GET() {
  try {
    const teams = await prisma.team.findMany({
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
        projects: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        _count: {
          select: {
            members: true,
            projects: true
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
    const { name, color, description, memberIds } = body

    if (!name || !color) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name and color are required'
        },
        { status: 400 }
      )
    }

    const team = await prisma.team.create({
      data: {
        name,
        color,
        description,
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
