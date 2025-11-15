"use client"

import { useState, useEffect } from "react"
import { ChevronRight, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { getToken } from "@/lib/api-client"

interface Organization {
  id: string
  name: string
  role?: string
}

export function SpaceSwitcher() {
  const { toast } = useToast()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 获取用户的组织列表
  const fetchOrganizations = async () => {
    try {
      const token = getToken()
      if (!token) {
        console.error("No token found")
        return
      }

      const response = await fetch("/api/organizations", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })
      const data = await response.json()
      
      if (data.success) {
        setOrganizations(data.data)
        
        // 从用户信息中获取当前组织
        const userStr = localStorage.getItem("currentUser")
        if (userStr) {
          const user = JSON.parse(userStr)
          setCurrentOrgId(user.currentOrganizationId)
        }
      }
    } catch (error) {
      console.error("获取组织列表失败:", error)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const handleSwitchOrganization = async (orgId: string) => {
    if (orgId === currentOrgId) return

    setIsLoading(true)
    try {
      const token = getToken()
      if (!token) {
        throw new Error("未登录")
      }

      const response = await fetch("/api/organizations/switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ organizationId: orgId }),
      })

      const data = await response.json()
      
      if (data.success) {
        setCurrentOrgId(orgId)
        
        // 更新 localStorage 中的用户信息
        const userStr = localStorage.getItem("currentUser")
        if (userStr) {
          const user = JSON.parse(userStr)
          user.currentOrganizationId = orgId
          localStorage.setItem("currentUser", JSON.stringify(user))
        }
        
        toast({
          title: "已切换空间",
          description: "页面将刷新以加载新空间的数据",
        })
        
        // 刷新页面以重新加载数据
        setTimeout(() => {
          window.location.reload()
        }, 500)
      } else {
        toast({
          title: "切换失败",
          description: data.error || "无法切换空间",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("切换组织失败:", error)
      toast({
        title: "切换失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
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
        <span className="text-foreground">My Space</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
