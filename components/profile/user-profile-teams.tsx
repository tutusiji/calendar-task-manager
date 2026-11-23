"use client"

import type { TeamWithMembers } from "@/lib/api-client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card,CardContent,CardHeader,CardTitle } from "@/components/ui/card"
import { Users,Edit,LogOut,Trash2,Crown,Pin } from "lucide-react"
import { Avatar,AvatarFallback,AvatarImage } from "@/components/ui/avatar"
import { Tooltip,TooltipContent,TooltipProvider,TooltipTrigger } from "@/components/ui/tooltip"
import type { User } from "@/lib/types"
import { showToast } from "@/lib/toast"
import { userAPI } from "@/lib/api-client"
import type * as React from "react"

export function UserProfileTeams({
  allTeams,
  currentUser,
  setCurrentUser,
  setConfirmLeaveTeam,
  isLeaving,
  handleJoinTeam,
  isJoining,
  handleEditTeam,
  setConfirmDeleteTeam,
}: {
  allTeams: TeamWithMembers[]
  currentUser: User
  setCurrentUser: (user: User) => void
  setConfirmLeaveTeam: React.Dispatch<React.SetStateAction<string | null>>
  isLeaving: string | null
  handleJoinTeam: (teamId: string) => Promise<void>
  isJoining: string | null
  handleEditTeam: (teamId: string) => void
  setConfirmDeleteTeam: React.Dispatch<React.SetStateAction<string | null>>
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          团队列表
          <Badge variant="outline" className="ml-auto">
            {allTeams.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto max-h-[300px]">
        {allTeams.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无团队</p>
        ) : (
          <div className="space-y-3">
            {allTeams.map((team) => {
              const isCreator = team.creatorId === currentUser.id
              const isMember = team.memberIds?.includes(currentUser.id) || false
              return (
                <div
                  key={team.id}
                  className="rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 p-3">
                    <div
                      className="h-10 w-10 rounded-lg shrink-0"
                      style={{ backgroundColor: team.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{team.name}</h4>
                        {isCreator && (
                          <Badge variant="secondary" className="text-xs">
                            <Crown className="mr-1 h-3 w-3" />
                            创建者
                          </Badge>
                        )}
                        {currentUser.defaultTeamId === team.id && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
                            默认
                          </Badge>
                        )}
                      </div>
                      {team.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {team.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <TooltipProvider>
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <Badge variant="secondary" className="text-xs cursor-help">
                                {team.memberIds?.length || 0} 成员
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <div className="space-y-2">
                                <p className="font-semibold text-xs mb-2">团队成员</p>
                                <div className="grid gap-2">
                                  {team.members?.map((member: any) => (
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
                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2 shrink-0">
                      {currentUser.defaultTeamId !== team.id && isMember && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="设为默认团队"
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              const updatedUser = await userAPI.updateMe({ defaultTeamId: team.id })
                              setCurrentUser(updatedUser)
                              localStorage.setItem('currentUser', JSON.stringify(updatedUser))
                              showToast.success('设置成功', '已设为默认团队')
                            } catch (error) {
                              showToast.error('设置失败', '请稍后重试')
                            }
                          }}
                        >
                          <Pin className="h-4 w-4" />
                        </Button>
                      )}
                      {!isCreator && (
                        <>
                          {isMember ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-orange-500 hover:text-orange-600"
                              onClick={() => setConfirmLeaveTeam(team.id)}
                              disabled={isLeaving === team.id}
                            >
                              <LogOut className="mr-1 h-3 w-3" />
                              {isLeaving === team.id ? '退出中...' : '退出'}
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleJoinTeam(team.id)}
                              disabled={isJoining === team.id}
                            >
                              {isJoining === team.id ? '加入中...' : '加入'}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {/* 创建者的编辑和删除按钮显示在底部 */}
                  {isCreator && (
                    <div className="flex items-center gap-2 px-3 pb-3 pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditTeam(team.id)}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-500 hover:text-red-600"
                        onClick={() => setConfirmDeleteTeam(team.id)}
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
