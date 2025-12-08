import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// PUT /api/admin/panorama/organizations/[id] - 更新组织信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { name, isVerified } = await request.json()
    const { id } = await params

    // 检查组织是否存在
    const existingOrg = await prisma.organization.findUnique({
      where: { id }
    })

    if (!existingOrg) {
      return NextResponse.json(
        { success: false, error: "组织不存在" },
        { status: 404 }
      )
    }

    // 如果修改了名称，检查新名称是否已被使用
    if (name && name !== existingOrg.name) {
      const nameExists = await prisma.organization.findFirst({
        where: {
          name,
          id: { not: id }
        }
      })

      if (nameExists) {
        return NextResponse.json(
          { success: false, error: "组织名称已被使用" },
          { status: 400 }
        )
      }
    }

    // 更新组织
    const updatedOrg = await prisma.organization.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(isVerified !== undefined && { isVerified })
      },
      select: {
        id: true,
        name: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
            teams: true,
            projects: true,
          }
        }
      }
    })

    // 获取事项数量
    const taskCount = await prisma.task.count({
      where: {
        OR: [
          { project: { organizationId: id } },
          { team: { organizationId: id } }
        ]
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...updatedOrg,
        _count: {
          ...updatedOrg._count,
          tasks: taskCount
        }
      }
    })
  } catch (error) {
    console.error("Error updating organization:", error)
    return NextResponse.json(
      { success: false, error: "更新组织失败" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/panorama/organizations/[id] - 删除组织
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 检查组织是否存在
    const existingOrg = await prisma.organization.findUnique({
      where: { id }
    })

    if (!existingOrg) {
      return NextResponse.json(
        { success: false, error: "组织不存在" },
        { status: 404 }
      )
    }

    // 全景视图中的删除是强制删除,不检查是否有成员、团队或项目
    // Prisma schema 中的 onDelete: Cascade 会自动级联删除相关数据
    
    // 删除组织
    await prisma.organization.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: "组织已删除"
    })
  } catch (error) {
    console.error("Error deleting organization:", error)
    return NextResponse.json(
      { success: false, error: "删除组织失败" },
      { status: 500 }
    )
  }
}
