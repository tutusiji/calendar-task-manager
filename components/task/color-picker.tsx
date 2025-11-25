"use client"

import { TASK_COLORS } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ColorPickerProps {
  value?: string
  onChange: (color: string) => void
}

export function ColorPicker({ value = 'blue', onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-2">
      {TASK_COLORS.map((color) => {
        const isSelected = value === color.value
        
        return (
          <button
            key={color.value}
            type="button"
            onClick={() => onChange(color.value)}
            className={cn(
              "w-10 h-10 rounded-md border-2 transition-all",
              color.lightBg,
              color.border,
              color.text,
              isSelected && "scale-110"
            )}
            title={color.label}
            aria-label={color.label}
          >
            {isSelected && (
              <svg
                className="w-full h-full p-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
        )
      })}
    </div>
  )
}
