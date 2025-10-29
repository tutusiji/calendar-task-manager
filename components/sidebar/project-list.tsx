"use client"

import { useState } from "react"
import { Plus, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { NewProjectDialog } from "./new-project-dialog"
import { EditProjectDialog } from "./edit-project-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
  const { projects, deleteProject } = useCalendarStore()
  const [showNewProject, setShowNewProject] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)

  const handleDelete = () => {
    if (deletingProject) {
      deleteProject(deletingProject.id)
      setDeletingProject(null)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">项目管理</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowNewProject(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Project list */}
      <div className="space-y-1">
        {projects.map((project) => (
          <div
            key={project.id}
            className="group flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-muted"
          >
            <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
            <span className="flex-1 truncate text-sm text-foreground">{project.name}</span>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem className="cursor-pointer" onClick={() => setEditingProject(project)}>
                  <Pencil className="h-4 w-4 cursor-pointer" />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" variant="destructive" onClick={() => setDeletingProject(project)}>
                  <Trash2 className="h-4 w-4" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      {showNewProject && <NewProjectDialog onClose={() => setShowNewProject(false)} />}
      {editingProject && <EditProjectDialog project={editingProject} onClose={() => setEditingProject(null)} />}

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
    </div>
  )
}
