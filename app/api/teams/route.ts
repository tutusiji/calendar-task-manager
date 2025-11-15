import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'

// GET /api/teams - 获取当前用户可访问的团队列表
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    // 获取用户信息以获取当前组织
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { currentOrganizationId: true },
    })

    if (!user || !user.currentOrganizationId) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // 获取当前组织内的所有团队（供个人中心等场景使用）
    const teams = await prisma.team.findMany({
      where: {
        organizationId: user.currentOrganizationId,
      },
      include: {
        members: {
          select: {
            userId: true
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

    // 格式化响应数据，只返回必要字段
    const formattedTeams = teams.map(team => {
      const { members, ...teamData } = team
      return {
        ...teamData,
        memberIds: members.map(m => m.userId)
      }
    })

    return NextResponse.json({
      success: true,
      data: formattedTeams
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

    // 获取用户的当前组织
    const user = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { currentOrganizationId: true },
    })

    if (!user || !user.currentOrganizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User must be in an organization'
        },
        { status: 400 }
      )
    }

    // 检查同组织内是否已存在同名团队
    const existingTeam = await prisma.team.findFirst({
      where: {
        organizationId: user.currentOrganizationId,
        name: name
      }
    })

    if (existingTeam) {
      return NextResponse.json(
        {
          success: false,
          error: '该组织内已存在同名团队'
        },
        { status: 409 }
      )
    }

    const team = await prisma.team.create({
      data: {
        name,
        color,
        description,
        organizationId: user.currentOrganizationId,
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
