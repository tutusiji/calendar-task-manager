export interface ManagedOrganization {
  id: string
  name: string
  description?: string
  isVerified: boolean
  role?: string
  memberCount?: number
  teamCount?: number
  projectCount?: number
  creatorId: string
  joinRequiresApproval: boolean
}

export interface OrgDetails {
  creatorId?: string // 组织创建人ID
  members: Array<{
    id: string // 用户ID
    name: string
    email: string
    avatar?: string | null
    role: string
    joinedAt?: Date
    inviter?: {
      id: string
      name: string
    } | null
  }>
  teams: Array<{ id: string; name: string; color: string; memberCount: number }>
  projects: Array<{ id: string; name: string; color: string; memberCount: number }>
}
