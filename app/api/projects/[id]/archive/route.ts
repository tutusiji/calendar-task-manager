import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse
} from '@/lib/api-response'

// POST /api/projects/[id]/archive - 归档项目
export async function POST(
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
        organization: true
      }
    })

    if (!existingProject) {
      return notFoundResponse('项目不存在')
    }

    // 获取当前用户信息（检查是否是超级管理员）
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { isAdmin: true }
    })

    // 权限验证：项目创建者、组织创建者或超级管理员可以归档项目
    const isProjectCreator = existingProject.creatorId === auth.userId
    const isOrgCreator = existingProject.organization.creatorId === auth.userId
    const isAdmin = currentUser?.isAdmin

    if (!isProjectCreator && !isOrgCreator && !isAdmin) {
      return forbiddenResponse('只有项目创建者、组织创建者或超级管理员可以归档项目')
    }

    // 归档项目
    const project = await prisma.project.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date()
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

    return successResponse(project, '项目已归档')
  } catch (error) {
    console.error('Error archiving project:', error)
    return serverErrorResponse('归档项目失败')
  }
}

// DELETE /api/projects/[id]/archive - 取消归档项目
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
        organization: true
      }
    })

    if (!existingProject) {
      return notFoundResponse('项目不存在')
    }

    // 获取当前用户信息（检查是否是超级管理员）
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { isAdmin: true }
    })

    // 权限验证：项目创建者、组织创建者或超级管理员可以取消归档项目
    const isProjectCreator = existingProject.creatorId === auth.userId
    const isOrgCreator = existingProject.organization.creatorId === auth.userId
    const isAdmin = currentUser?.isAdmin

    if (!isProjectCreator && !isOrgCreator && !isAdmin) {
      return forbiddenResponse('只有项目创建者、组织创建者或超级管理员可以取消归档项目')
    }

    // 取消归档项目
    const project = await prisma.project.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null
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

    return successResponse(project, '项目已取消归档')
  } catch (error) {
    console.error('Error unarchiving project:', error)
    return serverErrorResponse('取消归档项目失败')
  }
}
