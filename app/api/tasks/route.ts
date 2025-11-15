import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'
import {
  successResponse,
  validationErrorResponse,
  serverErrorResponse
} from '@/lib/api-response'
import {
  validateRequiredFields,
  validateDateRange,
  isValidDate,
  isValidTime,
  sanitizeString
} from '@/lib/validation'

// GET /api/tasks - 获取任务列表
export async function GET(request: NextRequest) {
  try {
    // 认证检查
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    
    // 查询参数
    const userId = searchParams.get('userId')
    const projectId = searchParams.get('projectId')
    const teamId = searchParams.get('teamId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // 构建查询条件
    const where: any = {}

    // 权限验证和查询逻辑
    if (teamId) {
      // 验证用户是否是团队成员
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          teamId,
          userId: auth.userId
        }
      })

      if (!teamMember) {
        return validationErrorResponse('无权访问该团队的任务')
      }

      // 查询该团队下所有项目的任务（不限制userId）
      where.project = {
        teamId
      }
    } else if (projectId) {
      // 验证用户是否是项目成员
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId: auth.userId
        }
      })

      if (!projectMember) {
        return validationErrorResponse('无权访问该项目的任务')
      }

      // 查询该项目的所有任务（不限制userId）
      where.projectId = projectId
    } else if (userId) {
      // 如果指定了 userId，检查是否是当前用户
      if (userId !== auth.userId) {
        // 检查是否在同一团队
        const isTeammate = await prisma.teamMember.findFirst({
          where: {
            userId: auth.userId,
            team: {
              members: {
                some: { userId }
              }
            }
          }
        })

        if (!isTeammate) {
          return validationErrorResponse('无权查看其他用户的任务')
        }
      }
      where.userId = userId
    } else {
      // 如果未指定任何过滤条件，默认只查看当前用户的任务
      where.userId = auth.userId
    }

    // 日期范围过滤
    if (startDate && endDate) {
      // 验证日期格式
      if (!isValidDate(startDate) || !isValidDate(endDate)) {
        return validationErrorResponse('日期格式无效')
      }

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
      },
      orderBy: {
        startDate: 'asc'
      }
    })

    return successResponse({
      tasks,
      count: tasks.length
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return serverErrorResponse('获取任务列表失败')
  }
}

// POST /api/tasks - 创建任务
export async function POST(request: NextRequest) {
  try {
    // 认证检查
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { title, description, startDate, endDate, startTime, endTime, type, projectId } = body

    // 验证必填字段
    const requiredValidation = validateRequiredFields(body, [
      'title',
      'startDate',
      'endDate',
      'type',
      'projectId'
    ])
    if (!requiredValidation.valid) {
      return validationErrorResponse(requiredValidation.message!)
    }

    // 特别验证项目ID
    if (!projectId || projectId.trim() === '') {
      return validationErrorResponse('必须选择一个项目')
    }

    // 验证日期范围
    const dateValidation = validateDateRange(startDate, endDate)
    if (!dateValidation.valid) {
      return validationErrorResponse(dateValidation.message!)
    }

    // 验证时间格式（如果提供）
    if (startTime && !isValidTime(startTime)) {
      return validationErrorResponse('开始时间格式无效，应为 HH:MM')
    }

    if (endTime && !isValidTime(endTime)) {
      return validationErrorResponse('结束时间格式无效，应为 HH:MM')
    }

    // 验证任务类型
    const validTypes = ['daily', 'meeting', 'vacation']
    if (!validTypes.includes(type)) {
      return validationErrorResponse(`任务类型无效，必须是: ${validTypes.join(', ')}`)
    }

    // 验证项目访问权限
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: auth.userId }
        }
      }
    })

    if (!project) {
      return validationErrorResponse('项目不存在')
    }

    if (project.members.length === 0) {
      return validationErrorResponse('无权在该项目中创建任务')
    }

    // 清理输入
    const cleanTitle = sanitizeString(title, 200)
    const cleanDescription = description ? sanitizeString(description, 2000) : null

    // 创建任务（使用当前用户作为任务所有者）
    const task = await prisma.task.create({
      data: {
        title: cleanTitle,
        description: cleanDescription,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startTime,
        endTime,
        type,
        userId: auth.userId, // 使用认证用户的 ID
        projectId
      },
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

    return successResponse(task, '任务创建成功', 201)
  } catch (error) {
    console.error('Error creating task:', error)
    return serverErrorResponse('创建任务失败')
  }
}
