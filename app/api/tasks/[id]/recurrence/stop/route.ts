import { NextRequest } from 'next/server'

import {
  errorResponse,
  serverErrorResponse,
  successResponse,
} from '@/lib/api-response'
import { authenticate } from '@/lib/middleware'
import * as taskService from '@/lib/modules/task/task.service'
import { isTaskServiceError } from '@/lib/modules/task/task.types'

// POST /api/tasks/[id]/recurrence/stop - 终止后续定时任务
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request)
  if (auth.error) return auth.error

  try {
    const { id } = await params
    const result = await taskService.stopRecurringTask(
      { userId: auth.userId },
      id
    )

    return successResponse(result, '已终止后续定时任务')
  } catch (error) {
    if (isTaskServiceError(error)) {
      return errorResponse(error.message, error.status)
    }

    console.error('Error stopping recurring task series:', error)
    return serverErrorResponse('终止后续定时任务失败')
  }
}
