import { NextRequest } from 'next/server'

import { errorResponse, serverErrorResponse, successResponse } from '@/lib/api-response'
import { authenticate } from '@/lib/middleware'
import { prepareRecurringTasks } from '@/lib/modules/task/task.service'
import { isTaskServiceError } from '@/lib/modules/task/task.types'

export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => null)
  if (typeof body?.endDate !== 'string' ||
      (body.organizationId != null && typeof body.organizationId !== 'string')) {
    return errorResponse('日期或组织格式无效', 400)
  }

  try {
    await prepareRecurringTasks({ userId: auth.userId }, body.organizationId ?? null, body.endDate)
    return successResponse(null)
  } catch (error) {
    if (isTaskServiceError(error)) return errorResponse(error.message, error.status)
    console.error('补齐重复任务失败:', error)
    return serverErrorResponse('补齐重复任务失败')
  }
}
