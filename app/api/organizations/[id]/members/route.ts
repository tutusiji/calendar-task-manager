import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/api-response"
import { authenticate } from "@/lib/middleware"

// GET /api/organizations/[id]/members - 获取组织成员列表
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const { id: organizationId } = await params

    // 验证用户是否是该组织的成员
    const currentMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: auth.userId,
          organizationId,
        },
      },
    })

    if (!currentMember) {
      return errorResponse("无权查看该组织成员", 403)
    }

    // 获取组织成员列表
    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        {
          role: 'asc', // OWNER, ADMIN, MEMBER
        },
        {
          createdAt: 'asc',
        },
      ],
    })

    // 格式化响应数据
    const formattedMembers = members.map(member => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      avatar: member.user.avatar,
      role: member.role,
      joinedAt: member.createdAt,
      inviter: member.inviter ? {
        id: member.inviter.id,
        name: member.inviter.name,
      } : null,
    }))

    return successResponse(formattedMembers)
  } catch (error) {
    console.error("获取组织成员失败:", error)
    return errorResponse("获取组织成员失败")
  }
}

// POST /api/organizations/[id]/members - 添加成员到组织
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const { id: organizationId } = await params
    const body = await req.json()
    const { userId, role = "MEMBER" } = body

    console.log("加入组织请求:", { organizationId, userId, currentUserId: auth.userId })

    // 情况1: 如果没有提供 userId，表示当前用户想要自己加入组织
    if (!userId) {
      // 验证组织是否存在
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      })

      if (!organization) {
        return errorResponse("组织不存在", 404)
      }

      // 检查用户是否已经是该组织的成员
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: auth.userId,
            organizationId,
          },
        },
      })

      if (existingMember) {
        return errorResponse("您已经是该组织的成员")
      }

      // 生成邀请码
      const generateInviteCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let code = ''
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return code
      }

      let memberInviteCode = generateInviteCode()
      let codeExists = await prisma.organizationMember.findFirst({
        where: { inviteCode: memberInviteCode },
      })
      while (codeExists) {
        memberInviteCode = generateInviteCode()
        codeExists = await prisma.organizationMember.findFirst({
          where: { inviteCode: memberInviteCode },
        })
      }

      // 添加当前用户为组织成员（自助加入，默认为 MEMBER 角色）
      const member = await prisma.organizationMember.create({
        data: {
          userId: auth.userId,
          organizationId,
          role: "MEMBER",
          inviteCode: memberInviteCode,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
        },
      })

      // 如果用户当前没有选择的组织，自动设置为新加入的组织
      const currentUser = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { currentOrganizationId: true },
      })

      if (!currentUser?.currentOrganizationId) {
        await prisma.user.update({
          where: { id: auth.userId },
          data: { currentOrganizationId: organizationId },
        })
      }

      return successResponse(member, "成功加入组织")
    }

    // 情况2: 管理员添加其他用户到组织
    // 检查当前用户是否有权限添加成员
    const currentMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: auth.userId,
          organizationId,
        },
      },
    })

    if (!currentMember || (currentMember.role !== "OWNER" && currentMember.role !== "ADMIN")) {
      return errorResponse("无权添加成员", 403)
    }

    // 检查目标用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!targetUser) {
      return errorResponse("目标用户不存在", 404)
    }

    // 检查用户是否已经是成员
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    })

    if (existingMember) {
      return errorResponse("用户已经是组织成员")
    }

    // 生成邀请码
    const generateInviteCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let code = ''
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return code
    }

    let memberInviteCode = generateInviteCode()
    let codeExists = await prisma.organizationMember.findFirst({
      where: { inviteCode: memberInviteCode },
    })
    while (codeExists) {
      memberInviteCode = generateInviteCode()
      codeExists = await prisma.organizationMember.findFirst({
        where: { inviteCode: memberInviteCode },
      })
    }

    // 添加成员
    const member = await prisma.organizationMember.create({
      data: {
        userId,
        organizationId,
        role,
        inviteCode: memberInviteCode,
        inviterId: auth.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    })

    return successResponse(member)
  } catch (error) {
    console.error("添加组织成员失败:", error)
    // 打印详细的错误信息
    if (error instanceof Error) {
      console.error("错误详情:", error.message)
      console.error("错误堆栈:", error.stack)
    }
    return errorResponse("添加组织成员失败")
  }
}

