import {
  findCurrentOrganization,
  findOrganizationMembership,
  findOrganizationMemberships,
  setCurrentOrganization,
} from "./organization.repository"

export async function resolveOrganizationAccess(userId: string, organizationId?: string | null) {
  const target = organizationId || (await findCurrentOrganization(userId))?.currentOrganizationId
  if (!target) return { kind: "missing" as const }
  const membership = await findOrganizationMembership(userId, target)
  if (!membership) return { kind: "forbidden" as const }
  return { kind: "allowed" as const, organizationId: target }
}

export async function listUserOrganizations(userId: string, organizationId?: string | null) {
  const organizationMembers = await findOrganizationMemberships(userId, organizationId)
  return organizationMembers.map((om) => ({
    id: om.organization.id,
    name: om.organization.name,
    description: om.organization.description,
    isVerified: om.organization.isVerified,
    creatorId: om.organization.creatorId,
    joinRequiresApproval: om.organization.joinRequiresApproval,
    role: om.role,
    memberCount: om.organization._count.members,
    teamCount: om.organization._count.teams,
    projectCount: om.organization._count.projects,
    createdAt: om.organization.createdAt,
  }))
}

export async function switchOrganization(userId: string, organizationId: string) {
  if (!(await findOrganizationMembership(userId, organizationId))) return false
  await setCurrentOrganization(userId, organizationId)
  return true
}
