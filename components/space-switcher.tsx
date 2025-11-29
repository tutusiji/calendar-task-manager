"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { organizationAPI } from "@/lib/api/organization"

interface Organization {
  id: string
  name: string
  role?: string
}

export function SpaceSwitcher() {
  const router = useRouter()
  const { toast } = useToast()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 获取用户的组织列表
  const fetchOrganizations = async () => {
    try {
      // console.log("Fetching organizations...")
      const data = await organizationAPI.getAll()
      // console.log("Organizations data:", data)
      
      if (data && data.length > 0) {
        setOrganizations(data)
        
        // 从用户信息中获取当前组织
        const userStr = localStorage.getItem("currentUser")
        // console.log("Current user from localStorage:", userStr)
        
        let targetOrgId: string | null = null
        
        if (userStr) {
          const user = JSON.parse(userStr)
          // console.log("Current organization ID:", user.currentOrganizationId)
          targetOrgId = user.currentOrganizationId
        }
        
        // 保险措施: 如果没有选中的组织,自动选择第一个
        if (!targetOrgId) {
          console.warn("No current organization found, selecting first organization as fallback")
          targetOrgId = data[0].id
          
          // 更新后端和 localStorage
          try {
            await organizationAPI.switch(targetOrgId)
            // 更新 localStorage 中的用户信息
            if (userStr) {
              const user = JSON.parse(userStr)
              user.currentOrganizationId = targetOrgId
              localStorage.setItem("currentUser", JSON.stringify(user))
              // console.log("Updated currentOrganizationId to:", targetOrgId)
            }
          } catch (error) {
            console.error("Failed to switch to default organization:", error)
          }
        }
        
        setCurrentOrgId(targetOrgId)
      }
    } catch (error) {
      console.error("获取组织列表失败:", error)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [])

  // 额外的保险检查: 监控 currentOrgId 和 organizations,确保始终有选中的组织
  useEffect(() => {
    if (organizations.length > 0 && !currentOrgId) {
      console.warn("No organization selected, auto-selecting first one")
      const firstOrgId = organizations[0].id
      setCurrentOrgId(firstOrgId)
      
      // 更新 localStorage
      const userStr = localStorage.getItem("currentUser")
      if (userStr) {
        const user = JSON.parse(userStr)
        user.currentOrganizationId = firstOrgId
        localStorage.setItem("currentUser", JSON.stringify(user))
      }
    }
  }, [organizations, currentOrgId])

  const handleSwitchOrganization = async (orgId: string) => {
    if (orgId === currentOrgId) return

    setIsLoading(true)
    try {
      await organizationAPI.switch(orgId)
      setCurrentOrgId(orgId)
      
      // 更新 localStorage 中的用户信息
      const userStr = localStorage.getItem("currentUser")
      if (userStr) {
        const user = JSON.parse(userStr)
        user.currentOrganizationId = orgId
        localStorage.setItem("currentUser", JSON.stringify(user))
      }
      
      // 重置导航状态到 My Days
      const storeKey = "calendar-storage-v2"
      const storeStr = localStorage.getItem(storeKey)
      if (storeStr) {
        try {
          const store = JSON.parse(storeStr)
          if (store.state) {
            // 重置导航状态
            store.state.navigationMode = "my-days"
            store.state.selectedTeamId = null
            store.state.selectedProjectId = null
            localStorage.setItem(storeKey, JSON.stringify(store))
          }
        } catch (e) {
          console.error("Failed to reset navigation state:", e)
        }
      }
      
      toast({
        title: "已切换空间",
        description: "正在加载新空间的数据...",
        duration: 2000,
      })
      
      // 使用硬刷新确保完全重新加载页面和数据
      setTimeout(() => {
        window.location.href = "/"
      }, 300)
    } catch (error) {
      console.error("切换组织失败:", error)
      toast({
        title: "切换失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const currentOrg = organizations.find((org) => org.id === currentOrgId)

  if (organizations.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium",
          "hover:bg-muted/50 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
        disabled={isLoading}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="8" height="8" rx="2" fill="#10B981" />
          <rect x="13" y="3" width="8" height="8" rx="2" fill="#34D399" />
          <rect x="3" y="13" width="8" height="8" rx="2" fill="#34D399" />
          <rect x="13" y="13" width="8" height="8" rx="2" fill="#6EE7B7" />
        </svg>
        <span style={{ fontFamily: 'Micro, sans-serif', fontWeight: 900, fontSize: '16px', letterSpacing: '0.5px' }}>My Space</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-foreground font-semibold">
          {currentOrg?.name || "选择空间"}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitchOrganization(org.id)}
            className={cn(
              "flex items-center justify-between cursor-pointer",
              org.id === currentOrgId && "bg-accent"
            )}
          >
            <div className="flex flex-col">
              <span className="font-medium">{org.name}</span>
              {org.role && (
                <span className="text-xs text-muted-foreground">
                  {org.role === "OWNER" ? "所有者" : org.role === "ADMIN" ? "管理员" : "成员"}
                </span>
              )}
            </div>
            {org.id === currentOrgId && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
