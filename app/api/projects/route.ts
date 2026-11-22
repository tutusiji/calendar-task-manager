import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'
import { addPointsForProjectCreation } from '@/lib/utils/points'

async function getOrderedProjectIds(organizationId: string) {
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "Project"
      WHERE "organizationId" = ${organizationId}
      ORDER BY "sortOrder" ASC, "createdAt" ASC, name ASC
    `
    return rows.map(row => row.id)
  } catch (error) {
    console.warn('Project sortOrder column is unavailable, falling back to createdAt order:', error)
    return null
  }
}

async function getUserArchiveMap(userId: string, organizationId: string) {
  try {
    const rows = await prisma.$queryRaw<Array<{ projectId: string; isArchived: boolean; archivedAt: Date | null }>>`
      SELECT
        pm."projectId" AS "projectId",
        pm."isArchived" AS "isArchived",
        pm."archivedAt" AS "archivedAt"
      FROM "ProjectMember" pm
      INNER JOIN "Project" p ON p.id = pm."projectId"
      WHERE pm."userId" = ${userId}
        AND p."organizationId" = ${organizationId}
    `

    return new Map(
      rows.map((row) => [
        row.projectId,
        { isArchived: row.isArchived, archivedAt: row.archivedAt },
      ])
    )
  } catch (error) {
    console.warn('ProjectMember archive columns are unavailable, falling back to unarchived state:', error)
    return new Map<string, { isArchived: boolean; archivedAt: Date | null }>()
  }
}

// GET /api/projects - 获取当前用户可访问的项目列表
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    let targetOrgId = organizationId

    if (!targetOrgId) {
       // 获取用户信息以获取当前组织
       const user = await prisma.user.findUnique({
         where: { id: auth.userId },
         select: { currentOrganizationId: true },
       })
       targetOrgId = user?.currentOrganizationId || null
    }

    if (!targetOrgId) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // 验证某些用户是否有权限访问该组织
    const isMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: auth.userId,
          organizationId: targetOrgId
        }
      }
    })

    if (!isMember) {
      return NextResponse.json({
          success: false,
          error: '无权访问该组织的数据'
      }, { status: 403 })
    }

    const orderedProjectIds = await getOrderedProjectIds(targetOrgId)

    // 获取当前组织内的所有项目（供个人中心等场景使用）
    const where: any = {
      organizationId: targetOrgId,
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
            members: true
          }
        }
      },
      orderBy: orderedProjectIds
        ? undefined
        : {
            createdAt: 'asc' // 按创建时间升序排序,新建项目总是在最后
          }
    })

    const orderedProjects = orderedProjectIds
      ? [...projects].sort((a, b) => orderedProjectIds.indexOf(a.id) - orderedProjectIds.indexOf(b.id))
      : projects

    const archiveMap = await getUserArchiveMap(auth.userId, targetOrgId)

    // 格式化响应数据，包含成员详细信息
    const formattedProjects = orderedProjects.map(project => {
      const { members, _count, ...projectData } = project
      const archiveMeta = archiveMap.get(project.id)
      return {
        ...projectData,
        // 成员维度归档：只返回当前登录用户自己的归档标记
        isArchived: archiveMeta?.isArchived || false,
        archivedAt: archiveMeta?.archivedAt || null,
        memberIds: members.map(m => m.userId),
        members: members.map(m => m.user),
        memberCount: _count.members
      }
    })

    return NextResponse.json({
      success: true,
      data: formattedProjects
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
            error: '项目成员必须属于当前组织'
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

    // 检查同组织内是否已存在同名项目
    const existingProject = await prisma.project.findFirst({
      where: {
        organizationId,
        name: name
      }
    })

    if (existingProject) {
      return NextResponse.json(
        {
          success: false,
          error: '该组织内已存在同名项目'
        },
        { status: 409 }
      )
    }

    const project = await prisma.project.create({
      data: {
        name,
        color,
        organizationId,
        description,
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
        UPDATE "Project"
        SET "sortOrder" = (
          SELECT COALESCE(MAX("sortOrder"), -1) + 1
          FROM "Project"
          WHERE "organizationId" = ${organizationId}
            AND id <> ${project.id}
        )
        WHERE id = ${project.id}
      `
    } catch (error) {
      console.warn('Failed to assign project sortOrder:', error)
    }

    // 创建项目获得积分（异步执行，不影响响应）
    addPointsForProjectCreation(creatorId).catch(error => {
      console.error('创建项目增加积分失败:', error)
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
