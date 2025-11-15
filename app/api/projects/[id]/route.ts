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
import { sanitizeString } from '@/lib/validation'

// GET /api/projects/[id] - 获取单个项目
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id } = await params

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
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
        _count: {
          select: {
            tasks: true
          }
        }
      }
    })

    if (!project) {
      return notFoundResponse('项目不存在')
    }

    // 权限验证：只能查看自己参与的项目
    const isMember = project.members.some((m: any) => m.userId === auth.userId)
    if (!isMember) {
      return forbiddenResponse('无权查看此项目')
    }

    return successResponse(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    return serverErrorResponse('获取项目失败')
  }
}

// PUT /api/projects/[id] - 更新项目
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id } = await params
    const body = await request.json()

    // 检查项目是否存在
    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: {
        members: true
      }
    })

    if (!existingProject) {
      return notFoundResponse('项目不存在')
    }

    // 权限验证：只有创建者可以修改项目
    if (existingProject.creatorId !== auth.userId) {
      return forbiddenResponse('只有项目创建者可以修改项目')
    }

    const { name, description, color, teamId, memberIds, creatorId } = body

    // 验证必填字段
    if (name !== undefined && (!name || name.trim() === '')) {
      return validationErrorResponse('项目名称不能为空')
    }

    if (color !== undefined && (!color || color.trim() === '')) {
      return validationErrorResponse('项目颜色不能为空')
    }

    // 如果要更改创建者，验证权限（只有创建者可以转让）
    if (creatorId !== undefined && creatorId !== existingProject.creatorId) {
      // 验证新创建者存在
      const newCreator = await prisma.user.findUnique({
        where: { id: creatorId }
      })

      if (!newCreator) {
        return validationErrorResponse('新创建者不存在')
      }
    }

    // 如果提供了团队ID，验证团队存在且用户有权访问
    if (teamId !== undefined && teamId !== null) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          members: {
            where: { userId: auth.userId }
          }
        }
      })

      if (!team) {
        return validationErrorResponse('团队不存在')
      }

      if (team.members.length === 0) {
        return forbiddenResponse('您不是该团队成员')
      }
    }

    // 准备更新数据
    const updateData: any = {}
    if (name !== undefined) updateData.name = sanitizeString(name, 200)
    if (description !== undefined) updateData.description = description ? sanitizeString(description, 2000) : null
    if (color !== undefined) updateData.color = color
    if (teamId !== undefined) updateData.teamId = teamId
    if (creatorId !== undefined) updateData.creatorId = creatorId

    // 处理成员更新
    if (memberIds !== undefined && Array.isArray(memberIds)) {
      const currentMemberIds = existingProject.members.map((m: any) => m.userId)
      const newMemberIds = memberIds

      // 找出需要删除的成员
      const membersToRemove = currentMemberIds.filter((id: string) => !newMemberIds.includes(id))
      // 找出需要添加的成员
      const membersToAdd = newMemberIds.filter((id: string) => !currentMemberIds.includes(id))

      // 执行成员更新
      if (membersToRemove.length > 0) {
        await prisma.projectMember.deleteMany({
          where: {
            projectId: id,
            userId: {
              in: membersToRemove
            }
          }
        })
      }

      if (membersToAdd.length > 0) {
        await prisma.projectMember.createMany({
          data: membersToAdd.map(userId => ({
            projectId: id,
            userId
          }))
        })
      }
    }

    // 更新项目
    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
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

    return successResponse(project, '项目更新成功')
  } catch (error) {
    console.error('Error updating project:', error)
    return serverErrorResponse('更新项目失败')
  }
}

// DELETE /api/projects/[id] - 删除项目
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id } = await params

    // 检查项目是否存在
    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tasks: true
          }
        }
      }
    })

    if (!existingProject) {
      return notFoundResponse('项目不存在')
    }

    // 权限验证：只有创建者可以删除项目
    if (existingProject.creatorId !== auth.userId) {
      return forbiddenResponse('只有项目创建者可以删除项目')
    }

    // 检查是否有任务
    if (existingProject._count.tasks > 0) {
      return validationErrorResponse('该项目下还有任务，无法删除')
    }

    // 删除项目（会级联删除成员关系）
    await prisma.project.delete({
      where: { id }
    })

    return successResponse(null, '项目删除成功')
  } catch (error) {
    console.error('Error deleting project:', error)
    return serverErrorResponse('删除项目失败')
  }
}
