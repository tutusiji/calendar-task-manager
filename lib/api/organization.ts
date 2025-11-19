/**
 * 组织相关 API - 使用新的请求封装
 * 示例：展示如何使用统一的请求方法
 */

import { get, post, put, del } from '../request'

// ==================== 类型定义 ====================

export interface Organization {
  id: string
  name: string
  description?: string
  isVerified: boolean
  role?: string
  memberCount?: number
  teamCount?: number
  projectCount?: number
  creatorId: string
  createdAt: Date
  updatedAt: Date
}

export interface OrganizationMember {
  id: string
  name: string
  email: string
  avatar?: string | null
  role: string
  joinedAt: Date
  inviter?: {
    id: string
    name: string
  } | null
}

export interface OrganizationTeam {
  id: string
  name: string
  color: string
  description?: string
  memberCount: number
  members?: Array<{
    id: string
    name: string
    email: string
    avatar?: string
    role: string
  }>
  creator: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  createdAt: Date
}

export interface OrganizationProject {
  id: string
  name: string
  color: string
  description?: string
  memberCount: number
  members?: Array<{
    id: string
    name: string
    email: string
    avatar?: string
    role: string
  }>
  creator: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  createdAt: Date
}

// ==================== 组织管理 API ====================

export const organizationAPI = {
  /**
   * 获取所有组织
   */
  async getAll(search?: string): Promise<Organization[]> {
    return get<Organization[]>('/organizations', search ? { search } : undefined)
  },

  /**
   * 获取单个组织
   */
  async getById(id: string): Promise<Organization> {
    return get<Organization>(`/organizations/${id}`)
  },

  /**
   * 创建组织
   */
  async create(data: { name: string; description?: string }): Promise<Organization> {
    return post<Organization>('/organizations', data)
  },

  /**
   * 更新组织
   */
  async update(id: string, data: { name?: string; description?: string }): Promise<Organization> {
    return put<Organization>(`/organizations/${id}`, data)
  },

  /**
   * 删除组织
   */
  async delete(id: string): Promise<void> {
    return del<void>(`/organizations/${id}`)
  },

  /**
   * 切换当前组织
   */
  async switch(id: string): Promise<void> {
    return post<void>('/organizations/switch', { organizationId: id })
  },

  // ==================== 成员管理 ====================

  /**
   * 获取组织成员列表
   */
  async getMembers(orgId: string): Promise<OrganizationMember[]> {
    return get<OrganizationMember[]>(`/organizations/${orgId}/members`)
  },

  /**
   * 添加成员
   */
  async addMember(orgId: string, data: { userId?: string; role?: string }): Promise<any> {
    return post<any>(`/organizations/${orgId}/members`, data)
  },

  /**
   * 移除成员
   */
  async removeMember(orgId: string, userId: string): Promise<void> {
    return del<void>(`/organizations/${orgId}/members?userId=${userId}`)
  },

  // ====================  ====================

  /**
   * 获取组织团队列表
   */
  async getTeams(orgId: string): Promise<OrganizationTeam[]> {
    return get<OrganizationTeam[]>(`/organizations/${orgId}/teams`)
  },

  /**
   * 删除团队
   */
  async deleteTeam(teamId: string): Promise<void> {
    return del<void>(`/teams/${teamId}`)
  },

  // ====================  ====================

  /**
   * 获取组织项目列表
   */
  async getProjects(orgId: string): Promise<OrganizationProject[]> {
    return get<OrganizationProject[]>(`/organizations/${orgId}/projects`)
  },

  /**
   * 删除项目
   */
  async deleteProject(projectId: string): Promise<void> {
    return del<void>(`/projects/${projectId}`)
  },

  // ====================  ====================

  /**
   * 创建加入请求
   */
  async createJoinRequest(data: { organizationId: string; message?: string }): Promise<any> {
    return post<any>('/organizations/join-requests', data)
  },

  /**
   * 同意加入请求
   */
  async approveJoinRequest(requestId: string): Promise<void> {
    return post<void>(`/organizations/join-requests/${requestId}/approve`)
  },

  /**
   * 拒绝加入请求
   */
  async rejectJoinRequest(requestId: string, reason?: string): Promise<void> {
    return post<void>(`/organizations/join-requests/${requestId}/reject`, { reason })
  },

  // ==================== 邀请码管理 ====================

  /**
   * 获取当前用户在指定组织的邀请码
   */
  async getInviteCode(orgId: string): Promise<{ inviteCode: string }> {
    return get<{ inviteCode: string }>(`/organizations/${orgId}/invite-code`)
  },

  /**
   * 验证邀请码是否有效
   */
  async validateInviteCode(orgId: string, inviteCode: string): Promise<{ valid: boolean; inviterName: string }> {
    return post<{ valid: boolean; inviterName: string }>(`/organizations/${orgId}/invite-code/validate`, { inviteCode })
  },
}
