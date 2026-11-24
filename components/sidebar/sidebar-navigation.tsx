import { useId, useState, type ComponentProps, type ReactNode } from "react"
import { ChevronDown, Crown, GripVertical, MoreHorizontal, Plus, type LucideIcon } from "lucide-react"

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export const sidebarFocus = "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/70"
export const sidebarActive = "bg-blue-50 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200"
const revealOnInteraction = "[@media(hover:hover)_and_(pointer:fine)]:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 data-[state=open]:opacity-100"

export function SidebarSection({
  label,
  icon: Icon,
  count,
  compact,
  active,
  defaultExpanded = true,
  onExpandSidebar,
  add,
  children,
}: {
  label: string
  icon: LucideIcon
  count: number
  compact: boolean
  active: boolean
  defaultExpanded?: boolean
  onExpandSidebar: () => void
  add?: { label: string; onClick: () => void }
  children: ReactNode
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const listId = useId()
  const showList = expanded && !compact

  return (
    <section aria-label={label}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-expanded={showList}
          aria-controls={listId}
          title={compact ? label : undefined}
          onClick={() => {
            if (compact) {
              setExpanded(true)
              onExpandSidebar()
            } else {
              setExpanded(!expanded)
            }
          }}
          className={cn(
            "flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-xs font-semibold text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            sidebarFocus,
            compact && "h-9 justify-center px-0",
            active && (compact || !showList) && sidebarActive,
          )}
        >
          <Icon aria-hidden="true" strokeWidth={1.7} className={cn("size-4 shrink-0", compact && "size-[18px]")} />
          <span className={compact ? "sr-only" : "flex-1 truncate"}>{label}</span>
          {!compact && (
            <>
              <span className="font-medium tabular-nums">{count}</span>
              <ChevronDown aria-hidden="true" className={cn("size-3 shrink-0 transition-transform motion-reduce:transition-none", !showList && "-rotate-90")} />
            </>
          )}
        </button>
        {add && !compact && (
          <button
            type="button"
            onClick={add.onClick}
            aria-label={add.label}
            title={add.label}
            className={cn("grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground", sidebarFocus)}
          >
            <Plus aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>
      <div id={listId} hidden={!showList} className="mt-0.5 space-y-0.5">
        {showList && children}
      </div>
    </section>
  )
}

export function SidebarItem({
  name,
  icon: Icon,
  color,
  active,
  owner,
  badge,
  onSelect,
  actions,
  drag,
}: {
  name: string
  icon: LucideIcon
  color: string
  active: boolean
  owner?: boolean
  badge?: { label: string; description: string }
  onSelect: () => void
  actions?: ReactNode
  drag?: {
    active: boolean
    label: string
    onStart: ComponentProps<"button">["onDragStart"]
    onEnd: () => void
    onOver: ComponentProps<"div">["onDragOver"]
  }
}) {
  return (
    <div
      onDragOver={drag?.onOver}
      onDrop={drag?.onEnd}
      className={cn(
        "group relative flex min-h-9 min-w-0 items-center rounded-md transition-colors focus-within:bg-sidebar-accent hover:bg-sidebar-accent",
        active && cn(sidebarActive, "before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-blue-500 focus-within:bg-blue-50 hover:bg-blue-50 dark:focus-within:bg-blue-500/15 dark:hover:bg-blue-500/15"),
        drag?.active && "opacity-60",
      )}
    >
      {drag && (
        <button
          type="button"
          draggable
          aria-label={drag.label}
          title="拖拽调整顺序"
          onDragStart={drag.onStart}
          onDragEnd={drag.onEnd}
          className={cn(
            "hidden h-8 w-4 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground transition-opacity hover:text-foreground active:cursor-grabbing [@media(hover:hover)_and_(pointer:fine)]:flex",
            revealOnInteraction,
            sidebarFocus,
          )}
        >
          <GripVertical aria-hidden="true" className="size-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-[13px]",
          drag && "[@media(hover:hover)_and_(pointer:fine)]:pl-0",
          active && "font-semibold",
          !actions && "pr-2",
          sidebarFocus,
        )}
      >
        <span
          aria-hidden="true"
          className="grid size-5 shrink-0 place-items-center rounded-md border border-current/10"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
        >
          <Icon strokeWidth={1.7} className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate" title={name}>{name}</span>
        {badge && (
          <span title={badge.description} className="shrink-0 rounded-sm bg-background/80 px-1 py-0.5 text-[10px] font-medium leading-none text-muted-foreground ring-1 ring-border/70">
            {badge.label}
          </span>
        )}
        {owner && (
          <span title="你创建的" className="shrink-0 text-muted-foreground">
            <Crown aria-hidden="true" strokeWidth={1.6} className="size-3.5" />
            <span className="sr-only">你创建的</span>
          </span>
        )}
      </button>
      {actions}
    </div>
  )
}

export function SidebarItemMenuTrigger({ label }: { label: string }) {
  return (
    <DropdownMenuTrigger
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "mr-1 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-opacity hover:bg-background/80 hover:text-foreground data-[state=open]:bg-background/80",
        revealOnInteraction,
        sidebarFocus,
      )}
    >
      <MoreHorizontal aria-hidden="true" className="size-4" />
    </DropdownMenuTrigger>
  )
}
