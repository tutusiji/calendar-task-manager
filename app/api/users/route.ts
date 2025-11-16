import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'

// GET /api/users - 获取用户列表（同一组织内）
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    // 获取用户的当前组织
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { currentOrganizationId: true },
    })

    if (!user || !user.currentOrganizationId) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // 获取同一组织内的所有用户
    const users = await prisma.user.findMany({
      where: {
        organizationMembers: {
          some: {
            organizationId: user.currentOrganizationId
          }
        }
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        isAdmin: true,
        currentOrganizationId: true,
        createdAt: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: users
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch users'
      },
      { status: 500 }
    )
  }
}

// POST /api/users - 创建用户
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, avatar } = body

    if (!name || !email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name and email are required'
        },
        { status: 400 }
      )
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        avatar
      }
    })

    return NextResponse.json(
      {
        success: true,
        data: user
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create user'
      },
      { status: 500 }
    )
  }
}
