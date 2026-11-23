"use client"

import { useState,type DragEvent } from "react"
import { Plus,ChevronDown,ChevronRight,MoreVertical,Pencil,Trash2,Crown,Eye,LogOut,Pin,Archive,GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger,DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import type { Project } from "@/lib/types"
import type * as React from "react"
import type { NavigationMode,User } from "@/lib/types"

export function NavigationProjectsSection({
  handleCreateProject,
  myProjects,
  handleProjectDragOver,
  persistProjectOrder,
  draggedProjectId,
  setDraggedProjectId,
  setNavigationMode,
  setSelectedProjectId,
  navigationMode,
  selectedProjectId,
  currentUser,
  canManageProject,
  handleEditProject,
  handleArchiveProject,
  handleDeleteProject,
  handleViewProject,
  handleLeaveProject,
}: {
  handleCreateProject: () => void
  myProjects: Project[]
  handleProjectDragOver: (event: DragEvent<HTMLDivElement>, targetId: string) => void
  persistProjectOrder: () => void
  draggedProjectId: string | null
  setDraggedProjectId: React.Dispatch<React.SetStateAction<string | null>>
  setNavigationMode: (mode: NavigationMode) => void
  setSelectedProjectId: (id: string | null) => Promise<void>
  navigationMode: NavigationMode
  selectedProjectId: string | null
  currentUser: User | null
  canManageProject: (project: Project) => boolean
  handleEditProject: (project: Project) => void
  handleArchiveProject: (project: Project) => Promise<void>
  handleDeleteProject: (project: Project) => void
  handleViewProject: (project: Project) => void
  handleLeaveProject: (project: Project) => void
}) {
  const [projectsExpanded, setProjectsExpanded] = useState(true)

  return (
    <div>
      <div className="flex items-center gap-2 py-2 px-1 mx-1">
        <button
          onClick={() => setProjectsExpanded(!projectsExpanded)}
          className="flex items-center gap-2 flex-1 text-sm font-medium hover:bg-muted/50 rounded-md p-1"
        >
          {projectsExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 7c0-1.1.9-2 2-2h5l2 2h7c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" fill="#A855F7" />
            <path d="M3 7h18" stroke="#7C3AED" strokeWidth="1.5" />
            <rect x="7" y="11" width="3" height="5" rx="1" fill="#E9D5FF" />
            <rect x="12" y="11" width="3" height="5" rx="1" fill="#E9D5FF" />
          </svg>
          <span style={{ fontFamily: 'Micro, sans-serif', fontWeight: 900, fontSize: '16px', letterSpacing: '0.5px' }}>My Projects</span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCreateProject}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {projectsExpanded && (
        <div className="ml-6 mt-1 space-y-1">
          {myProjects.map((project) => {
            const isPersonalProject = project.name.includes('个人事务')

            return (
            <div
              key={project.id}
              onDragOver={(event) => handleProjectDragOver(event, project.id)}
              onDrop={persistProjectOrder}
              className={cn(
                "group flex items-center gap-1 pr-2 transition-opacity",
                draggedProjectId === project.id && "opacity-60"
              )}
            >
              <button
                type="button"
                draggable
                onDragStart={(event) => {
                  setDraggedProjectId(project.id)
                  event.dataTransfer.effectAllowed = "move"
                  event.dataTransfer.setData("text/plain", project.id)
                }}
                onDragEnd={persistProjectOrder}
                className="flex h-8 w-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
                aria-label={`拖拽调整项目 ${project.name} 的顺序`}
                title="拖拽调整顺序"
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <button
                onClick={async () => {
                  setNavigationMode("project")
                  await setSelectedProjectId(project.id)
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/50 rounded-md flex-1 text-left",
                  navigationMode === "project" && selectedProjectId === project.id && "bg-muted"
                )}
              >
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <span className="truncate max-w-[150px]" title={project.name}>{project.name}</span>
                {isPersonalProject && (
                  <Pin className="h-3 w-3 text-muted-foreground shrink-0 ml-auto translate-x-[-6px] rotate-45" />
                )}
                {!isPersonalProject && currentUser && project.creatorId === currentUser.id && (
                  <Crown className="h-3 w-3 text-yellow-600 shrink-0 ml-auto" />
                )}
              </button>

              {/*
                个人事务项目保留固定的系统项目限制，不显示编辑/删除菜单。
              */}
              {!isPersonalProject && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canManageProject(project) ? (
                      <>
                        <DropdownMenuItem onClick={() => handleEditProject(project)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>编辑</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchiveProject(project)}>
                          <Archive className="mr-2 h-4 w-4" />
                          <span>归档</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteProject(project)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>删除</span>
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={() => handleViewProject(project)}>
                          <Eye className="mr-2 h-4 w-4" />
                          <span>查看</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchiveProject(project)}>
                          <Archive className="mr-2 h-4 w-4" />
                          <span>归档</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleLeaveProject(project)}
                          className="text-orange-600 focus:text-orange-600"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>退出</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
