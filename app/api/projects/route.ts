import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'
import { addPointsForProjectCreation } from '@/lib/utils/points'

// GET /api/projects - 获取当前用户可访问的项目列表
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

    const { searchParams } = new URL(request.url)

    // 获取当前组织内的所有项目（供个人中心等场景使用）
    const where: any = {
      organizationId: user.currentOrganizationId,
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
      orderBy: {
        name: 'asc'
      }
    })

    // 格式化响应数据，包含成员详细信息
    const formattedProjects = projects.map(project => {
      const { members, _count, ...projectData } = project
      return {
        ...projectData,
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
    const body = await request.json()
    const { name, color, description, memberIds, creatorId, taskPermission } = body

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

    // 检查同组织内是否已存在同名项目
    const existingProject = await prisma.project.findFirst({
      where: {
        organizationId: user.currentOrganizationId,
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
        organizationId: user.currentOrganizationId,
        description,
        creatorId, // 设置创建者
        taskPermission: taskPermission || 'ALL_MEMBERS', // 设置任务权限，默认为所有成员
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
