import type { Prisma } from '@prisma/client'

import {
  ensureRecurringTasksGeneratedForOrganization,
  ensureRecurringTasksGeneratedForSeries,
} from '@/lib/recurring-task-service'
import { addPointsForTaskCreation } from '@/lib/utils/points'
import {
  canCreateTaskInProject,
  canEditTaskInProject,
  getPermissionDeniedMessage,
} from '@/lib/utils/permission-utils'

import * as taskRepository from './task.repository'
import {
  assertAssigneesInOrganization,
  assertCanCreateTask,
  assertCanDeleteTask,
  assertOrganizationAccess,
  assertTeamInOrganization,
  isPersonalProjectName,
} from './task.permission'
import type {
  CreateTaskInput,
  TaskActor,
  TaskListFilters,
  UpdateTaskInput,
} from './task.types'
import { TaskServiceError } from './task.types'
import {
  parseCreateTaskInput,
  parseUpdateTaskInput,
  validateUpdateContent,
} from './task.validator'

export async function listTasks(
  actor: TaskActor,
  filters: TaskListFilters
): Promise<{ tasks: unknown[]; count: number }> {
  let targetOrganizationId = filters.organizationId || null

  if (!targetOrganizationId) {
    const user = await taskRepository.findUserOrganization(actor.userId)
    targetOrganizationId = user?.currentOrganizationId || null
  }

  if (!targetOrganizationId) {
    throw new TaskServiceError(400, '未指定组织ID')
  }

  await assertOrganizationAccess(actor.userId, targetOrganizationId)

  if (filters.endDate && Number.isNaN(new Date(filters.endDate).getTime())) {
    throw new TaskServiceError(400, '日期格式无效')
  }

  await ensureRecurringTasksGeneratedForOrganization(
    targetOrganizationId,
    filters.endDate ? new Date(filters.endDate) : undefined
  )

  const where: Prisma.TaskWhereInput = {
    project: {
      organizationId: targetOrganizationId,
    },
  }

  if (filters.teamId) {
    const team = await taskRepository.findTeamWithMembers(filters.teamId)

    if (!team) {
      throw new TaskServiceError(400, '团队不存在')
    }

    if (team.organizationId !== targetOrganizationId) {
      throw new TaskServiceError(400, '团队不属于当前组织')
    }

    const teamMemberIds = team.members.map((member) => member.userId)

    if (!teamMemberIds.includes(actor.userId)) {
      return { tasks: [], count: 0 }
    }

    where.OR = [
      {
        assignees: {
          some: {
            userId: {
              in: teamMemberIds,
            },
          },
        },
      },
      {
        creatorId: {
          in: teamMemberIds,
        },
      },
    ]
  } else if (filters.projectId) {
    const projectMember = await taskRepository.findProjectMember(
      filters.projectId,
      actor.userId
    )

    if (!projectMember) {
      return { tasks: [], count: 0 }
    }

    const project = await taskRepository.findProjectForTaskView(
      filters.projectId
    )

    if (project?.organizationId !== targetOrganizationId) {
      throw new TaskServiceError(400, '项目不属于当前组织')
    }

    where.projectId = filters.projectId

    if (project && isPersonalProjectName(project.name)) {
      where.OR = [
        { creatorId: actor.userId },
        { assignees: { some: { userId: actor.userId } } },
      ]
    }
  } else if (filters.userId) {
    if (filters.userId !== actor.userId) {
      const isTeammate = await taskRepository.findTeammateForUser(
        actor.userId,
        filters.userId,
        targetOrganizationId
      )

      if (!isTeammate) {
        const isProjectMate = await taskRepository.findProjectMateForUser(
          actor.userId,
          filters.userId,
          targetOrganizationId
        )

        if (!isProjectMate) {
          throw new TaskServiceError(400, '无权查看其他用户的任务')
        }
      }
    }

    where.assignees = {
      some: { userId: filters.userId },
    }
  } else {
    where.assignees = {
      some: { userId: actor.userId },
    }
  }

  if (filters.startDate && filters.endDate) {
    const start = new Date(filters.startDate)
    const end = new Date(filters.endDate)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new TaskServiceError(400, '日期格式无效')
    }

    const dateFilter: Prisma.TaskWhereInput = {
      OR: [
        { startDate: { gte: start, lte: end } },
        { endDate: { gte: start, lte: end } },
        {
          AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }],
        },
      ],
    }

    if (where.OR) {
      where.AND = [dateFilter]
    } else {
      Object.assign(where, dateFilter)
    }
  }

  const tasks = await taskRepository.listTasks(where)

  return {
    tasks,
    count: tasks.length,
  }
}

