"use client"

import { useEffect,useState } from "react"
import { Loader2 } from "lucide-react"
import { AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { UserMultiSelector } from "@/components/task/user-multi-selector"
import { cn } from "@/lib/utils"
import type { PlanningBoardSummary,PlanningBucket,PlanningCard } from "@/lib/api/planning"
import { DEFAULT_PLANNING_BOARD_COLOR,DEFAULT_PLANNING_CARD_COLOR,PLANNING_COLOR_PRESETS } from "@/lib/planning"
import { getRandomPlanningCardColor,shouldSubmitOnEnter } from "./planning-ui-helpers"

export type DeleteConfirmState =
  | {
      type: "board"
      id: string
      name: string
    }
  | {
      type: "bucket"
      id: string
      name: string
    }
  | {
      type: "card"
      id: string
      name: string
    }
  | null

function ColorPresetPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PLANNING_COLOR_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              "h-8 w-8 rounded-full border-2 transition-transform",
              value === color ? "scale-110 border-foreground" : "border-white"
            )}
            style={{ backgroundColor: color }}
            aria-label={`选择颜色 ${color}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 rounded-2xl border bg-slate-50 px-3 py-2">
        <span className="text-sm text-muted-foreground">自定义颜色</span>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-slate-200 bg-transparent"
        />
        <span className="rounded-full bg-white px-2 py-1 text-xs text-muted-foreground shadow-sm">
          {value}
        </span>
      </div>
    </div>
  )
}

export function PlanningBoardDialog({
  open,
  board,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  board?: PlanningBoardSummary | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { name: string; description: string; color: string }) => Promise<void>
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState(DEFAULT_PLANNING_BOARD_COLOR)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(board?.name || "")
      setDescription(board?.description || "")
      setColor(board?.color || DEFAULT_PLANNING_BOARD_COLOR)
    }
  }, [board, open])

  const handleSubmit = async () => {
    if (!name.trim()) return

    try {
      setIsSubmitting(true)
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        color,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl"
        onKeyDown={(event) => {
          if (shouldSubmitOnEnter(event)) {
            event.preventDefault()
            void handleSubmit()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{board ? "编辑计划板" : "新建计划板"}</DialogTitle>
          <DialogDescription>
            计划板用于承载同一作用域下的一组分类列和推进卡片。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">计划板名称</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：Q2 研发推进、专利储备、会议准备"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">计划板说明</label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="补充这块计划板的用途和边界"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">主题颜色</label>
            <ColorPresetPicker value={color} onChange={setColor} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!name.trim() || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PlanningBucketDialog({
  open,
  bucket,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  bucket?: PlanningBucket | null
  onOpenChange: (open: boolean) => void
  onSubmit: (title: string) => Promise<void>
}) {
  const [title, setTitle] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(bucket?.title || "")
    }
  }, [bucket, open])

  const handleSubmit = async () => {
    if (!title.trim()) return

    try {
      setIsSubmitting(true)
      await onSubmit(title.trim())
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onKeyDown={(event) => {
          if (shouldSubmitOnEnter(event)) {
            event.preventDefault()
            void handleSubmit()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{bucket ? "编辑分类列" : "新建分类列"}</DialogTitle>
          <DialogDescription>
            用分类列把不同类型的规划工作拆开管理。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium">分类列名称</label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：需求分析、设计、会议筹备"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!title.trim() || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PlanningCardDialog({
  open,
  card,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  card?: PlanningCard | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: {
    title: string
    description: string
    headerColor: string
    assigneeIds: string[]
  }) => Promise<void>
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [headerColor, setHeaderColor] = useState(DEFAULT_PLANNING_CARD_COLOR)
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(card?.title || "")
      setDescription(card?.description || "")
      setHeaderColor(card ? card.headerColor || DEFAULT_PLANNING_CARD_COLOR : getRandomPlanningCardColor())
      setAssigneeIds(card?.assignees.map((assignee) => assignee.userId) || [])
    }
  }, [card, open])

  const handleSubmit = async () => {
    if (!title.trim()) return

    try {
      setIsSubmitting(true)
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        headerColor,
        assigneeIds,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{card ? "编辑卡片" : "新建卡片"}</DialogTitle>
          <DialogDescription>
            卡片适合承载文档、会议、专利、需求梳理这类非日历型推进事项。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">卡片标题</label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：撰写专利交底书、准备需求评审会议"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">卡片说明</label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="补充卡片背景、目标和推进说明"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Header 颜色</label>
            <ColorPresetPicker value={headerColor} onChange={setHeaderColor} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">关联成员</label>
            <UserMultiSelector selectedUserIds={assigneeIds} onUserChange={setAssigneeIds} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!title.trim() || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PlanningDeleteConfirmDialog({
  target,
  isLoading,
  onOpenChange,
  onConfirm,
}: {
  target: DeleteConfirmState
  isLoading: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}) {
  if (!target) {
    return null
  }

  const title =
    target.type === "board"
      ? `确定删除计划板「${target.name}」吗？`
      : target.type === "bucket"
        ? `确定删除分类列「${target.name}」吗？`
        : `确定删除卡片「${target.name}」吗？`

  const description =
    target.type === "board"
      ? "删除后，其中的分类列、卡片和事项都会一起删除，且无法恢复。"
      : target.type === "bucket"
        ? "删除后，该分类列中的所有卡片和事项都会一起删除，且无法恢复。"
        : "删除后，卡片中的所有事项都会一起删除，且无法恢复。"

  return (
    <AlertDialog open={!!target} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>取消</AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoading}
            onClick={(event) => {
              event.preventDefault()
              void onConfirm()
            }}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isLoading ? "删除中..." : "确认删除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
