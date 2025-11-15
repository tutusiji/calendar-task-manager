import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  validationErrorResponse,
  serverErrorResponse
} from '@/lib/api-response'
import {
  validateDateRange,
  isValidTime,
  sanitizeString
} from '@/lib/validation'

// GET /api/tasks/[id] - 获取单个任务
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 认证检查
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id } = await params

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
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
      return notFoundResponse('任务不存在')
    }

    // 权限验证：只能查看自己的任务或团队成员的任务
    if (task.userId !== auth.userId) {
      // 检查是否是同一团队成员
      const isTeammate = await prisma.teamMember.findFirst({
        where: {
          userId: auth.userId,
          team: {
            projects: {
              some: {
                id: task.projectId
              }
            }
          }
        }
      })

      if (!isTeammate) {
        return forbiddenResponse('无权查看此任务')
      }
    }

    return successResponse(task)
  } catch (error) {
    console.error('Error fetching task:', error)
    return serverErrorResponse('获取任务失败')
  }
}

// PUT /api/tasks/[id] - 更新任务
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 认证检查
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id } = await params
    const body = await request.json()

    // 检查任务是否存在
    const existingTask = await prisma.task.findUnique({
      where: { id }
    })

    if (!existingTask) {
      return notFoundResponse('任务不存在')
    }

    // 权限验证：只能修改自己的任务
    if (existingTask.userId !== auth.userId) {
      return forbiddenResponse('无权修改此任务')
    }

    const { title, description, startDate, endDate, startTime, endTime, type, projectId } = body

    // 特别验证项目ID（如果提供）
    if (projectId !== undefined && (!projectId || projectId.trim() === '')) {
      return validationErrorResponse('项目ID不能为空')
    }

    // 验证日期范围（如果都提供）
    if (startDate && endDate) {
      const dateValidation = validateDateRange(startDate, endDate)
      if (!dateValidation.valid) {
        return validationErrorResponse(dateValidation.message!)
      }
    }

    // 验证时间格式（如果提供）
    if (startTime !== undefined && startTime !== null && !isValidTime(startTime)) {
      return validationErrorResponse('开始时间格式无效，应为 HH:MM')
    }

    if (endTime !== undefined && endTime !== null && !isValidTime(endTime)) {
      return validationErrorResponse('结束时间格式无效，应为 HH:MM')
    }

    // 验证任务类型（如果提供）
    if (type) {
      const validTypes = ['daily', 'meeting', 'vacation']
      if (!validTypes.includes(type)) {
        return validationErrorResponse(`任务类型无效，必须是: ${validTypes.join(', ')}`)
      }
    }

    // 如果更改项目，验证项目访问权限
    if (projectId && projectId !== existingTask.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          members: {
            where: { userId: auth.userId }
          }
        }
      })

      if (!project) {
        return validationErrorResponse('目标项目不存在')
      }

      if (project.members.length === 0) {
        return forbiddenResponse('无权访问目标项目')
      }
    }

    // 清理输入
    const updateData: any = {}
    if (title !== undefined) updateData.title = sanitizeString(title, 200)
    if (description !== undefined) updateData.description = description ? sanitizeString(description, 2000) : null
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = new Date(endDate)
    if (startTime !== undefined) updateData.startTime = startTime
    if (endTime !== undefined) updateData.endTime = endTime
    if (type !== undefined) updateData.type = type
    if (projectId !== undefined) updateData.projectId = projectId

    // 更新任务
    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
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

    return successResponse(task, '任务更新成功')
  } catch (error) {
    console.error('Error updating task:', error)
    return serverErrorResponse('更新任务失败')
  }
}

// DELETE /api/tasks/[id] - 删除任务
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 认证检查
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id } = await params

    // 检查任务是否存在
    const existingTask = await prisma.task.findUnique({
      where: { id }
    })

    if (!existingTask) {
      return notFoundResponse('任务不存在')
    }

    // 权限验证：只能删除自己的任务
    if (existingTask.userId !== auth.userId) {
      return forbiddenResponse('无权删除此任务')
    }

    // 删除任务
    await prisma.task.delete({
      where: { id }
    })

    return successResponse(null, '任务删除成功')
  } catch (error) {
    console.error('Error deleting task:', error)
    return serverErrorResponse('删除任务失败')
  }
}
