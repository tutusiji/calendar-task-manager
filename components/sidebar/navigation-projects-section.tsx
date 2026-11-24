"use client"

import type { DragEvent } from "react"
import { Archive, Eye, FolderClosed, LogOut, Pencil, Trash2, UserRound } from "lucide-react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import type { Project, User } from "@/lib/types"
import { SidebarItem, SidebarItemMenuTrigger, SidebarSection } from "./sidebar-navigation"

export function NavigationProjectsSection({
  compact,
  onExpandSidebar,
  handleCreateProject,
  myProjects,
  handleProjectDragOver,
  persistProjectOrder,
  draggedProjectId,
  setDraggedProjectId,
  onSelect,
  selectedProjectId,
  currentUser,
  canManageProject,
  handleEditProject,
  handleArchiveProject,
  handleDeleteProject,
  handleViewProject,
  handleLeaveProject,
}: {
  compact: boolean
  onExpandSidebar: () => void
  handleCreateProject: () => void
  myProjects: Project[]
  handleProjectDragOver: (event: DragEvent<HTMLDivElement>, targetId: string) => void
  persistProjectOrder: () => void
  draggedProjectId: string | null
  setDraggedProjectId: (id: string) => void
  onSelect: (id: string) => void
  selectedProjectId: string | null
  currentUser: User | null
  canManageProject: (project: Project) => boolean
  handleEditProject: (project: Project) => void
  handleArchiveProject: (project: Project) => Promise<void>
  handleDeleteProject: (project: Project) => void
  handleViewProject: (project: Project) => void
  handleLeaveProject: (project: Project) => void
}) {
  return (
    <SidebarSection
      label="我的项目"
      icon={FolderClosed}
      count={myProjects.length}
      active={myProjects.some((project) => project.id === selectedProjectId)}
      compact={compact}
      onExpandSidebar={onExpandSidebar}
      add={{ label: "新建项目", onClick: handleCreateProject }}
    >
      {myProjects.map((project) => {
        const personal = project.type === "PERSONAL"
        const canManage = canManageProject(project)

        return (
          <SidebarItem
            key={project.id}
            name={project.name}
            icon={personal ? UserRound : FolderClosed}
            color={project.color}
            active={selectedProjectId === project.id}
            owner={!personal && project.creatorId === currentUser?.id}
            badge={personal ? { label: "个人", description: "个人事务项目" } : undefined}
            onSelect={() => onSelect(project.id)}
            drag={{
              active: draggedProjectId === project.id,
              label: `拖拽调整项目 ${project.name} 的顺序`,
              onStart: (event) => {
                setDraggedProjectId(project.id)
                event.dataTransfer.effectAllowed = "move"
                event.dataTransfer.setData("text/plain", project.id)
              },
              onEnd: persistProjectOrder,
              onOver: (event) => handleProjectDragOver(event, project.id),
            }}
            actions={!personal && (
              <DropdownMenu>
                <SidebarItemMenuTrigger label={`${project.name} 项目操作`} />
                <DropdownMenuContent align="end">
                  {canManage ? (
                    <DropdownMenuItem onSelect={() => handleEditProject(project)}>
                      <Pencil /> 编辑
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onSelect={() => handleViewProject(project)}>
                      <Eye /> 查看
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => void handleArchiveProject(project)}>
                    <Archive /> 归档
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
