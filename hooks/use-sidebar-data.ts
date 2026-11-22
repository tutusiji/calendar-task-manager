import { useMemo } from 'react'

import type { Project, Team, User } from '@/lib/types'

interface UseSidebarDataParams {
  teams: Team[]
  projects: Project[]
  currentUser: User | null
}

/**
 * 侧边栏的派生数据与权限判断，独立于渲染逻辑。
 */
export function useSidebarData({
  teams,
  projects,
  currentUser,
}: UseSidebarDataParams) {
  const myTeams = useMemo(
    () =>
      currentUser
        ? teams.filter((team) => team.memberIds.includes(currentUser.id))
        : [],
    [teams, currentUser]
  )

  const myProjects = useMemo(
    () =>
      currentUser
        ? projects.filter(
            (project) =>
              project.memberIds.includes(currentUser.id) && !project.isArchived
          )
        : [],
    [projects, currentUser]
  )

  const archivedProjects = useMemo(
    () =>
      currentUser
        ? projects
            .filter(
              (project) =>
                project.memberIds.includes(currentUser.id) &&
                project.isArchived
            )
            .sort((a, b) => {
              if (a.archivedAt && b.archivedAt) {
                return (
                  new Date(b.archivedAt).getTime() -
                  new Date(a.archivedAt).getTime()
                )
              }
              return 0
            })
        : [],
    [projects, currentUser]
  )

  const canManageTeam = (team: Team) =>
    team.creatorId === currentUser?.id || !!currentUser?.isAdmin

  const canManageProject = (project: Project) =>
    project.creatorId === currentUser?.id || !!currentUser?.isAdmin

  return {
    myTeams,
    myProjects,
    archivedProjects,
    canManageTeam,
    canManageProject,
  }
}
