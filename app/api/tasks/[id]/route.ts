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
            color: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            color: true
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
      where: { id },
      include: {
        project: {
          include: {
            members: {
              select: {
                userId: true
              }
            }
          }
        },
        team: {
          include: {
            members: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    })

    if (!existingTask) {
      return notFoundResponse('任务不存在')
    }

    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { isAdmin: true }
    })

    // 协同权限验证：检查是否有权限修改任务
    let hasPermission = false
    
    // 1. 超级管理员拥有所有权限
    if (currentUser?.isAdmin) {
      hasPermission = true
    }
    // 2. 任务创建者始终有权限
    else if (existingTask.userId === auth.userId) {
      hasPermission = true
    }
    // 3. 检查项目的协同权限
    else if (existingTask.project) {
      const isMember = existingTask.project.members.some(m => m.userId === auth.userId)
      if (isMember && existingTask.project.taskPermission === 'ALL_MEMBERS') {
        hasPermission = true
      } else if (isMember && existingTask.project.creatorId === auth.userId) {
        hasPermission = true
      }
    }
    // 4. 检查团队的协同权限
    else if (existingTask.team) {
      const isMember = existingTask.team.members.some(m => m.userId === auth.userId)
      if (isMember && existingTask.team.taskPermission === 'ALL_MEMBERS') {
        hasPermission = true
      } else if (isMember && existingTask.team.creatorId === auth.userId) {
        hasPermission = true
      }
    }

    if (!hasPermission) {
      return forbiddenResponse('无权修改此任务。根据协同权限设置，只有任务创建者或拥有协同权限的成员可以修改任务')
    }

    const { title, description, startDate, endDate, startTime, endTime, type, projectId, teamId, userId } = body

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

    // 如果更改项目，验证项目访问权限并自动添加任务负责人为成员
    if (projectId && projectId !== existingTask.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          members: true
        }
      })

      if (!project) {
        return validationErrorResponse('目标项目不存在')
      }

      // 检查当前用户是否有权限访问目标项目
      const hasAccess = project.members.some(m => m.userId === auth.userId)
      if (!hasAccess) {
        return forbiddenResponse('无权访问目标项目')
      }

      // 确定任务的负责人（可能正在被修改）
      const taskUserId = userId !== undefined ? userId : existingTask.userId
      
      // 检查任务负责人是否在新项目中
      const userInProject = project.members.some(m => m.userId === taskUserId)
      if (!userInProject) {
        // 自动将任务负责人添加到新项目中
        await prisma.projectMember.create({
          data: {
            projectId,
            userId: taskUserId
          }
        })
      }
    }

    // 如果更改团队，自动添加任务负责人为团队成员
    if (teamId !== undefined && teamId !== null && teamId !== existingTask.teamId) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          members: true
        }
      })

      if (team) {
        // 确定任务的负责人（可能正在被修改）
        const taskUserId = userId !== undefined ? userId : existingTask.userId
        
        // 检查任务负责人是否在新团队中
        const userInTeam = team.members.some(m => m.userId === taskUserId)
        if (!userInTeam) {
          // 自动将任务负责人添加到新团队中
          await prisma.teamMember.create({
            data: {
              teamId,
              userId: taskUserId
            }
          })
        }
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
    if (teamId !== undefined) updateData.teamId = teamId || null // 支持更新teamId
    if (userId !== undefined) updateData.userId = userId // 支持更新负责人（协同权限）

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
        },
        team: {
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

    // 权限验证：只有任务负责人（userId）可以删除任务
    if (existingTask.userId !== auth.userId) {
      return forbiddenResponse('无权删除此任务，只有任务负责人可以删除')
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
