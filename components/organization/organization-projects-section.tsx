"use client"

import { Button } from "@/components/ui/button"
import { FolderKanban,Trash2,Plus } from "lucide-react"
import type * as React from "react"
import type { OrgDetails } from "./organization-types"

export function OrganizationProjectsSection({
  orgDetails,
  isOwner,
  setProjectDialogOpen,
  setDeleteDialog,
}: {
  orgDetails: OrgDetails
  isOwner: boolean
  setProjectDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  setDeleteDialog: React.Dispatch<React.SetStateAction<{ open: boolean; type: "member" | "team" | "project"; id: string; name: string; } | null>>
}) {
  const standardProjects = orgDetails.projects.filter(project => project.type === 'STANDARD')
  const personalProjects = orgDetails.projects.filter(project => project.type === 'PERSONAL')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <FolderKanban className="h-5 w-5" />
          项目 ({standardProjects.length})
        </h3>
        {isOwner && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setProjectDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
        {/* 正常项目 */}
        {standardProjects.map((project) => (
          <div
            key={project.id}
            className="text-sm p-3 rounded-lg border hover:bg-accent/50 transition-colors relative group"
          >
            {/* 删除按钮 - 只有所有者可见 */}
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute bottom-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-transparent"
                onClick={() => setDeleteDialog({
                  open: true,
                  type: 'project',
                  id: project.id,
                  name: project.name
                })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <span className="font-medium truncate text-base">{project.name}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {project.memberCount} 成员
            </div>
          </div>
        ))}
        {standardProjects.length === 0 && (
          <div className="text-sm text-muted-foreground py-8 text-center">暂无项目</div>
        )}

        {/* 个人事务项目 - 灰色显示,不显示删除按钮 */}
        {personalProjects.length > 0 && (
          <>
            <div className="text-xs text-muted-foreground pt-2 pb-1 border-t">
              个人事务项目:
            </div>
            {personalProjects.map((project) => (
              <div
                key={project.id}
                className="text-sm p-3 rounded-lg border border-dashed bg-muted/20 opacity-60"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full shrink-0 opacity-50"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="font-medium truncate text-base text-muted-foreground">{project.name}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {project.memberCount} 成员
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
