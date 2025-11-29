"use client"

import { useState, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, Wand2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { User } from "@/lib/types"

const PREDEFINED_ROLES = [
  "未设置",
  "设计师",
  "前端开发",
  "后端开发",
  "产品经理",
  "项目管理",
  "交互设计师",
]

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: User
  onSave: (data: Partial<User>) => Promise<void>
}

export function EditProfileDialog({ open, onOpenChange, currentUser, onSave }: EditProfileDialogProps) {
  const [name, setName] = useState(currentUser.name)
  const [email, setEmail] = useState(currentUser.email)
  const [gender, setGender] = useState(currentUser.gender || '未设置')
  const [role, setRole] = useState(currentUser.role || '未设置')
  const [avatar, setAvatar] = useState(currentUser.avatar)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAvatarLoading, setIsAvatarLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 当对话框打开时，重新从 currentUser 读取最新信息
  useEffect(() => {
    if (open) {
      setName(currentUser.name)
      setEmail(currentUser.email)
      setGender(currentUser.gender || '未设置')
      setRole(currentUser.role || '未设置')
      setAvatar(currentUser.avatar)
      setIsAvatarLoading(false)
    }
  }, [open, currentUser])

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSave({
        name: name.trim(),
        email: email.trim(),
        gender,
        role,
        avatar,
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatar(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleMagicGenerate = () => {
    setIsAvatarLoading(true)
    
    // 生成 1-100 的随机数
    const randomSeed = Math.floor(Math.random() * 100) + 1
    
    // 模拟魔法施展过程（模糊到清晰）
    setTimeout(() => {
      const avatarApiUrl = process.env.NEXT_PUBLIC_AVATAR_API_URL || 'https://api.dicebear.com'
      const newAvatarUrl = `${avatarApiUrl}/9.x/avataaars/svg?seed=${currentUser.username}${randomSeed}`
      setAvatar(newAvatarUrl)
      setIsAvatarLoading(false)
    }, 400)
  }

  const getUserInitial = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>编辑个人信息</DialogTitle>
          <DialogDescription>
            修改您的个人资料信息
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* 头像编辑区域 */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className={cn(
                "h-24 w-24 border-2 border-border transition-all duration-500",
                isAvatarLoading ? "blur-sm scale-95 opacity-80" : "blur-0 scale-100 opacity-100"
              )}>
                <AvatarImage src={avatar} alt={name} className="object-cover" />
                <AvatarFallback className="text-2xl">
                  {getUserInitial(name)}
                </AvatarFallback>
              </Avatar>
              {isAvatarLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Wand2 className="h-8 w-8 text-primary animate-pulse" />
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                上传头像
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-200"
                onClick={handleMagicGenerate}
                disabled={isAvatarLoading}
              >
                <Wand2 className={cn("h-4 w-4", isAvatarLoading && "animate-spin")} />
                魔法棒
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {/* 姓名 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                姓名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入姓名"
                required
              />
            </div>

            {/* 邮箱 */}
            <div className="space-y-2">
              <Label htmlFor="email">
                邮箱 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
                required
              />
            </div>

            {/* 性别 */}
            <div className="space-y-2">
              <Label htmlFor="gender">性别</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择性别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="未设置">未设置</SelectItem>
                  <SelectItem value="男">男</SelectItem>
                  <SelectItem value="女">女</SelectItem>
                  <SelectItem value="其他">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 职业 */}
            <div className="space-y-2">
              <Label htmlFor="role">职业</Label>
              <Select 
                value={PREDEFINED_ROLES.includes(role) ? role : "custom"} 
                onValueChange={(value) => {
                  if (value === "custom") {
                    setRole("")
                  } else {
                    setRole(value)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择职业" />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                  <SelectItem value="custom">自定义...</SelectItem>
                </SelectContent>
              </Select>
              {(!PREDEFINED_ROLES.includes(role)) && (
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="请输入您的职业"
                  className="mt-2"
                  autoFocus
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim() || !email.trim()}>
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