// DELETE /api/organizations/[id]/members - 移除组织成员
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const { id: organizationId } = await params
    const searchParams = req.nextUrl.searchParams
    const userId = searchParams.get("userId")

    if (!userId) {
      return errorResponse("用户ID不能为空")
    }

    // 情况1: 用户退出自己所在的组织
    if (userId === auth.userId) {
      const targetMember = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
      })

      if (!targetMember) {
        return errorResponse("您不是该组织的成员", 404)
      }

      if (targetMember.role === "OWNER") {
        return errorResponse("组织所有者不能退出，请先转让所有权或删除组织")
      }

      // 使用事务处理退出操作
      await prisma.$transaction(async (tx) => {
        // 1. 查找并删除该用户在该组织下的个人事务项目
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { name: true },
        })

        if (user) {
          const personalProjectName = `${user.name}的个人事务`
          
          // 查找个人事务项目
          const personalProject = await tx.project.findFirst({
            where: {
              name: personalProjectName,
              organizationId,
              creatorId: userId,
            },
          })

          if (personalProject) {
            // 删除项目相关的任务
            await tx.task.deleteMany({
              where: { projectId: personalProject.id },
            })

            // 删除项目成员关系
            await tx.projectMember.deleteMany({
              where: { projectId: personalProject.id },
            })

            // 删除项目
            await tx.project.delete({
              where: { id: personalProject.id },
            })
          }
        }

        // 2. 移除成员
        await tx.organizationMember.delete({
          where: {
            userId_organizationId: {
              userId,
              organizationId,
            },
          },
        })
      })

      // 如果退出的是当前组织，需要切换到其他组织或清空
      const currentUser = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { currentOrganizationId: true },
      })

      if (currentUser?.currentOrganizationId === organizationId) {
        // 查找用户的其他组织
        const otherOrg = await prisma.organizationMember.findFirst({
          where: {
            userId: auth.userId,
          },
          select: {
            organizationId: true,
          },
        })

        await prisma.user.update({
          where: { id: auth.userId },
          data: { currentOrganizationId: otherOrg?.organizationId || null },
        })
      }

      return successResponse({ message: "已退出组织" })
    }

    // 情况2: 管理员移除其他成员
    // 检查当前用户是否有权限移除成员
    const currentMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: auth.userId,
          organizationId,
        },
      },
    })

    if (!currentMember || (currentMember.role !== "OWNER" && currentMember.role !== "ADMIN")) {
      return errorResponse("无权移除成员", 403)
    }

    // 不能移除组织所有者
    const targetMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    })

    if (!targetMember) {
      return errorResponse("成员不存在", 404)
    }

    if (targetMember.role === "OWNER") {
      return errorResponse("不能移除组织所有者")
    }

    // 使用事务处理移除操作
    await prisma.$transaction(async (tx) => {
      // 1. 查找并删除该用户在该组织下的个人事务项目
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { name: true },
      })

      if (user) {
        const personalProjectName = `${user.name}的个人事务`
        
        // 查找个人事务项目
        const personalProject = await tx.project.findFirst({
          where: {
            name: personalProjectName,
            organizationId,
            creatorId: userId,
          },
        })

        if (personalProject) {
          // 删除项目相关的任务
          await tx.task.deleteMany({
            where: { projectId: personalProject.id },
          })

          // 删除项目成员关系
          await tx.projectMember.deleteMany({
            where: { projectId: personalProject.id },
          })

          // 删除项目
          await tx.project.delete({
            where: { id: personalProject.id },
          })
        }
      }

      // 2. 移除成员
      await tx.organizationMember.delete({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
      })

      // 3. 发送通知给被移除的成员
      const organization = await tx.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      })

      const remover = await tx.user.findUnique({
        where: { id: auth.userId },
        select: { name: true },
      })

      if (organization && remover) {
        await tx.notification.create({
          data: {
            userId,
            type: 'ORG_MEMBER_REMOVED',
            title: '已被移出组织',
            content: `${remover.name} 将你从组织【${organization.name}】中移除`,
            metadata: {
              organizationId,
              organizationName: organization.name,
              removedBy: auth.userId,
              removerName: remover.name,
            },
          },
        })
      }
    })

    return successResponse({ message: "成员已移除" })
  } catch (error) {
    console.error("移除组织成员失败:", error)
    return errorResponse("移除组织成员失败")
  }
}
