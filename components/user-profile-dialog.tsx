"use client"

import { useCalendarStore } from "@/lib/store/calendar-store"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Briefcase, Users, FolderKanban } from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface UserProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserProfileDialog({ open, onOpenChange }: UserProfileDialogProps) {
  const { currentUser, teams, projects } = useCalendarStore()

  // 获取用户名首字母
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  // 获取用户所在的团队
  const userTeams = teams.filter((team) => team.memberIds.includes(currentUser.id))

  // 获取用户参与的项目
  const userProjects = projects.filter((project) => project.memberIds.includes(currentUser.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>个人信息</DialogTitle>
          <DialogDescription>查看您的详细信息、团队和项目</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本信息 */}
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                {getInitials(currentUser.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-2xl font-semibold">{currentUser.name}</h3>
                <Badge variant="secondary" className="mt-2">
                  <Briefcase className="mr-1 h-3 w-3" />
                  T1000
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{currentUser.email}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* 团队和项目信息 - 并列显示 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 团队信息 */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" />
                  所属团队
                  <Badge variant="outline" className="ml-auto">
                    {userTeams.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto max-h-[300px]">
                {userTeams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂未加入任何团队</p>
                ) : (
                  <div className="space-y-3">
                    {userTeams.map((team) => (
                      <div
                        key={team.id}
                        className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
                      >
                        <div
                          className="h-10 w-10 rounded-lg shrink-0"
                          style={{ backgroundColor: team.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm">{team.name}</h4>
                          {team.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {team.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {team.memberIds.length} 成员
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 项目信息 */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FolderKanban className="h-5 w-5" />
                  参与项目
                  <Badge variant="outline" className="ml-auto">
                    {userProjects.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto max-h-[300px]">
                {userProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂未参与任何项目</p>
                ) : (
                  <div className="space-y-3">
                    {userProjects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
                      >
                        <div
                          className="h-10 w-10 rounded-lg shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm">{project.name}</h4>
                          {project.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {project.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {project.memberIds.length} 成员
                            </Badge>
                            {project.teamId && (
                              <Badge variant="outline" className="text-xs">
                                团队项目
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