export async function getTask(actor: TaskActor, taskId: string) {
  const task = await taskRepository.findTaskWithDetails(taskId)

  if (!task) {
    throw new TaskServiceError(404, '任务不存在')
  }

  const isAssignee = task.assignees.some(
    (assignee) => assignee.userId === actor.userId
  )
  const isCreator = task.creatorId === actor.userId

  if (!isAssignee && !isCreator) {
    const projectMember = await taskRepository.findProjectMember(
      task.projectId,
      actor.userId
    )

    if (!projectMember) {
      const project = await taskRepository.findProjectForTaskView(task.projectId)

      if (!project) {
        throw new TaskServiceError(403, '无权查看此任务')
      }

      const collaboratorIds = Array.from(
        new Set([task.creatorId, ...task.assignees.map((a) => a.userId)])
      )

      let hasSharedTeam = false
      for (const collaboratorId of collaboratorIds) {
        const shared = await taskRepository.findTeammateForUser(
          actor.userId,
          collaboratorId,
          project.organizationId
        )

        if (shared) {
          hasSharedTeam = true
          break
        }
      }

      if (!hasSharedTeam) {
        throw new TaskServiceError(403, '无权查看此任务')
      }
    }
  }

  return task
}

export async function createTask(
  actor: TaskActor,
  body: unknown
) {
  const input: CreateTaskInput = parseCreateTaskInput(body)

  const project = await taskRepository.findProjectWithMembers(input.projectId)

  if (!project) {
    throw new TaskServiceError(400, '项目不存在')
  }

  if (!project.members.some((member) => member.userId === actor.userId)) {
    throw new TaskServiceError(400, '无权在该项目中创建任务')
  }

  const assigneeUserIds =
    input.assigneeIds.length > 0 ? input.assigneeIds : [actor.userId]

  const isPersonalProject = isPersonalProjectName(project.name)

  if (isPersonalProject && project.creatorId !== actor.userId) {
    throw new TaskServiceError(403, '不能在他人的个人事务项目中创建事项')
  }

  if (
    isPersonalProject &&
    assigneeUserIds.some((assigneeId) => assigneeId !== actor.userId)
  ) {
    throw new TaskServiceError(400, '个人事务项目只能指派给自己')
  }

  await assertAssigneesInOrganization(assigneeUserIds, project.organizationId)
  await assertTeamInOrganization(input.teamId, project.organizationId)

  const currentUser = await taskRepository.findUserIsAdmin(actor.userId)

  assertCanCreateTask(
    actor.userId,
    {
      creatorId: project.creatorId,
      taskPermission: project.taskPermission,
      memberIds: project.members.map((member) => member.userId),
    },
    assigneeUserIds,
    !!currentUser?.isAdmin
  )

  // 确保所有负责人都在项目中
  for (const assigneeId of assigneeUserIds) {
    const isProjectMember = project.members.some(
      (member) => member.userId === assigneeId
    )

    if (!isProjectMember) {
      await taskRepository.addProjectMember(input.projectId, assigneeId)
    }
  }

  let task

  if (input.recurrence) {
    const recurringSeries = await taskRepository.createRecurringSeries({
      title: input.title,
      description: input.description,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      startTime: input.startTime,
      endTime: input.endTime,
      type: input.type,
      color: input.type === 'daily' ? input.color || null : null,
      progress: input.progress,
      recurrenceType: input.recurrence.recurrenceType,
      intervalDays:
        input.recurrence.recurrenceType === 'INTERVAL_DAYS'
          ? input.recurrence.intervalDays ?? null
          : null,
      assigneeIds: assigneeUserIds,
      creatorId: actor.userId,
      projectId: input.projectId,
      teamId: input.teamId || null,
    })

    await ensureRecurringTasksGeneratedForSeries(
      recurringSeries.id,
      new Date(input.startDate)
    )

    task = await taskRepository.findRecurringOccurrence(
      recurringSeries.id,
      new Date(input.startDate)
    )
  } else {
    task = await taskRepository.createTaskRecord({
      title: input.title,
      description: input.description,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      startTime: input.startTime,
      endTime: input.endTime,
      type: input.type,
      color: input.type === 'daily' ? input.color || null : null,
      progress: input.progress,
      creatorId: actor.userId,
      projectId: input.projectId,
      teamId: input.teamId || null,
      assignees: {
        create: assigneeUserIds.map((assigneeId) => ({
          userId: assigneeId,
        })),
      },
    })
  }

  if (!task) {
    throw new TaskServiceError(500, '创建定时任务失败')
  }

  addPointsForTaskCreation(actor.userId).catch((error) => {
    console.error('创建任务增加积分失败:', error)
  })

  const otherAssignees = assigneeUserIds.filter(
    (assigneeId) => assigneeId !== actor.userId
  )

  if (otherAssignees.length > 0) {
    const creator = await taskRepository.findUserSummary(actor.userId)

    if (creator) {
      await taskRepository.createNotifications(
        otherAssignees.map((assigneeId) => ({
          userId: assigneeId,
          type: 'TASK_ASSIGNED',
          title: '新任务分配',
          content: `${creator.name} 为您分配了新任务：${input.title}`,
          metadata: {
            taskId: task.id,
            projectId: task.projectId,
            teamId: task.teamId,
            creatorId: actor.userId,
            creatorName: creator.name,
          },
        }))
      )
    }
  }

  return task
}

