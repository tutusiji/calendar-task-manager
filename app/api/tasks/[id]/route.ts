import { NextRequest } from 'next/server'

import {
  errorResponse,
  serverErrorResponse,
  successResponse,
} from '@/lib/api-response'
import { authenticate } from '@/lib/middleware'
import * as taskService from '@/lib/modules/task/task.service'
import { isTaskServiceError } from '@/lib/modules/task/task.types'

function toErrorResponse(error: unknown, fallbackMessage: string) {
  if (isTaskServiceError(error)) {
    return errorResponse(error.message, error.status)
  }

  console.error(fallbackMessage, error)
  return serverErrorResponse(fallbackMessage)
}

// GET /api/tasks/[id] - 获取单个任务
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request)
  if (auth.error) return auth.error

  try {
    const { id } = await params
    const task = await taskService.getTask({ userId: auth.userId }, id)

    return successResponse(task)
  } catch (error) {
    return toErrorResponse(error, '获取任务失败')
  }
}

// PUT /api/tasks/[id] - 更新任务
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request)
  if (auth.error) return auth.error

  try {
    const { id } = await params
    const body = await request.json()
    const task = await taskService.updateTask(
      { userId: auth.userId },
      id,
      body
    )

    return successResponse(task, '任务更新成功')
  } catch (error) {
    return toErrorResponse(error, '更新任务失败')
  }
}

// DELETE /api/tasks/[id] - 删除任务
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request)
  if (auth.error) return auth.error

  try {
    const { id } = await params
    await taskService.deleteTask({ userId: auth.userId }, id)

    return successResponse(null, '任务删除成功')
  } catch (error) {
    return toErrorResponse(error, '删除任务失败')
  }
}
