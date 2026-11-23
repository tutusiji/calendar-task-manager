import { resolveOrganizationAccess } from "@/lib/modules/organization/organization.service"
import { findOrganizationProjects, findProjectIdentity, getUserArchiveMap, setProjectMemberArchive } from "./project.repository"

export async function listProjects(userId: string, organizationId: string | null) {
  const access = await resolveOrganizationAccess(userId, organizationId)
  if (access.kind === "missing") return { kind: "ok" as const, projects: [] }
  if (access.kind === "forbidden") return access

  const [orderedProjects, archiveMap] = await Promise.all([
    findOrganizationProjects(access.organizationId),
    getUserArchiveMap(userId, access.organizationId),
  ])
  // 格式化响应数据，包含成员详细信息
  const projects = orderedProjects.map(project => {
    const { members, _count, ...projectData } = project
    const archiveMeta = archiveMap.get(project.id)
    return {
      ...projectData,
      // 成员维度归档：只返回当前登录用户自己的归档标记
      isArchived: archiveMeta?.isArchived || false,
      archivedAt: archiveMeta?.archivedAt || null,
      memberIds: members.map(m => m.userId),
      members: members.map(m => m.user),
      memberCount: _count.members
    }
  })
  return { kind: "ok" as const, projects }
}

export async function setProjectArchive(userId: string, projectId: string, isArchived: boolean) {
  if (!(await findProjectIdentity(projectId))) return { kind: "not-found" as const }
  if (!(await setProjectMemberArchive(userId, projectId, isArchived))) {
    return { kind: "forbidden" as const }
  }
  return { kind: "ok" as const, data: { projectId, isArchived } }
}