export async function updateTask(
  actor: TaskActor,
  taskId: string,
  body: unknown
) {
  const existingTask = await taskRepository.findTaskWithAccessContext(taskId)

  if (!existingTask) {
    throw new TaskServiceError(404, '任务不存在')
  }

  const currentUser = await taskRepository.findUserIsAdmin(actor.userId)
  const input: UpdateTaskInput = parseUpdateTaskInput(body)

  const isProjectReassignment =
    input.projectId !== undefined && input.projectId !== existingTask.projectId

  const currentAssigneeIds = existingTask.assignees.map((a) => a.userId)
  const nextAssigneeIds = input.assigneeIds

  if (nextAssigneeIds) {
    await assertAssigneesInOrganization(
      nextAssigneeIds,
      existingTask.project.organizationId
    )
  }

  await assertTeamInOrganization(
    input.teamId,
    existingTask.project.organizationId
  )

  const currentProjectPermissionContext = {
    creatorId: existingTask.project.creatorId,
    taskPermission: existingTask.project.taskPermission,
    memberIds: existingTask.project.members.map((member) => member.userId),
  }

  const canAccessTask =
    !!currentUser?.isAdmin ||
    existingTask.creatorId === actor.userId ||
    existingTask.assignees.some(
      (assignee) => assignee.userId === actor.userId
    ) ||
    existingTask.project.members.some(
      (member) => member.userId === actor.userId
    ) ||
    !!existingTask.team?.members.some(
      (member) => member.userId === actor.userId
    )

  if (!canAccessTask) {
    throw new TaskServiceError(403, '无权访问此任务')
  }

  const canEditTaskContent = canEditTaskInProject(
    actor.userId,
    currentProjectPermissionContext,
    currentAssigneeIds,
    undefined,
    !!currentUser?.isAdmin
  )

  const hasPermission = canEditTaskInProject(
    actor.userId,
    currentProjectPermissionContext,
    currentAssigneeIds,
    nextAssigneeIds,
    !!currentUser?.isAdmin
  )

  if (!hasPermission && !isProjectReassignment) {
    throw new TaskServiceError(
      403,
      getPermissionDeniedMessage(existingTask.project.taskPermission)
    )
  }

  const canOnlyReassignProject =
    isProjectReassignment && !canEditTaskContent

  validateUpdateContent(input, existingTask.type, {
    skipContentValidation: canOnlyReassignProject,
  })

  let nextProject = existingTask.project

  if (input.projectId && input.projectId !== existingTask.projectId) {
    const project = await taskRepository.findProjectWithMembers(input.projectId)

    if (!project) {
      throw new TaskServiceError(400, '目标项目不存在')
    }

    if (project.organizationId !== existingTask.project.organizationId) {
      throw new TaskServiceError(400, '不允许跨组织迁移事项')
    }

    const hasTargetProjectAccess = project.members.some(
      (member) => member.userId === actor.userId
    )

    if (!hasTargetProjectAccess) {
      throw new TaskServiceError(
        403,
        '只有目标项目成员才可以将事项迁移到该项目'
      )
    }

    const taskUserIds =
      input.assigneeIds !== undefined
        ? input.assigneeIds
        : existingTask.assignees.map((assignee) => assignee.userId)

    const isPersonalProject = isPersonalProjectName(project.name)

    if (isPersonalProject && project.creatorId !== actor.userId) {
      throw new TaskServiceError(403, '不能将事项迁移到他人的个人事务项目')
    }

    if (
      isPersonalProject &&
      taskUserIds.some((taskUserId) => taskUserId !== actor.userId)
    ) {
      throw new TaskServiceError(400, '个人事务项目只能指派给自己')
    }

    const canCreateInTargetProject = canCreateTaskInProject(
      actor.userId,
      {
        creatorId: project.creatorId,
        taskPermission: project.taskPermission,
        memberIds: project.members.map((member) => member.userId),
      },
      taskUserIds,
      !!currentUser?.isAdmin
    )

    if (!canCreateInTargetProject) {
      throw new TaskServiceError(
        403,
        getPermissionDeniedMessage(project.taskPermission)
      )
    }

    nextProject = project

    for (const taskUserId of taskUserIds) {
      const userInProject = project.members.some(
        (member) => member.userId === taskUserId
      )

      if (!userInProject) {
        await taskRepository.addProjectMember(input.projectId, taskUserId)
      }
    }
  }

  if (!canOnlyReassignProject) {
    const effectiveAssigneeIds =
      input.assigneeIds !== undefined
        ? input.assigneeIds
        : currentAssigneeIds

    const isPersonalProject = isPersonalProjectName(nextProject.name)

    if (isPersonalProject && nextProject.creatorId !== actor.userId) {
      throw new TaskServiceError(403, '不能在他人的个人事务项目中修改事项')
    }

    if (
      isPersonalProject &&
      effectiveAssigneeIds.some(
        (assigneeId) => assigneeId !== actor.userId
      )
    ) {
      throw new TaskServiceError(400, '个人事务项目只能指派给自己')
    }
  }

  const updateData: Prisma.TaskUncheckedUpdateInput = {}

  if (!canOnlyReassignProject) {
    if (input.title !== undefined) updateData.title = input.title
    if (input.description !== undefined) {
      updateData.description = input.description
    }
    if (input.startDate !== undefined) {
      updateData.startDate = new Date(input.startDate)
    }
    if (input.endDate !== undefined) {
      updateData.endDate = new Date(input.endDate)
    }
    if (input.startTime !== undefined) updateData.startTime = input.startTime
    if (input.endTime !== undefined) updateData.endTime = input.endTime
    if (input.type !== undefined) updateData.type = input.type
    if (input.color !== undefined) {
      const taskType = input.type || existingTask.type
      updateData.color = taskType === 'daily' ? input.color || null : null
    }
    if (input.progress !== undefined) updateData.progress = input.progress
  }

  if (input.projectId !== undefined) updateData.projectId = input.projectId
  if (!canOnlyReassignProject && input.teamId !== undefined) {
    updateData.teamId = input.teamId || null
  }

  const newAssigneeIds = input.assigneeIds
  const assigneesChanged = !!newAssigneeIds &&
    (newAssigneeIds.length !== currentAssigneeIds.length ||
      newAssigneeIds.some(
        (assigneeId) => !currentAssigneeIds.includes(assigneeId)
      ))

  return taskRepository.updateTaskAndAssignees({
    taskId,
    updateData,
    nextAssigneeIds: newAssigneeIds,
    shouldReplaceAssignees:
      !canOnlyReassignProject && !!newAssigneeIds && assigneesChanged,
  })
}

