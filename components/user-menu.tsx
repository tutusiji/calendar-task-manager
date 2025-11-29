"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCalendarStore } from "@/lib/store/calendar-store"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, LogOut, Settings, Building2 } from "lucide-react"
import { UserProfileDialog } from "./user-profile-dialog"
import { OrganizationManagementDialog } from "./organization-management-dialog"
import { getRank } from "@/lib/utils/rank"

export function UserMenu() {
  const router = useRouter()
  const { currentUser, teams } = useCalendarStore()
  const [profileOpen, setProfileOpen] = useState(false)
  const [organizationOpen, setOrganizationOpen] = useState(false)

  const handleLogout = () => {
    // 清除本地存储的用户信息
    localStorage.removeItem("currentUser")
    // 跳转到登录页
    router.push("/login")
  }

  const handleProfile = () => {
    setProfileOpen(true)
  }

  // 获取用户名首字母作为头像后备
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  // 如果没有当前用户，不渲染
  if (!currentUser) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(currentUser.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{currentUser.name}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{currentUser.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {currentUser.email}
              </p>
              <div className="flex items-center gap-2 pt-1">
                {/* Points Level */}
                <div 
                  className="text-xs "
                  title={`当前积分: ${currentUser.points || 0}`}
                >
                  Lv.{Math.floor(currentUser.points ? currentUser.points / 100 : 0) + 1} {getRank(currentUser.points || 0).name}
                </div>
                {/* Default Team */}
                {/* {currentUser.defaultTeamId && (
                  <div className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-blue-100 text-blue-700 hover:bg-blue-200">
                    {teams.find(t => t.id === currentUser.defaultTeamId)?.name || '默认团队'}
                  </div>
                )} */}
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleProfile} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>个人中心</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setOrganizationOpen(true)} 
            className="cursor-pointer"
          >
            <Building2 className="mr-2 h-4 w-4" />
            <span>空间管理</span>
          </DropdownMenuItem>
          {/* <DropdownMenuItem className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>设置</span>
          </DropdownMenuItem> */}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            <span>退出登录</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <OrganizationManagementDialog open={organizationOpen} onOpenChange={setOrganizationOpen} />
    </>
  )
}
