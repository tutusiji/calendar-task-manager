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

// PUT /api/teams/[id] - 更新团队
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id } = await params
    const body = await request.json()

    // 检查团队是否存在
    const existingTeam = await prisma.team.findUnique({
      where: { id },
      include: {
        members: true
      }
    })

    if (!existingTeam) {
      return notFoundResponse('团队不存在')
    }

    // 获取当前用户信息（检查是否是超级管理员）
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { isAdmin: true }
    })

    // 权限验证：只有创建者或超级管理员可以修改团队
    if (existingTeam.creatorId !== auth.userId && !currentUser?.isAdmin) {
      return forbiddenResponse('只有团队创建者或超级管理员可以修改团队')
    }

    const { name, description, color, memberIds, creatorId, taskPermission } = body

    // 验证必填字段
    if (name !== undefined && (!name || name.trim() === '')) {
      return validationErrorResponse('团队名称不能为空')
    }

    if (color !== undefined && (!color || color.trim() === '')) {
      return validationErrorResponse('团队颜色不能为空')
    }

    // 如果要更改创建者，验证新创建者存在
    if (creatorId !== undefined && creatorId !== existingTeam.creatorId) {
      const newCreator = await prisma.user.findUnique({
        where: { id: creatorId }
      })

      if (!newCreator) {
        return validationErrorResponse('新创建者不存在')
      }
    }

    // 准备更新数据
    const updateData: any = {}
    if (name !== undefined) updateData.name = sanitizeString(name, 200)
    if (description !== undefined) updateData.description = description ? sanitizeString(description, 2000) : null
    if (color !== undefined) updateData.color = color
    if (creatorId !== undefined) updateData.creatorId = creatorId
    if (taskPermission !== undefined) updateData.taskPermission = taskPermission // 更新任务权限

    // 处理成员更新
    if (memberIds !== undefined && Array.isArray(memberIds)) {
      const currentMemberIds = existingTeam.members.map((m: any) => m.userId)
      const newMemberIds = memberIds

      // 找出需要删除的成员
      const membersToRemove = currentMemberIds.filter((id: string) => !newMemberIds.includes(id))
      // 找出需要添加的成员
      const membersToAdd = newMemberIds.filter((id: string) => !currentMemberIds.includes(id))

      // 执行成员更新
      if (membersToRemove.length > 0) {
        await prisma.teamMember.deleteMany({
          where: {
            teamId: id,
            userId: {
              in: membersToRemove
            }
          }
        })
      }

      if (membersToAdd.length > 0) {
        await prisma.teamMember.createMany({
          data: membersToAdd.map((userId: string) => ({
            teamId: id,
            userId
          }))
        })
      }
    }

    // 更新团队
    const team = await prisma.team.update({
      where: { id },
      data: updateData,
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

    return successResponse(team, '团队更新成功')
  } catch (error) {
    console.error('Error updating team:', error)
    return serverErrorResponse('更新团队失败')
  }
}

// DELETE /api/teams/[id] - 删除团队
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id } = await params

    // 检查团队是否存在
    const existingTeam = await prisma.team.findUnique({
      where: { id }
    })

    if (!existingTeam) {
      return notFoundResponse('团队不存在')
    }

    // 获取当前用户信息（检查是否是超级管理员）
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { isAdmin: true }
    })

    // 权限验证：只有创建者或超级管理员可以删除团队
    if (existingTeam.creatorId !== auth.userId && !currentUser?.isAdmin) {
      return forbiddenResponse('只有团队创建者或超级管理员可以删除团队')
    }

    // 删除团队（会级联删除成员关系）
    await prisma.team.delete({
      where: { id }
    })

    return successResponse(null, '团队删除成功')
  } catch (error) {
    console.error('Error deleting team:', error)
    return serverErrorResponse('删除团队失败')
  }
}
