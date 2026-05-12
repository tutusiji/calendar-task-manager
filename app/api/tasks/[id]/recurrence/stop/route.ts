import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'
import {
  forbiddenResponse,
  notFoundResponse,
  successResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '@/lib/api-response'
import { canEditTaskInProject, getPermissionDeniedMessage } from '@/lib/utils/permission-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id } = await params

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignees: {
          select: { userId: true },
        },
        project: {
          include: {
            members: {
              select: { userId: true },
            },
          },
        },
        recurringSeries: {
          select: {
            id: true,
            stopsAfter: true,
          },
        },
      },
    })

    if (!task) {
      return notFoundResponse('任务不存在')
    }

    if (!task.recurringSeriesId || !task.recurringSeries) {
      return validationErrorResponse('当前任务不是定时任务')
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { isAdmin: true },
    })

    const hasPermission = canEditTaskInProject(
      auth.userId,
      {
        creatorId: task.project.creatorId,
        taskPermission: task.project.taskPermission,
        memberIds: task.project.members.map((member) => member.userId),
      },
      task.assignees.map((assignee) => assignee.userId),
      undefined,
      !!currentUser?.isAdmin
    )

    if (!hasPermission) {
      return forbiddenResponse(getPermissionDeniedMessage(task.project.taskPermission))
    }

    const stopDate = task.recurrenceDate || task.startDate
    const nextStopsAfter =
      task.recurringSeries.stopsAfter && task.recurringSeries.stopsAfter < stopDate
        ? task.recurringSeries.stopsAfter
        : stopDate

    await prisma.$transaction([
      prisma.recurringTaskSeries.update({
        where: { id: task.recurringSeries.id },
        data: {
          stopsAfter: nextStopsAfter,
        },
      }),
      prisma.task.deleteMany({
        where: {
          recurringSeriesId: task.recurringSeries.id,
          recurrenceDate: {
            gt: nextStopsAfter,
          },
        },
      }),
    ])

    return successResponse(
      {
        recurringSeriesId: task.recurringSeries.id,
        stopsAfter: nextStopsAfter,
      },
      '已终止后续定时任务'
    )
  } catch (error) {
    console.error('Error stopping recurring task series:', error)
    return serverErrorResponse('终止后续定时任务失败')
  }
}
