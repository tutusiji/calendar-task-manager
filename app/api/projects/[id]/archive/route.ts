import type { NextRequest } from 'next/server'
import { authenticate } from '@/lib/middleware'
import { forbiddenResponse, notFoundResponse, serverErrorResponse, successResponse } from '@/lib/api-response'
import { setProjectArchive } from '@/lib/modules/project/project.service'

async function updateArchive(
  request: NextRequest,
  params: Promise<{ id: string }>,
  archived: boolean,
) {
  const action = archived ? '归档' : '取消归档'
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error
    const { id } = await params

    const result = await setProjectArchive(auth.userId, id, archived)
    if (result.kind === 'not-found') return notFoundResponse('项目不存在')
    if (result.kind === 'forbidden') return forbiddenResponse(`只有项目成员可以${action}项目`)
    return successResponse(result.data, `项目已${action}`)
  } catch (error) {
    console.error(`${action}项目失败:`, error)
    return serverErrorResponse(`${action}项目失败，请确认数据库迁移已执行`)
  }
}

export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return updateArchive(request, params, true)
}

export function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return updateArchive(request, params, false)
}
