"use client"

import { useState, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Camera, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { showToast } from "@/lib/toast"

interface AvatarUploadProps {
  currentAvatar?: string
  userName: string
  onUpload: (file: File) => Promise<void>
  className?: string
}

export function AvatarUpload({ currentAvatar, userName, onUpload, className }: AvatarUploadProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      showToast.error('文件格式错误', '请选择图片文件')
      return
    }

    // 验证文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      showToast.error('文件太大', '图片大小不能超过 5MB')
      return
    }

    setIsUploading(true)
    try {
      await onUpload(file)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
      // 清空文件输入，允许重复上传同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div
      className={cn("relative inline-block", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Avatar className="h-24 w-24 cursor-pointer" onClick={handleClick}>
        <AvatarImage src={currentAvatar} alt={userName} />
        <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
          {getInitials(userName)}
        </AvatarFallback>
      </Avatar>

      {/* 悬浮编辑按钮 */}
      {(isHovered || isUploading) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full transition-opacity">
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full hover:bg-black/70"
              onClick={handleClick}
            >
              <Camera className="h-6 w-6 text-white" />
            </Button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />
    </div>
  )
}
