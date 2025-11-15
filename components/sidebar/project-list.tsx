"use client"

import { useState } from "react"
import { Plus, MoreVertical, Pencil, Trash2, CheckCircle2, Circle, Eye, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { ProjectDialog } from "./project-dialog"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Project } from "@/lib/types"

export function ProjectList() {
  const { projects, deleteProject, leaveProject, selectedProjectIds, toggleProjectFilter, selectAllProjects, currentUser } = useCalendarStore()
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [viewingProject, setViewingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [leavingProject, setLeavingProject] = useState<Project | null>(null)

  const handleDelete = () => {
    if (deletingProject) {
      deleteProject(deletingProject.id)
      setDeletingProject(null)
    }
  }

  const handleLeave = () => {
    if (leavingProject) {
      leaveProject(leavingProject.id)
      setLeavingProject(null)
    }
  }

  // 检查用户是否可以编辑/删除项目（创建者或超管）
  const canManageProject = (project: Project) => {
    return project.creatorId === currentUser?.id || currentUser?.isAdmin
  }

  // 判断是否选中所有项目
  const isAllSelected = selectedProjectIds.length === projects.length && projects.length > 0
  
  // 判断某个项目是否被选中
  const isProjectSelected = (projectId: string) => {
    return selectedProjectIds.includes(projectId)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">项目标签</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={selectAllProjects}
            title={isAllSelected ? "已选中所有项目" : "选中所有项目"}
          >
            {isAllSelected ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setProjectDialogOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Project list */}
      <div className="space-y-1">
        {projects.map((project) => {
          const selected = isProjectSelected(project.id)
          
          return (
            <div
              key={project.id}
              className={cn(
                "group flex items-center gap-2 rounded-md px-2 py-2 transition-colors cursor-pointer hover:bg-muted/50"
              )}
              onClick={() => toggleProjectFilter(project.id)}
            >
              {/* 空心圆/实心圆 */}
              {selected ? (
                // 选中态：实心圆
                <div 
                  className="h-4 w-4 rounded-full shrink-0" 
                  style={{ backgroundColor: project.color }} 
                />
              ) : (
                // 未选中态：空心圆
                <div 
                  className="h-4 w-4 rounded-full shrink-0 border-2" 
                  style={{ borderColor: project.color }} 
                />
              )}
              
              <span className={cn(
                "flex-1 truncate text-sm transition-colors",
                selected ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {project.name}
              </span>
            
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {canManageProject(project) ? (
                    <>
                      <DropdownMenuItem 
                        className="cursor-pointer" 
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingProject(project)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="cursor-pointer" 
                        variant="destructive" 
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingProject(project)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        删除
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem 
                        className="cursor-pointer" 
                        onClick={(e) => {
                          e.stopPropagation()
                          setViewingProject(project)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        查看
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="cursor-pointer" 
                        variant="destructive" 
                        onClick={(e) => {
                          e.stopPropagation()
                          setLeavingProject(project)
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        退出
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        })}
      </div>

      {/* 统一的项目弹窗 */}
      {(projectDialogOpen || editingProject || viewingProject) && (
        <ProjectDialog 
          project={editingProject || viewingProject || undefined}
          viewOnly={!!viewingProject}
          onClose={() => {
            setProjectDialogOpen(false)
            setEditingProject(null)
            setViewingProject(null)
          }} 
        />
      )}

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deletingProject} onOpenChange={(open) => !open && setDeletingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除项目</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除项目 "{deletingProject?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 退出确认对话框 */}
      <AlertDialog open={!!leavingProject} onOpenChange={(open) => !open && setLeavingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认退出项目</AlertDialogTitle>
            <AlertDialogDescription>
              确定要退出项目 "{leavingProject?.name}" 吗？退出后将无法查看该项目的任务。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
