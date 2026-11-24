"use client"

import { Archive, ArchiveRestore, Eye, LogOut, Trash2 } from "lucide-react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import type { Project, User } from "@/lib/types"
import { SidebarItem, SidebarItemMenuTrigger, SidebarSection } from "./sidebar-navigation"

export function NavigationArchivedProjectsSection({
  compact,
  onExpandSidebar,
  archivedProjects,
  onSelect,
  selectedProjectId,
  currentUser,
  canManageProject,
  handleUnarchiveProject,
  handleDeleteProject,
  handleViewProject,
  handleLeaveProject,
}: {
  compact: boolean
  onExpandSidebar: () => void
  archivedProjects: Project[]
  onSelect: (id: string) => void
  selectedProjectId: string | null
  currentUser: User | null
  canManageProject: (project: Project) => boolean
  handleUnarchiveProject: (project: Project) => Promise<void>
  handleDeleteProject: (project: Project) => void
  handleViewProject: (project: Project) => void
  handleLeaveProject: (project: Project) => void
}) {
  if (!archivedProjects.length) return null

  const active = archivedProjects.some((project) => project.id === selectedProjectId)

  return (
    <SidebarSection
      label="归档"
      icon={Archive}
      count={archivedProjects.length}
      active={active}
      compact={compact}
      defaultExpanded={active}
      onExpandSidebar={onExpandSidebar}
    >
      {archivedProjects.map((project) => {
        const canManage = canManageProject(project)

        return (
          <SidebarItem
            key={project.id}
            name={project.name}
            icon={Archive}
            color={project.color}
            active={selectedProjectId === project.id}
            owner={project.creatorId === currentUser?.id}
            onSelect={() => onSelect(project.id)}
            actions={(
              <DropdownMenu>
                <SidebarItemMenuTrigger label={`${project.name} 归档项目操作`} />
                <DropdownMenuContent align="end">
                  {!canManage && (
                    <DropdownMenuItem onSelect={() => handleViewProject(project)}>
                      <Eye /> 查看
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => void handleUnarchiveProject(project)}>
                    <ArchiveRestore /> 取消归档
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {canManage ? (
                    <DropdownMenuItem variant="destructive" onSelect={() => handleDeleteProject(project)}>
                      <Trash2 /> 删除
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem className="text-orange-600 focus:text-orange-600" onSelect={() => handleLeaveProject(project)}>
                      <LogOut /> 退出
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        )
      })}
    </SidebarSection>
  )
}
