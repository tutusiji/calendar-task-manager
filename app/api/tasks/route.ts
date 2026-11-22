import { NextRequest } from 'next/server'

import {
  serverErrorResponse,
  successResponse,
  errorResponse,
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

// GET /api/tasks - 获取任务列表
export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)

  try {
    const result = await taskService.listTasks(
      { userId: auth.userId },
      {
        userId: searchParams.get('userId'),
        projectId: searchParams.get('projectId'),
        teamId: searchParams.get('teamId'),
        startDate: searchParams.get('startDate'),
        endDate: searchParams.get('endDate'),
        organizationId: searchParams.get('organizationId'),
      }
    )

    return successResponse(result)
  } catch (error) {
    return toErrorResponse(error, '获取任务列表失败')
  }
}

// POST /api/tasks - 创建任务
export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const task = await taskService.createTask({ userId: auth.userId }, body)

    return successResponse(task, '任务创建成功', 201)
  } catch (error) {
    return toErrorResponse(error, '创建任务失败')
  }
}