export async function stopRecurringTask(actor: TaskActor, taskId: string) {
  const task = await taskRepository.findTaskForRecurringStop(taskId)

  if (!task) {
    throw new TaskServiceError(404, '任务不存在')
  }

  if (!task.recurringSeriesId || !task.recurringSeries) {
    throw new TaskServiceError(400, '当前任务不是定时任务')
  }

  const currentUser = await taskRepository.findUserIsAdmin(actor.userId)

  const hasPermission = canEditTaskInProject(
    actor.userId,
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
    throw new TaskServiceError(
      403,
      getPermissionDeniedMessage(task.project.taskPermission)
    )
  }

  const stopDate = task.recurrenceDate || task.startDate
  const nextStopsAfter =
    task.recurringSeries.stopsAfter &&
    task.recurringSeries.stopsAfter < stopDate
      ? task.recurringSeries.stopsAfter
      : stopDate

  await taskRepository.stopRecurringSeries(
    task.recurringSeries.id,
    nextStopsAfter
  )

  return {
    recurringSeriesId: task.recurringSeries.id,
    stopsAfter: nextStopsAfter,
  }
}

export async function deleteTask(actor: TaskActor, taskId: string) {
  const existingTask = await taskRepository.findTaskWithAccessContext(taskId)

  if (!existingTask) {
    throw new TaskServiceError(404, '任务不存在')
  }

  const currentUser = await taskRepository.findUserIsAdmin(actor.userId)

  assertCanDeleteTask(
    actor.userId,
    {
      creatorId: existingTask.project.creatorId,
      taskPermission: existingTask.project.taskPermission,
      memberIds: existingTask.project.members.map((member) => member.userId),
    },
    existingTask.assignees.map((assignee) => assignee.userId),
    !!currentUser?.isAdmin
  )

  const taskTitle = existingTask.title
  const notifyUserIds = Array.from(
    new Set([
      existingTask.creatorId,
      ...existingTask.assignees.map((assignee) => assignee.userId),
    ])
  ).filter((userId) => userId !== actor.userId)

  await taskRepository.deleteTaskRecord(taskId)

  if (notifyUserIds.length > 0) {
    try {
      const deleter = await taskRepository.findUserSummary(actor.userId)

      if (deleter) {
        await taskRepository.createNotifications(
          notifyUserIds.map((userId) => ({
            userId,
            type: 'TASK_DELETED',
            title: '任务已被删除',
            content: `${deleter.name} 删除了任务「${taskTitle}」`,
            metadata: {
              deletedBy: actor.userId,
              deletedByName: deleter.name,
              taskTitle,
            },
          }))
        )
      }
    } catch (notificationError) {
      console.error('发送删除通知失败:', notificationError)
    }
  }
}
