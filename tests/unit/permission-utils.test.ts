import { describe, expect, it } from 'vitest'

import type { Project } from '@/lib/types'
import {
  canCreateTaskInProject,
  canDeleteTaskInProject,
  canEditTaskInProject,
  canManageTaskInProject,
  getPermissionDeniedMessage,
  isSelfOnlyAssigneeSet,
} from '@/lib/utils/permission-utils'

const baseProject: Project = {
  id: 'project-1',
  name: '测试项目',
  type: 'STANDARD',
  description: '',
  color: '#3b82f6',
  organizationId: 'org-1',
  creatorId: 'owner',
  taskPermission: 'ALL_MEMBERS',
  memberIds: ['owner', 'member-1', 'member-2'],
  createdAt: new Date('2026-01-01'),
}

function projectWith(
  overrides: Partial<Project>
): Pick<Project, 'creatorId' | 'taskPermission' | 'memberIds'> {
  return {
    creatorId: overrides.creatorId ?? baseProject.creatorId,
    taskPermission: overrides.taskPermission ?? baseProject.taskPermission,
    memberIds: overrides.memberIds ?? baseProject.memberIds,
  }
}

describe('permission-utils', () => {
  it('超级管理员始终拥有管理权限', () => {
    const project = projectWith({ taskPermission: 'CREATOR_ONLY', memberIds: [] })
    expect(canManageTaskInProject('anyone', project, true)).toBe(true)
  })

  it('非项目成员没有管理权限', () => {
    const project = projectWith({})
    expect(canManageTaskInProject('outsider', project)).toBe(false)
  })

  it('ALL_MEMBERS 模式下项目成员可以管理任务', () => {
    const project = projectWith({ taskPermission: 'ALL_MEMBERS' })
    expect(canManageTaskInProject('member-1', project)).toBe(true)
  })

  it('CREATOR_ONLY 模式下只有创建者可以管理任务', () => {
    const project = projectWith({ taskPermission: 'CREATOR_ONLY' })
    expect(canManageTaskInProject('owner', project)).toBe(true)
    expect(canManageTaskInProject('member-1', project)).toBe(false)
  })

  it('CREATOR_ONLY 模式下普通成员只能给自己创建任务', () => {
    const project = projectWith({ taskPermission: 'CREATOR_ONLY' })
    expect(canCreateTaskInProject('member-1', project, ['member-1'])).toBe(true)
    expect(canCreateTaskInProject('member-1', project, ['member-2'])).toBe(false)
    expect(canCreateTaskInProject('outsider', project, ['outsider'])).toBe(false)
  })

  it('负责人可以编辑自己的任务，但不能把负责人改成别人', () => {
    const project = projectWith({ taskPermission: 'CREATOR_ONLY' })
    expect(canEditTaskInProject('member-1', project, ['member-1'])).toBe(true)
    expect(
      canEditTaskInProject('member-1', project, ['member-1'], ['member-2'])
    ).toBe(false)
    expect(
      canEditTaskInProject('member-1', project, ['member-1'], ['member-1'])
    ).toBe(true)
  })

  it('负责人可以删除指派给自己的任务', () => {
    const project = projectWith({ taskPermission: 'CREATOR_ONLY' })
    expect(canDeleteTaskInProject('member-1', project, ['member-1'])).toBe(true)
    expect(canDeleteTaskInProject('member-2', project, ['member-1'])).toBe(false)
  })

  it('isSelfOnlyAssigneeSet 只接受非空且全部为自己的集合', () => {
    expect(isSelfOnlyAssigneeSet('u1', ['u1', 'u1'])).toBe(true)
    expect(isSelfOnlyAssigneeSet('u1', ['u1', 'u2'])).toBe(false)
    expect(isSelfOnlyAssigneeSet('u1', [])).toBe(false)
  })

  it('权限不足消息随协同模式变化', () => {
    expect(getPermissionDeniedMessage('CREATOR_ONLY')).toContain('仅创建人')
    expect(getPermissionDeniedMessage('ALL_MEMBERS')).toContain('没有权限')
  })
})
