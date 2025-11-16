"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { authAPI } from "@/lib/api-client"
import { OrganizationSelector } from "@/components/organization-selector"

export default function AuthPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // 登录表单
  const [loginData, setLoginData] = useState({
    username: "",
    password: ""
  })

  // 注册表单
  const [registerData, setRegisterData] = useState({
    username: "",
    name: "",
    email: "",
    role: "",
    organization: "",
    organizationId: null as string | null,
    password: "",
    confirmPassword: ""
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const user = await authAPI.login({
        username: loginData.username,
        password: loginData.password
      })
      
      // 如果用户没有选中的组织,先获取组织列表并自动选择第一个
      if (!user.currentOrganizationId) {
        try {
          const token = localStorage.getItem("token")
          const orgsResponse = await fetch("/api/organizations", {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          })
          const orgsData = await orgsResponse.json()
          
          if (orgsData.success && orgsData.data.length > 0) {
            const firstOrgId = orgsData.data[0].id
            
            // 调用切换组织 API
            const switchResponse = await fetch("/api/organizations/switch", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
              },
              body: JSON.stringify({ organizationId: firstOrgId }),
            })
            
            const switchData = await switchResponse.json()
            if (switchData.success) {
              user.currentOrganizationId = firstOrgId
            }
          }
        } catch (error) {
          console.error("Failed to set default organization:", error)
        }
      }
      
      // 保存用户信息到 localStorage
      localStorage.setItem("currentUser", JSON.stringify(user))
      
      // 重置导航状态到 My Days (每次登录都重置)
      const storeKey = "calendar-storage-v2"
      const storeStr = localStorage.getItem(storeKey)
      if (storeStr) {
        try {
          const store = JSON.parse(storeStr)
          if (store.state) {
            store.state.navigationMode = "my-days"
            store.state.selectedTeamId = null
            store.state.selectedProjectId = null
            localStorage.setItem(storeKey, JSON.stringify(store))
          }
        } catch (e) {
          console.error("Failed to reset navigation state:", e)
        }
      }
      
      // 跳转到主页
      router.push("/")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "登录失败")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    // 验证职业
    if (!registerData.role) {
      setError("请选择职业")
      setIsLoading(false)
      return
    }

    // 验证组织
    if (!registerData.organization || registerData.organization.trim() === "") {
      setError("请输入或选择空间/组织")
      setIsLoading(false)
      return
    }

    // 验证密码
    if (registerData.password !== registerData.confirmPassword) {
      setError("两次输入的密码不一致")
      setIsLoading(false)
      return
    }

    if (registerData.password.length < 6) {
      setError("密码长度至少为 6 位")
      setIsLoading(false)
      return
    }

    try {
      const user = await authAPI.register({
        username: registerData.username,
        name: registerData.name,
        email: registerData.email,
        role: registerData.role,
        password: registerData.password,
        organization: registerData.organization,
        organizationId: registerData.organizationId,
      })
      
      // 保存用户信息到 localStorage
      localStorage.setItem("currentUser", JSON.stringify(user))
      
      setSuccess("注册成功！正在跳转...")
      
      // 跳转到主页
      setTimeout(() => {
        router.push("/")
        router.refresh()
      }, 1000)
    } catch (err: any) {
      setError(err.message || "注册失败")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center">
            <Image
              src="/logo.png"
              alt="OxHorse Planner Logo"
              width={80}
              height={80}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-5xl font-bold bg-linear-to-r from-purple-600 via-blue-500 to-red-500 bg-clip-text text-transparent">
            OxHorse Planner
          </h1>
          <p className="mt-2 text-md text-muted-foreground" style={{ fontFamily: 'MomoLite, sans-serif' }}>牛马日记 —— 打工人必备的轻量任务管理工具</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>

          {/* 登录标签 */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>欢迎回来</CardTitle>
                <CardDescription>输入您的用户名和密码登录</CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="login-username">用户名</Label>
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="请输入用户名"
                      value={loginData.username}
                      onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">密码</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full mt-8" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        登录中...
                      </>
                    ) : (
                      "登录"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* 注册标签 */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>创建账户</CardTitle>
                <CardDescription>填写以下信息注册新账户</CardDescription>
              </CardHeader>
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert>
                      <AlertDescription className="text-green-600">{success}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="register-username">用户名</Label>
                    <Input
                      id="register-username"
                      type="text"
                      placeholder="请输入用户名（用于登录）"
                      value={registerData.username}
                      onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-name">姓名</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="张三"
                      value={registerData.name}
                      onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">邮箱</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="your@email.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <OrganizationSelector
                    value={registerData.organization}
                    onChange={(value, org) => {
                      setRegisterData({ 
                        ...registerData, 
                        organization: value,
                        organizationId: org?.id || null
                      })
                    }}
                    disabled={isLoading}
                    required
                  />

                  <div className="space-y-2">
                    <Label htmlFor="register-role">
                      职业 <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={registerData.role}
                      onValueChange={(value) => setRegisterData({ ...registerData, role: value })}
                      disabled={isLoading}
                      required
                    >
                      <SelectTrigger id="register-role">
                        <SelectValue placeholder="请选择职业" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="设计师">设计师</SelectItem>
                        <SelectItem value="前端开发">前端开发</SelectItem>
                        <SelectItem value="后端开发">后端开发</SelectItem>
                        <SelectItem value="产品经理">产品经理</SelectItem>
                        <SelectItem value="项目管理">项目管理</SelectItem>
                        <SelectItem value="交互设计师">交互设计师</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">密码</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="至少 6 位"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      required
                      disabled={isLoading}
                      minLength={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">确认密码</Label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      placeholder="再次输入密码"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      required
                      disabled={isLoading}
                      minLength={6}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full  mt-8" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        注册中...
                      </>
                    ) : (
                      "注册"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          登录即表示您同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  )
}
