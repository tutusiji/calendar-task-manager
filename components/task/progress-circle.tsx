"use client"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TASK_COLORS } from "@/lib/types"

interface ProgressCircleProps {
  progress: number
  color?: string
  size?: number
  showNumber?: boolean
}

export function ProgressCircle({ progress, color, size = 24, showNumber = false }: ProgressCircleProps) {
  // 获取颜色配置
  const colorConfig = TASK_COLORS.find(c => c.value === color)
  const strokeColor = colorConfig ? colorConfig.hex : '#3b82f6' // 默认蓝色

  // 计算 SVG 路径
  const radius = size / 2 - 1 // 减去边框宽度的一半，防止裁剪
  const center = size / 2
  
  // 极坐标转笛卡尔坐标
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }

  // 生成扇形路径
  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    // 如果是 100% 或 0%，特殊处理
    if (progress >= 100) {
      return `M ${x - radius} ${y} A ${radius} ${radius} 0 1 0 ${x + radius} ${y} A ${radius} ${radius} 0 1 0 ${x - radius} ${y} Z`
    }
    if (progress <= 0) {
      return ""
    }

    return [
      "M", x, y,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  }

  return (
    <div 
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* 饼图 - 默认显示，hover时消失 */}
      <div 
        className="absolute inset-0 transition-all duration-300 ease-in-out"
        style={{
          opacity: showNumber ? 0 : 1,
          transform: showNumber ? 'scale(0.5)' : 'scale(1)',
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* 背景圆（白色填充，有边框） */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="white"
            stroke={strokeColor}
            strokeWidth="1"
          />
          {/* 进度扇形（填充色，无边框） */}
          <path
            d={describeArc(center, center, radius, 0, progress * 3.6)}
            fill={strokeColor}
          />
        </svg>
      </div>

      {/* 数字 - 默认隐藏，hover时显示 */}
      <div 
        className="absolute right-1 inset-0 flex items-center justify-center transition-all duration-300 ease-in-out"
        style={{
          opacity: showNumber ? 1 : 0,
          transform: showNumber ? 'scale(1)' : 'scale(0.5)',
          color: strokeColor,
          fontSize: size * 0.5, // 根据尺寸动态调整字体大小
          fontWeight: 'bold',
          // 添加白色描边以确保在任何背景上可见
          textShadow: '0 0 2px white, 0 0 2px white' 
        }}
      >
        {progress}%
      </div>
    </div>
  )
}
