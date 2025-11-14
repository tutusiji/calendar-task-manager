"use client"

import * as React from "react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DateRangePickerProps {
  value?: { from: Date; to?: Date }
  onChange?: (range: { from: Date; to?: Date } | undefined) => void
  placeholder?: string
  className?: string
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "选择日期范围",
  className,
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<{ from: Date; to?: Date } | undefined>(value)

  React.useEffect(() => {
    setDate(value)
  }, [value])

  const handleSelect = (range: { from: Date; to?: Date } | undefined) => {
    setDate(range)
    onChange?.(range)
  }

  const formatDateRange = () => {
    if (!date?.from) return placeholder
    
    if (!date.to) {
      return format(date.from, "yyyy年M月d日", { locale: zhCN })
    }
    
    const daysDiff = Math.ceil(
      (date.to.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
    
    return `${format(date.from, "M月d日", { locale: zhCN })} - ${format(
      date.to,
      "M月d日",
      { locale: zhCN }
    )} (${daysDiff}天)`
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={date?.from}
          selected={date}
          onSelect={handleSelect}
          numberOfMonths={2}
          locale={zhCN}
        />
      </PopoverContent>
    </Popover>
  )
}
