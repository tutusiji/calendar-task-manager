"use client"

import { useState } from "react"
import { ChevronDown,ChevronRight,MoreVertical,Trash2,Crown,Eye,LogOut,Archive,ArchiveRestore } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger,DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import type { Project } from "@/lib/types"
import type { NavigationMode,User } from "@/lib/types"

export function NavigationArchivedProjectsSection({
  archivedProjects,
  setNavigationMode,
  setSelectedProjectId,
  navigationMode,
  selectedProjectId,
  currentUser,
  canManageProject,
  handleUnarchiveProject,
  handleDeleteProject,
  handleViewProject,
  handleLeaveProject,
}: {
  archivedProjects: Project[]
  setNavigationMode: (mode: NavigationMode) => void
  setSelectedProjectId: (id: string | null) => Promise<void>
  navigationMode: NavigationMode
  selectedProjectId: string | null
  currentUser: User | null
  canManageProject: (project: Project) => boolean
  handleUnarchiveProject: (project: Project) => Promise<void>
  handleDeleteProject: (project: Project) => void
  handleViewProject: (project: Project) => void
  handleLeaveProject: (project: Project) => void
}) {
  const [archivedProjectsExpanded, setArchivedProjectsExpanded] = useState(false)

  return (
    <>
      {archivedProjects.length > 0 && (
        <div>
          <div className="flex items-center gap-2 py-2 px-1 mx-1">
            <button
              onClick={() => setArchivedProjectsExpanded(!archivedProjectsExpanded)}
              className="flex items-center gap-2 flex-1 text-sm font-medium hover:bg-muted/50 rounded-md p-1"
            >
              {archivedProjectsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Archive className="h-5 w-5 text-muted-foreground" />
              <span style={{ fontFamily: 'Micro, sans-serif', fontWeight: 900, fontSize: '16px', letterSpacing: '0.5px' }} className="text-muted-foreground">
                My Archive ({archivedProjects.length})
              </span>
            </button>
          </div>

          {archivedProjectsExpanded && (
            <div className="ml-6 mt-1 space-y-1">
              {archivedProjects.map((project) => (
                <div
                  key={project.id}
                  className="group flex items-center gap-2 pr-2"
                >
                  <button
                    onClick={async () => {
                      setNavigationMode("project")
                      await setSelectedProjectId(project.id)
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-muted/50 rounded-md flex-1 text-left opacity-60",
                      navigationMode === "project" && selectedProjectId === project.id && "bg-muted"
                    )}
                  >
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate max-w-[150px]" title={project.name}>{project.name}</span>
                    {currentUser && project.creatorId === currentUser.id && (
                      <Crown className="h-3 w-3 text-yellow-600 shrink-0 ml-auto" />
                    )}
                  </button>

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
                          <DropdownMenuItem onClick={() => handleUnarchiveProject(project)}>
                            <ArchiveRestore className="mr-2 h-4 w-4" />
                            <span>取消归档</span>
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
                          <DropdownMenuItem onClick={() => handleUnarchiveProject(project)}>
                            <ArchiveRestore className="mr-2 h-4 w-4" />
                            <span>取消归档</span>
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
