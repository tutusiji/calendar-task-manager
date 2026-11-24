import { randomUUID } from 'node:crypto'
import { NextRequest } from 'next/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { DELETE as removeOrganizationMember } from '@/app/api/organizations/[id]/members/route'
import { PUT as updateProject } from '@/app/api/projects/[id]/route'
import { POST as createProject } from '@/app/api/projects/route'
import { generateToken } from '@/lib/auth'
import { createTask, listTasks, updateTask } from '@/lib/modules/task/task.service'
import { prisma } from '@/lib/prisma'

describe.skipIf(process.env.RUN_DB_INTEGRATION !== '1')('personal projects with PostgreSQL', () => {
  const id = randomUUID()
  const owner = { userId: `${id}-owner` }
  const other = { userId: `${id}-other` }
  const leavingMember = { userId: `${id}-leaving` }
  const organizationId = `${id}-org`
  const personalId = `${id}-personal`
  const otherPersonalId = `${id}-other-personal`
  const date = '2026-01-01T00:00:00.000Z'
  const task = { title: 'Task', type: 'daily', startDate: date, endDate: date }
  const color = '#224466'

  function projectRequest(path: string, method: 'POST' | 'PUT', body: object) {
    return new NextRequest(`http://localhost/api/projects${path}`, {
      method,
      headers: { Authorization: `Bearer ${generateToken(owner)}` },
      body: JSON.stringify(body),
    })
  }

  beforeAll(async () => {
    await prisma.user.createMany({ data: [owner, other, leavingMember].map(({ userId }) => ({
      id: userId, username: userId, name: userId, email: 'projects@example.test', currentOrganizationId: organizationId,
    })) })
    await prisma.organization.create({ data: {
      id: organizationId,
      name: organizationId,
      creatorId: owner.userId,
      members: { create: [{ ...owner, role: 'OWNER' }, other, leavingMember] },
      projects: { create: [
        { id: personalId, type: 'PERSONAL', name: '所有者的个人事务', color, creatorId: owner.userId, members: { create: [owner, other] } },
        { id: otherPersonalId, type: 'PERSONAL', name: '其他成员项目', color, creatorId: other.userId, members: { create: [owner, other] } },
      ] },
    } })
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [owner.userId, other.userId, leavingMember.userId] } } })
  })

  it('keeps owner, self-assignment and list rules after a personal project is renamed', async () => {
    const renamed = await updateProject(projectRequest(`/${personalId}`, 'PUT', { name: '我的待办', type: 'STANDARD' }), {
      params: Promise.resolve({ id: personalId }),
    })
    expect((await renamed.json()).data).toMatchObject({ name: '我的待办', type: 'PERSONAL' })
    const personalTask = await createTask(owner, { ...task, projectId: personalId })
    expect(personalTask.assignees).toEqual([expect.objectContaining(owner)])
    await expect(createTask(other, { ...task, projectId: personalId })).rejects.toMatchObject({
      status: 403, message: '不能在他人的个人事务项目中创建事项',
    })
    await expect(createTask(owner, { ...task, projectId: personalId, userId: [other.userId] })).rejects.toMatchObject({
      status: 400, message: '个人事务项目只能指派给自己',
    })
    await expect(updateTask(other, personalTask.id, { title: 'Changed by member' })).rejects.toMatchObject({
      status: 403, message: '不能在他人的个人事务项目中修改事项',
    })
    await expect(updateTask(owner, personalTask.id, { userId: [other.userId] })).rejects.toMatchObject({
      status: 400, message: '个人事务项目只能指派给自己',
    })
    expect((await listTasks(owner, { projectId: personalId })).tasks).toEqual([expect.objectContaining({ id: personalTask.id })])
    expect((await listTasks(other, { projectId: personalId })).tasks).toEqual([])
  })

  it('keeps standard assignment and visibility rules after a rename and rejects moving into another owner’s personal project', async () => {
    const response = await createProject(projectRequest('', 'POST', {
      name: '工作项目', color, organizationId, memberIds: [owner.userId, other.userId], type: 'PERSONAL',
    }))
    const { data: project } = await response.json()
    expect(project).toMatchObject({ type: 'STANDARD' })

    const renamed = await updateProject(projectRequest(`/${project.id}`, 'PUT', { name: '共同的个人事务' }), {
      params: Promise.resolve({ id: project.id }),
    })
    expect((await renamed.json()).data).toMatchObject({ name: '共同的个人事务', type: 'STANDARD' })

    const assigned = await createTask(owner, { ...task, projectId: project.id, userId: [other.userId] })
    expect(assigned.assignees).toEqual([expect.objectContaining(other)])
    const ownerTask = await createTask(owner, { ...task, projectId: project.id })
    expect((await listTasks(other, { projectId: project.id })).tasks.map(({ id }) => id)).toEqual(
      expect.arrayContaining([assigned.id, ownerTask.id]),
    )
    await expect(updateTask(owner, ownerTask.id, { projectId: otherPersonalId })).rejects.toMatchObject({
      status: 403, message: '不能将事项迁移到他人的个人事务项目',
    })
    await expect(updateTask(owner, assigned.id, { projectId: personalId })).rejects.toMatchObject({
      status: 400, message: '个人事务项目只能指派给自己',
    })
  })

  it('enforces one personal project per owner and organization and keeps failed updates atomic', async () => {
    await expect(prisma.project.create({ data: {
      organizationId, creatorId: owner.userId, name: 'Duplicate personal project', color, type: 'PERSONAL',
    } })).rejects.toMatchObject({ code: 'P2002' })

    const rejected = await updateProject(projectRequest(`/${personalId}`, 'PUT', {
      creatorId: other.userId, memberIds: [other.userId],
    }), { params: Promise.resolve({ id: personalId }) })
    expect(rejected.status).toBe(409)

    expect(await prisma.project.findUniqueOrThrow({ where: { id: personalId }, include: { members: true } })).toMatchObject({
      creatorId: owner.userId, members: expect.arrayContaining([expect.objectContaining(owner), expect.objectContaining(other)]),
    })
  })

  it('removes a renamed personal project on organization departure and preserves a similarly named standard project', async () => {
    const projectData = { organizationId, creatorId: leavingMember.userId, color }
    const personal = await prisma.project.create({ data: { ...projectData, type: 'PERSONAL', name: '已改名的待办' } })
    const standard = await prisma.project.create({ data: { ...projectData, name: `${leavingMember.userId}的个人事务` } })
    const response = await removeOrganizationMember(new NextRequest(
      `http://localhost/api/organizations/${organizationId}/members?userId=${leavingMember.userId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${generateToken(leavingMember)}` } },
    ), { params: Promise.resolve({ id: organizationId }) })

    expect(response.status).toBe(200)
    expect(await prisma.project.findUnique({ where: { id: personal.id } })).toBeNull()
    expect(await prisma.project.findUnique({ where: { id: standard.id } })).toMatchObject({ type: 'STANDARD' })
  })
})
