import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'
import { listTeams } from '@/lib/modules/team/team.service'
import { addPointsForTeamCreation } from '@/lib/utils/points'


// GET /api/teams - 获取当前用户可访问的团队列表
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const organizationId = request.nextUrl.searchParams.get('organizationId')
    const result = await listTeams(auth.userId, organizationId)
    if (result.kind === 'forbidden') {
      return NextResponse.json({ success: false, error: '无权访问该组织的数据' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: result.teams })
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
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { name, color, description, memberIds, taskPermission } = body
    const creatorId = auth.userId

    if (!name || !color) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name and color are required'
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

    const organizationId = user.currentOrganizationId

    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: creatorId,
          organizationId,
        },
      },
      select: { id: true },
    })

    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          error: '您不是当前组织成员'
        },
        { status: 403 }
      )
    }

    const normalizedMemberIds: string[] = Array.isArray(memberIds)
      ? Array.from(
          new Set(
            memberIds.filter(
              (userId: unknown): userId is string =>
                typeof userId === 'string' && userId.length > 0
            )
          )
        )
      : []

    if (normalizedMemberIds.length > 0) {
      const validMembers = await prisma.organizationMember.findMany({
        where: {
          organizationId,
          userId: { in: normalizedMemberIds },
        },
        select: { userId: true },
      })

      if (validMembers.length !== normalizedMemberIds.length) {
        return NextResponse.json(
          {
            success: false,
            error: '团队成员必须属于当前组织'
          },
          { status: 400 }
        )
      }
    }

    if (
      taskPermission !== undefined &&
      taskPermission !== 'ALL_MEMBERS' &&
      taskPermission !== 'CREATOR_ONLY'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: '无效的任务权限'
        },
        { status: 400 }
      )
    }

    // 检查同组织内是否已存在同名团队
    const existingTeam = await prisma.team.findFirst({
      where: {
        organizationId,
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
        organizationId,
        creatorId, // 创建者始终来自认证上下文
        taskPermission: taskPermission || 'ALL_MEMBERS', // 设置任务权限，默认为所有成员
        members: normalizedMemberIds.length
          ? {
              create: normalizedMemberIds.map((userId: string) => ({
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

    try {
      await prisma.$executeRaw`
        UPDATE "Team"
        SET "sortOrder" = (
          SELECT COALESCE(MAX("sortOrder"), -1) + 1
          FROM "Team"
          WHERE "organizationId" = ${organizationId}
            AND id <> ${team.id}
        )
        WHERE id = ${team.id}
      `
    } catch (error) {
      console.warn('Failed to assign team sortOrder:', error)
    }

    // 创建团队获得积分（异步执行，不影响响应）
    addPointsForTeamCreation(creatorId).catch(error => {
      console.error('创建团队增加积分失败:', error)
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
