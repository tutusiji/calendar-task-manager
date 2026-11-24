import { randomUUID } from 'node:crypto'
import { NextRequest } from 'next/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { GET as getOrganizations } from '@/app/api/admin/panorama/organizations/route'
import { PUT as updateOrganization } from '@/app/api/admin/panorama/organizations/[id]/route'
import { GET as getMembers } from '@/app/api/admin/panorama/organizations/[id]/members/route'
import { GET as getProjects } from '@/app/api/admin/panorama/organizations/[id]/projects/route'
import { GET as getTeams } from '@/app/api/admin/panorama/organizations/[id]/teams/route'
import { GET as getTasks } from '@/app/api/admin/panorama/tasks/route'
import { countPanoramaTasks, filterPanoramaTasksByDateRange, parsePanoramaTasks } from '@/components/admin/panorama-task-views'
import { prisma } from '@/lib/prisma'
import { generatePanoramaToken } from '@/lib/server/auth/panorama-token'

describe.skipIf(process.env.RUN_DB_INTEGRATION !== '1')('panorama recurring task counts with PostgreSQL', () => {
  const id = randomUUID()
  const organizationId = `${id}-org`
  const creatorId = `${id}-creator`
  const memberId = `${id}-member`
  const projectId = `${id}-project`
  const otherProjectId = `${id}-other-project`
  const teamId = `${id}-team`
  const seriesId = `${id}-series`
  const otherSeriesId = `${id}-other-series`
  const params = Promise.resolve({ id: organizationId })
  const january = new Date(2026, 0, 5, 12)
  const february = new Date(2026, 1, 5, 12)
  const taskDefaults = { title: 'Weekly report', type: 'daily' as const, creatorId, projectId }

  function request(path: string, init?: { method: string; body: string }) {
    return new NextRequest(`http://localhost/api/admin/panorama/${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${generatePanoramaToken()}` },
    })
  }

  beforeAll(async () => {
    await prisma.user.createMany({ data: [creatorId, memberId].map((userId) => ({
      id: userId, username: userId, name: userId, email: 'panorama@example.test',
    })) })
    await prisma.organization.create({ data: {
      id: organizationId, name: organizationId, creatorId,
      members: { create: [{ userId: creatorId, role: 'OWNER' }, { userId: memberId }] },
      projects: { create: [projectId, otherProjectId].map((project) => ({
        id: project, name: project, color: '#224466', creatorId,
      })) },
      teams: { create: { id: teamId, name: 'Panorama team', color: '#224466', creatorId, members: { create: { userId: memberId } } } },
    } })
    await prisma.recurringTaskSeries.createMany({ data: [seriesId, otherSeriesId].map((series) => ({
      ...taskDefaults, id: series, startDate: january, endDate: january,
      recurrenceType: 'WEEKLY', assigneeIds: [memberId],
    })) })
    await prisma.task.createMany({ data: [
      { id: `${id}-first`, date: january, recurringSeriesId: seriesId },
      { id: `${id}-second`, date: new Date(2026, 0, 12, 12), recurringSeriesId: seriesId },
      { id: `${id}-moved`, date: february, recurringSeriesId: seriesId, projectId: otherProjectId },
      { id: `${id}-other`, date: january, recurringSeriesId: otherSeriesId },
      { id: `${id}-single`, date: january, recurringSeriesId: null },
      { id: `${id}-single-2`, date: january, recurringSeriesId: null },
    ].map(({ date, recurringSeriesId, ...overrides }) => ({
      ...taskDefaults, ...overrides, recurringSeriesId, startDate: date, endDate: date,
      recurrenceDate: recurringSeriesId ? date : null,
    })) })
    await prisma.taskAssignee.createMany({ data: ['first', 'second', 'single'].map((task) => ({
      taskId: `${id}-${task}`, userId: memberId,
    })) })
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [creatorId, memberId] } } })
  })

  it('counts each series once after applying organization, project or participant filters', async () => {
    const base = `organizations/${organizationId}`
    const [organizations, projects, teams, members, updated] = await Promise.all([
      getOrganizations(request('organizations')),
      getProjects(request(`${base}/projects`), { params }),
      getTeams(request(`${base}/teams`), { params }),
      getMembers(request(`${base}/members`), { params }),
      updateOrganization(request(base, { method: 'PUT', body: JSON.stringify({ isVerified: true }) }), { params }),
    ])
    const payloads = await Promise.all([organizations, projects, teams, members, updated].map((response) => {
      expect(response.status).toBe(200)
      return response.json()
    }))

    expect(payloads[0].data).toContainEqual(expect.objectContaining({ id: organizationId, _count: expect.objectContaining({ tasks: 4 }) }))
    expect(payloads[1].data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: projectId, _count: { tasks: 4 } }),
      expect.objectContaining({ id: otherProjectId, _count: { tasks: 1 } }),
    ]))
    expect(payloads[2].data).toContainEqual(expect.objectContaining({ id: teamId, _count: { tasks: 2 } }))
    expect(payloads[3].data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: creatorId, taskCount: 4 }),
      expect.objectContaining({ id: memberId, taskCount: 2 }),
    ]))
    expect(payloads[4].data._count.tasks).toBe(4)
  })

  it('retains occurrence dates for the month and list views while counting by series', async () => {
    const response = await getTasks(request(`tasks?type=org&id=${organizationId}`))
    expect(response.status).toBe(200)
    const tasks = parsePanoramaTasks((await response.json()).data)
    expect(tasks).toHaveLength(6)
    expect(countPanoramaTasks(tasks)).toBe(4)
    const januaryTasks = filterPanoramaTasksByDateRange(tasks, new Date(2026, 0, 1), new Date(2026, 0, 31))
    expect(januaryTasks).toHaveLength(5)
    expect(countPanoramaTasks(januaryTasks)).toBe(4)
    const februaryTasks = filterPanoramaTasksByDateRange(tasks, new Date(2026, 1, 1), new Date(2026, 1, 28))
    expect(countPanoramaTasks(februaryTasks)).toBe(1)
  })
})
