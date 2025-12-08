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
import { addPointsForTaskCreation } from '@/lib/utils/points'

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
    const organizationId = searchParams.get('organizationId')

    // 必须提供组织ID，或者用户必须有当前组织ID
    // 优先使用参数中的organizationId，如果没有则尝试使用用户的currentOrganizationId
    let targetOrgId = organizationId

    if (!targetOrgId) {
      const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { currentOrganizationId: true }
      })
      targetOrgId = user?.currentOrganizationId || null
    }

    if (!targetOrgId) {
      return validationErrorResponse('未指定组织ID')
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
      return validationErrorResponse('无权访问该组织的数据')
    }

    // 构建查询条件
    const where: any = {
      // 强制关联项目所属的组织
      project: {
        organizationId: targetOrgId
      }
    }

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
        // 如果用户不是团队成员，返回空数组而不是错误
        return successResponse([])
      }

      // 验证团队是否属于该组织
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { organizationId: true }
      })

      if (team?.organizationId !== targetOrgId) {
        return validationErrorResponse('团队不属于当前组织')
      }

      // 查询该团队的任务
      where.teamId = teamId
    } else if (projectId) {
      // 验证用户是否是项目成员
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId: auth.userId
        }
      })

      if (!projectMember) {
        // 如果用户不是项目成员，返回空数组
        return successResponse([])
      }

      // 查询该项目的任务
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true, organizationId: true }
      })

      if (project?.organizationId !== targetOrgId) {
        return validationErrorResponse('项目不属于当前组织')
      }
      
      where.projectId = projectId
      
      // 个人事务项目：只显示当前用户创建或负责的任务
      if (project?.name.includes('个人事务')) {
        where.OR = [
          { creatorId: auth.userId },
          { assignees: { some: { userId: auth.userId } } }
        ]
      }
    } else if (userId) {
      // 如果指定了 userId，检查是否是当前用户
      if (userId !== auth.userId) {
        // 检查是否在同一团队 (且在同一组织下)
        const isTeammate = await prisma.teamMember.findFirst({
          where: {
            userId: auth.userId,
            team: {
              organizationId: targetOrgId,
              members: {
                some: { userId }
              }
            }
          }
        })

        if (!isTeammate) {
           // 或者是同一项目的成员
           const isProjectMate = await prisma.projectMember.findFirst({
             where: {
               userId: auth.userId,
               project: {
                 organizationId: targetOrgId,
                 members: {
                    some: { userId }
                 }
               }
             }
           })
           
           if (!isProjectMate) {
              return validationErrorResponse('无权查看其他用户的任务')
           }
        }
      }
      // 查询该用户作为负责人的任务
      where.assignees = {
        some: { userId }
      }
    } else {
      // 如果未指定任何过滤条件，默认只查看当前用户负责的任务
      where.assignees = {
        some: { userId: auth.userId }
      }
    }

    // 日期范围过滤
    if (startDate && endDate) {
      // 验证日期格式
      if (!isValidDate(startDate) || !isValidDate(endDate)) {
        return validationErrorResponse('日期格式无效')
      }

      const dateFilter = {
        OR: [
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

      // 合并 AND 逻辑，避免覆盖上面可能存在的 OR
      if (where.OR) {
        where.AND = [
           dateFilter
        ]
      } else {
        Object.assign(where, dateFilter)
      }
    }

    // 查询任务
    const tasks = await prisma.task.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                email: true,
                avatar: true
              }
            }
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
    const { title, description, startDate, endDate, startTime, endTime, type, color, progress, projectId, teamId, userId } = body

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

    // 验证颜色（仅 daily 类型）
    const validColors = ['blue', 'green', 'yellow', 'red', 'purple']
    if (type === 'daily' && color && !validColors.includes(color)) {
      return validationErrorResponse(`颜色无效，必须是: ${validColors.join(', ')}`)
    }

    // 验证进度
    const taskProgress = Math.max(0, Math.min(100, progress || 0))

    // 验证项目访问权限
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true
      }
    })

    if (!project) {
      return validationErrorResponse('项目不存在')
    }

    // 检查当前用户是否有权限在该项目中创建任务
    const currentUserIsMember = project.members.some(m => m.userId === auth.userId)
    if (!currentUserIsMember) {
      return validationErrorResponse('无权在该项目中创建任务')
    }

    // 确定任务负责人列表(如果未指定则使用当前用户)
    const assigneeUserIds = userId ? (Array.isArray(userId) ? userId : [userId]) : [auth.userId]

    // 确保所有负责人都在项目中
    for (const assigneeId of assigneeUserIds) {
      const assigneeIsMember = project.members.some(m => m.userId === assigneeId)
      if (!assigneeIsMember) {
        // 自动将负责人添加到项目中
        await prisma.projectMember.create({
          data: {
            projectId,
            userId: assigneeId
          }
        })
      }
    }

    // 如果指定了团队,确保所有负责人都在团队中
    if (teamId) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          members: true
        }
      })

      if (team) {
        for (const assigneeId of assigneeUserIds) {
          const userInTeam = team.members.some(m => m.userId === assigneeId)
          if (!userInTeam) {
            // 自动将负责人添加到团队中
            await prisma.teamMember.create({
              data: {
                teamId,
                userId: assigneeId
              }
            })
          }
        }
      }
    }

    // 清理输入
    const cleanTitle = sanitizeString(title, 200)
    const cleanDescription = description ? sanitizeString(description, 2000) : null

    // 创建任务（使用事务确保一致性）
    const task = await prisma.task.create({
      data: {
        title: cleanTitle,
        description: cleanDescription,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startTime,
        endTime,
        type,
        color: type === 'daily' ? (color || null) : null,
        progress: taskProgress,
        creatorId: auth.userId, // 创建人是当前用户
        projectId,
        teamId: teamId || null, // 保存团队ID
        assignees: {
          create: assigneeUserIds.map(assigneeId => ({
            userId: assigneeId
          }))
        }
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                email: true,
                avatar: true
              }
            }
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

    // 创建任务获得积分（异步执行，不影响响应）
    addPointsForTaskCreation(auth.userId).catch(error => {
      console.error('创建任务增加积分失败:', error)
    })

    // 为所有非创建人的负责人发送通知
    const otherAssignees = assigneeUserIds.filter(id => id !== auth.userId)
    if (otherAssignees.length > 0) {
      // 获取创建者信息
      const creator = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { name: true }
      })

      if (creator) {
        // 为每个其他负责人创建通知
        await prisma.notification.createMany({
          data: otherAssignees.map(assigneeId => ({
            userId: assigneeId,
            type: 'TASK_ASSIGNED',
            title: '新任务分配',
            content: `${creator.name} 为您分配了新任务：${cleanTitle}`,
            metadata: {
              taskId: task.id,
              projectId: task.projectId,
              teamId: task.teamId,
              creatorId: auth.userId,
              creatorName: creator.name,
            }
          }))
        })
      }
    }

    return successResponse(task, '任务创建成功', 201)
  } catch (error) {
    console.error('Error creating task:', error)
    return serverErrorResponse('创建任务失败')
  }
}
