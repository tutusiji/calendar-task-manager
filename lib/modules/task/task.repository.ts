import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

/**
 * 任务查询统一使用的关联字段。
 */
export const taskInclude = {
  creator: {
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      avatar: true,
    },
  },
  assignees: {
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
  },
  project: {
    select: {
      id: true,
      name: true,
      color: true,
    },
  },
  team: {
    select: {
      id: true,
      name: true,
      color: true,
    },
  },
  recurringSeries: {
    select: {
      id: true,
      startDate: true,
      recurrenceType: true,
      intervalDays: true,
      stopsAfter: true,
      generatedUntil: true,
    },
  },
} as const

const taskAccessInclude = {
  assignees: {
    select: {
      userId: true,
    },
  },
  project: {
    include: {
      members: {
        select: {
          userId: true,
        },
      },
    },
  },
  team: {
    include: {
      members: {
        select: {
          userId: true,
        },
      },
    },
  },
} as const

export async function findUserOrganization(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { currentOrganizationId: true },
  })
}

export async function findOrganizationMembership(
  userId: string,
  organizationId: string
) {
  return prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  })
}

export async function findOrganizationMembersByIds(
  organizationId: string,
  userIds: string[]
) {
  return prisma.organizationMember.findMany({
    where: {
      organizationId,
      userId: { in: userIds },
    },
    select: { userId: true },
  })
}

export async function findTeamWithMembers(teamId: string) {
  return prisma.team.findUnique({
    where: { id: teamId },
    select: {
      organizationId: true,
      members: {
        select: {
          userId: true,
        },
      },
    },
  })
}

export async function findTeamInOrganization(
  teamId: string,
  organizationId: string
) {
  return prisma.team.findFirst({
    where: {
      id: teamId,
      organizationId,
    },
    select: { id: true },
  })
}

export async function findProjectMember(projectId: string, userId: string) {
  return prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
    },
  })
}

export async function findProjectForTaskView(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true, organizationId: true },
  })
}

export async function findProjectWithMembers(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: true,
    },
  })
}

export async function findTeammateForUser(
  userId: string,
  teammateId: string,
  organizationId: string
) {
  return prisma.teamMember.findFirst({
    where: {
      userId,
      team: {
        organizationId,
        members: {
          some: { userId: teammateId },
        },
      },
    },
  })
}

export async function findProjectMateForUser(
  userId: string,
  teammateId: string,
  organizationId: string
) {
  return prisma.projectMember.findFirst({
    where: {
      userId,
      project: {
        organizationId,
        members: {
          some: { userId: teammateId },
        },
      },
    },
  })
}

export async function findUserIsAdmin(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  })
}

export async function findUserSummary(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  })
}

export async function findTaskWithDetails(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: taskInclude,
  })
}

export async function findTaskWithAccessContext(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: taskAccessInclude,
  })
}

export async function findTaskForRecurringStop(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
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
}

export async function stopRecurringSeries(
  recurringSeriesId: string,
  stopsAfter: Date
) {
  return prisma.$transaction([
    prisma.recurringTaskSeries.update({
      where: { id: recurringSeriesId },
      data: { stopsAfter },
    }),
    prisma.task.deleteMany({
      where: {
        recurringSeriesId,
        recurrenceDate: {
          gt: stopsAfter,
        },
      },
    }),
  ])
}

export async function listTasks(where: Prisma.TaskWhereInput) {
  return prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: {
      startDate: 'asc',
    },
  })
}

export async function addProjectMember(projectId: string, userId: string) {
  return prisma.projectMember.create({
    data: {
      projectId,
      userId,
    },
  })
}

export async function createTaskRecord(
  data: Prisma.TaskUncheckedCreateInput
) {
  return prisma.task.create({
    data,
    include: taskInclude,
  })
}

export async function updateTaskRecord(
  taskId: string,
  data: Prisma.TaskUncheckedUpdateInput
) {
  return prisma.task.update({
    where: { id: taskId },
    data,
    include: taskInclude,
  })
}

/**
 * 负责人替换与任务字段更新放在同一事务中，避免中途失败留下不一致状态。
 */
export async function updateTaskAndAssignees(params: {
  taskId: string
  updateData: Prisma.TaskUncheckedUpdateInput
  nextAssigneeIds?: string[]
  shouldReplaceAssignees: boolean
}) {
  return prisma.$transaction(async (tx) => {
    if (params.shouldReplaceAssignees && params.nextAssigneeIds) {
      await tx.taskAssignee.deleteMany({
        where: { taskId: params.taskId },
      })

      if (params.nextAssigneeIds.length > 0) {
        await tx.taskAssignee.createMany({
          data: params.nextAssigneeIds.map((userId) => ({
            taskId: params.taskId,
            userId,
          })),
        })
      }
    }

    return tx.task.update({
      where: { id: params.taskId },
      data: params.updateData,
      include: taskInclude,
    })
  })
}

export async function deleteTaskRecord(taskId: string) {
  return prisma.task.delete({
    where: { id: taskId },
  })
}

export async function createRecurringSeries(
  data: Prisma.RecurringTaskSeriesUncheckedCreateInput
) {
  return prisma.recurringTaskSeries.create({
    data,
  })
}

export async function findRecurringOccurrence(
  recurringSeriesId: string,
  recurrenceDate: Date
) {
  return prisma.task.findFirst({
    where: {
      recurringSeriesId,
      recurrenceDate,
    },
    include: taskInclude,
  })
}

export async function createNotifications(
  data: Prisma.NotificationCreateManyInput[]
) {
  if (data.length === 0) return
  return prisma.notification.createMany({ data })
}
