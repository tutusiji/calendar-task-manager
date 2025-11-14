import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/tasks/[id] - 获取单个任务
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const task = await prisma.task.findUnique({
      where: { id },
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
      }
    })

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: task
    })
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch task'
      },
      { status: 500 }
    )
  }
}

// PUT /api/tasks/[id] - 更新任务
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { title, description, startDate, endDate, startTime, endTime, type, userId, projectId } = body

    // 更新任务
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(type !== undefined && { type }),
        ...(userId !== undefined && { userId }),
        ...(projectId !== undefined && { projectId })
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

    return NextResponse.json({
      success: true,
      data: task
    })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update task'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/[id] - 删除任务
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.task.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete task'
      },
      { status: 500 }
    )
  }
}
