"use client"

import { useState, useRef, useEffect } from "react"
import { Clock } from "lucide-react"
import { Button } from "./button"
import { Input } from "./input"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function TimePicker({ value, onChange, placeholder = "选择时间", className }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hour, setHour] = useState<number>(9)
  const [minute, setMinute] = useState<number>(0)
  const [isDragging, setIsDragging] = useState<'hour' | 'minute' | null>(null)
  const clockRef = useRef<HTMLDivElement>(null)

  // 解析时间字符串
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number)
      if (!isNaN(h) && !isNaN(m)) {
        setHour(h)
        setMinute(m)
      }
    } else {
      // 如果没有值，设置默认时间为9:00
      setHour(9)
      setMinute(0)
    }
  }, [value])

  // 计算时针和分针的角度
  const hourAngle = (hour % 12) * 30 + minute * 0.5 - 90
  const minuteAngle = minute * 6 - 90

  // 处理时钟点击
  const handleClockClick = (e: React.MouseEvent<HTMLDivElement>, type: 'hour' | 'minute') => {
    if (!clockRef.current) return

    const rect = clockRef.current.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const x = e.clientX - rect.left - centerX
    const y = e.clientY - rect.top - centerY

    const angle = Math.atan2(y, x) * (180 / Math.PI) + 90
    const normalizedAngle = (angle + 360) % 360

    if (type === 'hour') {
      const newHour = Math.round(normalizedAngle / 30) % 12
      setHour(hour >= 12 ? newHour + 12 : newHour)
    } else {
      const newMinute = Math.round(normalizedAngle / 6) % 60
      setMinute(newMinute)
    }
  }

  // 处理拖拽
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !clockRef.current) return

    const rect = clockRef.current.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const x = e.clientX - rect.left - centerX
    const y = e.clientY - rect.top - centerY

    const angle = Math.atan2(y, x) * (180 / Math.PI) + 90
    const normalizedAngle = (angle + 360) % 360

    if (isDragging === 'hour') {
      const newHour = Math.round(normalizedAngle / 30) % 12
      setHour(hour >= 12 ? newHour + 12 : newHour)
    } else {
      const newMinute = Math.round(normalizedAngle / 6) % 60
      setMinute(newMinute)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(null)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, hour])

  // 应用时间
  const applyTime = () => {
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    onChange(timeString)
    setIsOpen(false)
  }

  // 快捷时间选择 - 2列布局
  const quickTimes = [
    { label: 'AM 9:00', value: '09:00' },
    { label: 'PM 2:00', value: '14:00' },
    { label: 'AM 9:30', value: '09:30' },
    { label: 'PM 2:30', value: '14:30' },
    { label: 'AM 10:30', value: '10:30' },
    { label: 'PM 3:00', value: '15:00' },
    { label: 'AM 11:00', value: '11:00' },
    { label: 'PM 3:30', value: '15:30' },
    { label: 'AM 4:00', value: '16:00' },
    { label: 'PM 4:30', value: '16:30' },
  ]

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      {/* 时间输入框 */}
      <Input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />

      {/* 时钟图标按钮 */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
          >
            <Clock className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="flex gap-4">
            {/* 左侧：时钟表盘 */}
            <div className="flex flex-col items-center gap-3">
              {/* 数字显示 */}
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={hour}
                  onChange={(e) => setHour(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-16 text-center text-base font-semibold"
                />
                <span className="text-xl font-bold">:</span>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={minute}
                  onChange={(e) => setMinute(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-16 text-center text-base font-semibold"
                />
              </div>

              {/* 时钟表盘 - 缩小尺寸 */}
              <div className="relative">
                <div
                  ref={clockRef}
                  className="relative w-40 h-40 rounded-full border-4 border-border bg-muted/30 cursor-pointer select-none"
                  onClick={(e) => handleClockClick(e, 'minute')}
                >
                  {/* 时刻度 */}
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = i * 30 - 90
                    const x = Math.cos((angle * Math.PI) / 180) * 65
                    const y = Math.sin((angle * Math.PI) / 180) * 65
                    return (
                      <div
                        key={i}
                        className="absolute w-7 h-7 flex items-center justify-center text-xs font-medium"
                        style={{
                          left: `calc(50% + ${x}px - 14px)`,
                          top: `calc(50% + ${y}px - 14px)`,
                        }}
                      >
                        {i === 0 ? 12 : i}
                      </div>
                    )
                  })}

                  {/* 中心点 */}
                  <div className="absolute left-1/2 top-1/2 w-2.5 h-2.5 -ml-1.25 -mt-1.25 rounded-full bg-primary z-10" />

                  {/* 时针 */}
                  <div
                    className="absolute left-1/2 top-1/2 origin-left cursor-grab active:cursor-grabbing"
                    style={{
                      width: '40px',
                      height: '3.5px',
                      marginLeft: '-1.75px',
                      marginTop: '-1.75px',
                      transform: `rotate(${hourAngle}deg)`,
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      setIsDragging('hour')
                    }}
                  >
                    <div className="w-full h-full bg-primary rounded-full" />
                  </div>

                  {/* 分针 */}
                  <div
                    className="absolute left-1/2 top-1/2 origin-left cursor-grab active:cursor-grabbing"
                    style={{
                      width: '58px',
                      height: '2.5px',
                      marginLeft: '-1.25px',
                      marginTop: '-1.25px',
                      transform: `rotate(${minuteAngle}deg)`,
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      setIsDragging('minute')
                    }}
                  >
                    <div className="w-full h-full bg-blue-500 rounded-full" />
                  </div>
                </div>

                <div className="text-center text-[10px] text-muted-foreground mt-1.5">
                  点击表盘设置分钟，拖动指针调整时间
                </div>
              </div>
            </div>

            {/* 右侧：快捷选择和操作按钮 */}
            <div className="flex flex-col gap-3 justify-between">
              {/* 快捷时间 - 2列布局 */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">快捷选择</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {quickTimes.map((time) => (
                    <Button
                      key={time.value}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const [h, m] = time.value.split(':').map(Number)
                        setHour(h)
                        setMinute(m)
                      }}
                      className="text-xs h-7 px-2"
                    >
                      {time.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onChange('')
                    setIsOpen(false)
                  }}
                  className="text-xs h-8"
                >
                  清除
                </Button>
                <Button
                  size="sm"
                  onClick={applyTime}
                  className="text-xs h-8"
                >
                  确定
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
