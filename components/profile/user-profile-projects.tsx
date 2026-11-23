"use client"

import type { ProjectWithMembers } from "@/lib/api-client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card,CardContent,CardHeader,CardTitle } from "@/components/ui/card"
import { FolderKanban,Edit,LogOut,Trash2,Crown } from "lucide-react"
import { Avatar,AvatarFallback,AvatarImage } from "@/components/ui/avatar"
import { Tooltip,TooltipContent,TooltipProvider,TooltipTrigger } from "@/components/ui/tooltip"
import type { User } from "@/lib/types"
import type * as React from "react"

export function UserProfileProjects({
  allProjects,
  currentUser,
  setConfirmLeaveProject,
  isLeaving,
  handleJoinProject,
  isJoining,
  handleEditProject,
  setConfirmDeleteProject,
}: {
  allProjects: ProjectWithMembers[]
  currentUser: User
  setConfirmLeaveProject: React.Dispatch<React.SetStateAction<string | null>>
  isLeaving: string | null
  handleJoinProject: (projectId: string) => Promise<void>
  isJoining: string | null
  handleEditProject: (projectId: string) => void
  setConfirmDeleteProject: React.Dispatch<React.SetStateAction<string | null>>
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FolderKanban className="h-5 w-5" />
          项目列表
          <Badge variant="outline" className="ml-auto">
            {allProjects.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto max-h-[300px]">
        {allProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无项目</p>
        ) : (
          <div className="space-y-3">
            {allProjects.map((project) => {
              const isCreator = project.creatorId === currentUser.id
              const isMember = project.memberIds?.includes(currentUser.id) || false
              return (
                <div
                  key={project.id}
                  className="rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 p-3">
                    <div
                      className="h-10 w-10 rounded-lg shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{project.name}</h4>
                        {isCreator && (
                          <Badge variant="secondary" className="text-xs">
                            <Crown className="mr-1 h-3 w-3" />
                            创建者
                          </Badge>
                        )}
                      </div>
                      {project.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <TooltipProvider>
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <Badge variant="secondary" className="text-xs cursor-help">
                                {project.memberIds?.length || 0} 成员
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <div className="space-y-2">
                                <p className="font-semibold text-xs mb-2">项目成员</p>
                                <div className="grid gap-2">
                                  {project.members?.map((member: any) => (
                                    <div key={member.id} className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={member.avatar} />
                                        <AvatarFallback className="text-xs">
                                          {member.name?.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs">{member.name}</span>
                                    </div>
                                  )) || (
                                    <p className="text-xs text-muted-foreground">暂无成员信息</p>
                                  )}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    {/* 操作按钮 - 非创建者显示在右侧 */}
                    {!isCreator && (
                      <div className="flex items-center gap-2 shrink-0">
                        {isMember ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-orange-500 hover:text-orange-600"
                            onClick={() => setConfirmLeaveProject(project.id)}
                            disabled={isLeaving === project.id}
                          >
                            <LogOut className="mr-1 h-3 w-3" />
                            {isLeaving === project.id ? '退出中...' : '退出'}
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleJoinProject(project.id)}
                            disabled={isJoining === project.id}
                          >
                            {isJoining === project.id ? '加入中...' : '加入'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  {/* 创建者的编辑和删除按钮显示在底部 */}
                  {isCreator && (
                    <div className="flex items-center gap-2 px-3 pb-3 pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditProject(project.id)}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-500 hover:text-red-600"
                        onClick={() => setConfirmDeleteProject(project.id)}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        删除
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
