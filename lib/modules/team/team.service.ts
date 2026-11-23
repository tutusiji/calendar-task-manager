import { resolveOrganizationAccess } from "@/lib/modules/organization/organization.service"
import { findOrganizationTeams } from "./team.repository"

export async function listTeams(userId: string, organizationId: string | null) {
  const access = await resolveOrganizationAccess(userId, organizationId)
  if (access.kind === "missing") return { kind: "ok" as const, teams: [] }
  if (access.kind === "forbidden") return access

  const orderedTeams = await findOrganizationTeams(access.organizationId)
  // 格式化响应数据，包含成员详细信息
  const teams = orderedTeams.map(team => {
    const { members, _count, ...teamData } = team
    return {
      ...teamData,
      memberIds: members.map(m => m.userId),
      members: members.map(m => m.user),
      memberCount: _count.members
    }
  })
  return { kind: "ok" as const, teams }
}
