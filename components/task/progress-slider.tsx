"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { TASK_COLORS } from "@/lib/types"

interface ProgressSliderProps {
  value: number
  onChange: (value: number) => void
  color?: string // 任务颜色，用于进度条背景
}

const QUICK_VALUES = [10, 30, 50, 80, 100]

export function ProgressSlider({ value, onChange, color }: ProgressSliderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [inputValue, setInputValue] = useState(value.toString())
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInputValue(value.toString())
  }, [value])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    updateProgress(e.clientX)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      updateProgress(e.clientX)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging])

  const updateProgress = (clientX: number) => {
    if (!sliderRef.current) return
    
    const rect = sliderRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    onChange(Math.round(percentage))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    
    const num = parseInt(val)
    if (!isNaN(num)) {
      onChange(Math.max(0, Math.min(100, num)))
    }
  }

  const handleInputBlur = () => {
    setInputValue(value.toString())
  }

  // 获取颜色对应的样式
  const getColorClass = () => {
    if (!color) return 'bg-blue-500'
    const colorConfig = TASK_COLORS.find(c => c.value === color)
    return colorConfig ? colorConfig.hex : '#3b82f6'
  }

  return (
    <div className="flex items-center gap-3">
      {/* 进度条 */}
      <div className="flex-1">
        <div
          ref={sliderRef}
          className="relative h-3 bg-gray-200 rounded-full cursor-pointer"
          onMouseDown={handleMouseDown}
        >
          {/* 进度填充 */}
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{
              width: `${value}%`,
              backgroundColor: getColorClass()
            }}
          />
          
          {/* 刻度标记 */}
          {QUICK_VALUES.map((mark) => (
            <div
              key={mark}
              className="absolute top-0 h-full w-0.5 bg-white/50"
              style={{ left: `${mark}%` }}
            />
          ))}
          
          {/* 滑块 */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 rounded-full shadow-md cursor-grab active:cursor-grabbing"
            style={{
              left: `${value}%`,
              transform: `translate(-50%, -50%)`,
              borderColor: getColorClass()
            }}
          />
        </div>
      </div>

      {/* 输入框 */}
      <div className="flex items-center gap-1 shrink-0">
        <Input
          type="number"
          min="0"
          max="100"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          className="w-16 h-8 text-center"
        />
        <span className="text-sm text-muted-foreground">%</span>
      </div>
    </div>
  )
}
