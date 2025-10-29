"use client"

import { useState } from "react"
import { Plus, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { NewProjectDialog } from "./new-project-dialog"

export function ProjectList() {
  const { projects } = useCalendarStore()
  const [showNewProject, setShowNewProject] = useState(false)

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
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {showNewProject && <NewProjectDialog onClose={() => setShowNewProject(false)} />}
    </div>
  )
}
