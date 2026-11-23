import { randomUUID } from 'node:crypto'
import { addDays, startOfDay } from 'date-fns'
import { NextRequest } from 'next/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { GET as getBoards } from '@/app/api/plans/boards/route'
import { GET as getBoard } from '@/app/api/plans/boards/[id]/route'
import { POST as prepareRecurring } from '@/app/api/tasks/recurrence/route'
import { GET as getProjects } from '@/app/api/projects/route'
import { DELETE as unarchiveProject, POST as archiveProject } from '@/app/api/projects/[id]/archive/route'
import { GET as getTeams } from '@/app/api/teams/route'
import { GET as getOrganizations } from '@/app/api/organizations/route'
import { POST as switchOrg } from '@/app/api/organizations/switch/route'
import { generateToken } from '@/lib/auth'
import { stopRecurringSeries } from '@/lib/modules/task/task.repository'
import { listTasks } from '@/lib/modules/task/task.service'
import { prisma } from '@/lib/prisma'
import { ensureRecurringTasksGeneratedForOrganization } from '@/lib/recurring-task-service'

describe.skipIf(process.env.RUN_DB_INTEGRATION !== '1')('calendar and planning with PostgreSQL', () => {
  const id = randomUUID()
  const ownerId = id + '-owner'
  const otherId = id + '-other'
  const organizationId = id + '-org'
  const projectId = id + '-project'
  const seriesId = id + '-series'
  const boardId = id + '-board'
  const anchor = startOfDay(new Date())
  const future = addDays(anchor, 520)

  beforeAll(async () => {
    await prisma.user.createMany({ data: [
      { id: ownerId, username: ownerId, name: 'Owner', email: 'owner@example.test', currentOrganizationId: organizationId },
      { id: otherId, username: otherId, name: 'Other', email: 'other@example.test' },
    ] })
    await prisma.organization.create({
      data: {
        id: organizationId,
        name: organizationId,
        creatorId: ownerId,
        members: { create: { userId: ownerId, role: 'OWNER' } },
        projects: { create: { id: projectId, name: 'Project', color: '#224466', creatorId: ownerId } },
      },
    })
    await prisma.recurringTaskSeries.create({
      data: {
        id: seriesId,
        title: 'Recurring',
        startDate: anchor,
        endDate: addDays(anchor, 2),
        type: 'daily',
        recurrenceType: 'INTERVAL_DAYS',
        intervalDays: 1,
        creatorId: ownerId,
        projectId,
        assigneeIds: [ownerId],
      },
    })
    await prisma.planningBoard.create({
      data: {
        id: boardId,
        name: 'Plan',
        scopeType: 'PERSONAL',
        ownerUserId: ownerId,
        creatorId: ownerId,
        buckets: { create: { title: 'Bucket' } },
      },
    })
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } })
  })

  it('reads a date range without generating, then prepares future instances in resumable batches', async () => {
    const filters = { startDate: future.toISOString(), endDate: future.toISOString() }
    expect(await listTasks({ userId: ownerId }, filters)).toMatchObject({ count: 0, recurringPending: true })
    expect(await prisma.task.count({ where: { recurringSeriesId: seriesId } })).toBe(0)

    const request = new NextRequest('http://localhost/api/tasks/recurrence', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + generateToken({ userId: ownerId }) },
      body: JSON.stringify({ endDate: future.toISOString(), organizationId }),
    })
    const [response] = await Promise.all([
      prepareRecurring(request),
      ensureRecurringTasksGeneratedForOrganization(organizationId, future),
    ])
    expect(response.status).toBe(200)
    expect(await prisma.task.count({ where: { recurringSeriesId: seriesId } })).toBe(521)
    expect(await listTasks({ userId: ownerId }, filters)).toMatchObject({ count: 3, recurringPending: false })
    expect(await prisma.taskAssignee.count({ where: { task: { recurringSeriesId: seriesId } } })).toBe(521)

    await prisma.task.delete({
      where: { recurringSeriesId_recurrenceDate: { recurringSeriesId: seriesId, recurrenceDate: addDays(anchor, 2) } },
    })
    await ensureRecurringTasksGeneratedForOrganization(organizationId, addDays(future, 2))
    expect(await prisma.task.count({ where: { recurringSeriesId: seriesId } })).toBe(522)

    await Promise.all([
      stopRecurringSeries(seriesId, addDays(anchor, 1)),
      ensureRecurringTasksGeneratedForOrganization(organizationId, addDays(future, 10)),
      stopRecurringSeries(seriesId, addDays(anchor, 4)),
    ])
    const remaining = await prisma.task.findMany({
      where: { recurringSeriesId: seriesId },
      orderBy: { recurrenceDate: 'asc' },
      select: { recurrenceDate: true },
    })
    expect(remaining.map(({ recurrenceDate }) => recurrenceDate)).toEqual([anchor, addDays(anchor, 1)])
  }, 20_000)

  it('keeps organization filters and team access rules in the route response', async () => {
    const headers = { Authorization: 'Bearer ' + generateToken({ userId: ownerId }) }
    const outsider = { Authorization: 'Bearer ' + generateToken({ userId: otherId }) }
    const origin = 'http://localhost'
    const team = await prisma.team.create({
      data: { name: 'Integration team', color: '#224466', organizationId, creatorId: ownerId },
    })

    const mine = await getOrganizations(new NextRequest(origin + '/api/organizations?organizationId=' + organizationId, { headers }))
    expect((await mine.json()).data).toEqual([expect.objectContaining({ id: organizationId, role: 'OWNER' })])

    const teams = await getTeams(new NextRequest(origin + '/api/teams', { headers }))
    expect((await teams.json()).data).toEqual([expect.objectContaining({ id: team.id, memberCount: 0 })])
    const denied = await getTeams(new NextRequest(origin + '/api/teams?organizationId=' + organizationId, { headers: outsider }))
    expect(denied.status).toBe(403)

    const switchRequest = new NextRequest(origin + '/api/organizations/switch', {
      method: 'POST',
      headers: outsider,
      body: JSON.stringify({ organizationId }),
    })
    expect((await switchOrg(switchRequest)).status).toBe(403)
  })

  it('persists archive flags only for the requesting project member', async () => {
    await prisma.projectMember.create({ data: { userId: ownerId, projectId } })
    const headers = { Authorization: 'Bearer ' + generateToken({ userId: ownerId }) }
    const other = { Authorization: 'Bearer ' + generateToken({ userId: otherId }) }
    const url = 'http://localhost/api/projects/' + projectId + '/archive'
    const params = Promise.resolve({ id: projectId })

    expect((await archiveProject(new NextRequest(url, { method: 'POST', headers: other }), { params })).status).toBe(403)
    expect((await archiveProject(new NextRequest(url, { method: 'POST', headers }), { params })).status).toBe(200)
    const projects = await getProjects(new NextRequest('http://localhost/api/projects', { headers }))
    expect((await projects.json()).data).toEqual([expect.objectContaining({ id: projectId, isArchived: true, memberCount: 1 })])
    expect((await prisma.project.findUniqueOrThrow({ where: { id: projectId } })).isArchived).toBe(false)

    expect((await unarchiveProject(new NextRequest(url, { method: 'DELETE', headers }), { params })).status).toBe(200)
    const membership = await prisma.projectMember.findUniqueOrThrow({ where: { userId_projectId: { userId: ownerId, projectId } } })
    expect(membership).toMatchObject({ isArchived: false, archivedAt: null })
  })

  it('returns lightweight summaries and checks ownership for detail requests', async () => {
    const headers = { Authorization: 'Bearer ' + generateToken({ userId: ownerId }) }
    const request = new NextRequest('http://localhost/api/plans/boards?scopeType=PERSONAL&summary=true', { headers })
    const summaries = await (await getBoards(request)).json()
    expect(summaries.data).toEqual([expect.objectContaining({ id: boardId })])
    expect(summaries.data[0]).not.toHaveProperty('buckets')

    const params = Promise.resolve({ id: boardId })
    const url = 'http://localhost/api/plans/boards/' + boardId
    const detail = await getBoard(new NextRequest(url, { headers }), { params })
    expect((await detail.json()).data.buckets).toEqual([expect.objectContaining({ title: 'Bucket' })])

    const denied = await getBoard(new NextRequest(url, {
      headers: { Authorization: 'Bearer ' + generateToken({ userId: otherId }) },
    }), { params })
    expect(denied.status).toBe(403)
  })
})
