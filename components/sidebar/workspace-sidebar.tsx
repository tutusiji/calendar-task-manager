"use client"

import { useState } from "react"
import Image from "next/image"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { siteConfig } from "@/lib/site-config"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { cn } from "@/lib/utils"
import { MiniCalendar } from "./mini-calendar"
import { NavigationMenu } from "./navigation-menu"
import { sidebarFocus } from "./sidebar-navigation"

const COLLAPSED_KEY = "workspace-sidebar-collapsed"

function readCollapsedState() {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "true"
  } catch {
    return false
  }
}

export function WorkspaceSidebar({ mobile = false, onNavigate }: {
  mobile?: boolean
  onNavigate?: () => void
}) {
  const [collapsed, setCollapsed] = useState(readCollapsedState)
  const compact = !mobile && collapsed
  const CollapseIcon = compact ? PanelLeftOpen : PanelLeftClose
  const toggleLabel = compact ? "展开侧栏" : "折叠侧栏"

  const updateCollapsed = (next: boolean) => {
    setCollapsed(next)
    try {
      window.localStorage.setItem(COLLAPSED_KEY, String(next))
    } catch {
      // 本地存储不可用时仍可切换侧栏。
    }
  }

  return (
    <aside
      aria-label="工作空间侧栏"
      data-collapsed={compact}
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col bg-sidebar text-sidebar-foreground",
        mobile ? "w-full" : "hidden overflow-hidden border-r border-sidebar-border motion-safe:transition-[width] motion-safe:duration-250 motion-safe:ease-in-out md:flex",
        !mobile && (compact ? "w-14" : "w-[248px]"),
      )}
    >
      <div className={cn(
        "flex shrink-0 items-center gap-1 px-3 pb-3 pt-4",
        compact && "flex-col gap-2 px-2 pb-2.5 pt-3",
        mobile && "pr-11",
      )}>
        <button
          type="button"
          aria-label="切换到日历视图"
          title={siteConfig.appName}
          onClick={() => {
            useCalendarStore.getState().setMainViewMode("calendar")
            onNavigate?.()
          }}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 text-left hover:bg-sidebar-accent",
            sidebarFocus,
          )}
        >
          <Image
            src="/logo.png"
            alt=""
            width={30}
            height={30}
            className="size-[30px] shrink-0 rounded-md object-contain"
            priority
          />
          {!compact && (
            <span className="min-w-0 truncate bg-linear-to-r from-blue-700 via-indigo-600 to-purple-700 bg-clip-text text-[17px] font-bold tracking-tight text-transparent dark:from-blue-400 dark:via-indigo-300 dark:to-purple-300 forced-colors:bg-none forced-colors:text-[CanvasText]">
              {siteConfig.appName}
            </span>
          )}
        </button>
        {!mobile && (
          <button
            type="button"
            onClick={() => updateCollapsed(!compact)}
            aria-label={toggleLabel}
            title={toggleLabel}
            aria-expanded={!compact}
            className={cn("grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground", sidebarFocus)}
          >
            <CollapseIcon aria-hidden="true" strokeWidth={1.7} className="size-[17px]" />
          </button>
        )}
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-3", compact && "px-2")}>
        <NavigationMenu compact={compact} onExpandSidebar={() => updateCollapsed(false)} onNavigate={onNavigate} />
      </div>

      {!compact && <MiniCalendar onNavigate={onNavigate} />}
    </aside>
  )
}
