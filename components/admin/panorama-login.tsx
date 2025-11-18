"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Loader2 } from "lucide-react"

interface PanoramaLoginProps {
  onLoginSuccess: () => void
}

export default function PanoramaLogin({ onLoginSuccess }: PanoramaLoginProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [captchaInput, setCaptchaInput] = useState("")
  const [captcha, setCaptcha] = useState("")
  const [captchaAnswer, setCaptchaAnswer] = useState("")

  useEffect(() => {
    generateCaptcha()
  }, [])

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10)
    const num2 = Math.floor(Math.random() * 10)
    setCaptcha(`${num1} + ${num2}`)
    setCaptchaAnswer((num1 + num2).toString())
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // 验证验证码
    if (captchaInput.trim() !== captchaAnswer) {
      setError("验证码错误")
      setCaptchaInput("")
      generateCaptcha()
      setIsLoading(false)
      return
    }

    // 验证密码
    if (password !== "admin123456") {
      setError("超级管理员密码错误")
      setCaptchaInput("")
      generateCaptcha()
      setIsLoading(false)
      return
    }

    // 认证成功
    sessionStorage.setItem("panorama_auth", "true")
    setIsLoading(false)
    onLoginSuccess()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
            <Image
              src="/logo.png"
              alt="Logo"
              width={64}
              height={64}
              className="object-contain"
              priority
            />
          </div>
          <CardTitle className="text-2xl">超级管理员全景视图</CardTitle>
          <CardDescription>请输入超级管理员密码以访问</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">超级管理员密码</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="captcha">验证码：{captcha} = ?</Label>
              <Input
                id="captcha"
                type="text"
                placeholder="请输入答案"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                "登录"
              )}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
