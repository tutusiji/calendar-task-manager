import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/tasks - 获取任务列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // 查询参数
    const userId = searchParams.get('userId')
    const projectId = searchParams.get('projectId')
    const teamId = searchParams.get('teamId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // 构建查询条件
    const where: any = {}

    if (userId) {
      where.userId = userId
    }

    if (projectId) {
      where.projectId = projectId
    }

    if (teamId) {
      where.project = {
        teamId
      }
    }

    if (startDate && endDate) {
      where.OR = [
        {
          startDate: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        {
          endDate: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        {
          AND: [
            { startDate: { lte: new Date(startDate) } },
            { endDate: { gte: new Date(endDate) } }
          ]
        }
      ]
    }

    // 查询任务
    const tasks = await prisma.task.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            teamId: true
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: tasks,
      count: tasks.length
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tasks'
      },
      { status: 500 }
    )
  }
}

// POST /api/tasks - 创建任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { title, description, startDate, endDate, startTime, endTime, type, userId, projectId } = body

    // 验证必填字段
    if (!title || !startDate || !endDate || !type || !userId || !projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields'
        },
        { status: 400 }
      )
    }

    // 创建任务
    const task = await prisma.task.create({
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startTime,
        endTime,
        type,
        userId,
        projectId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    })

    return NextResponse.json(
      {
        success: true,
        data: task
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create task'
      },
      { status: 500 }
    )
  }
}
