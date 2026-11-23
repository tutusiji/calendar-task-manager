"use client";

import type { MouseEvent as ReactMouseEvent } from "react";

import { useCalendarStore } from "@/lib/store/calendar-store";
import { useCalendarState } from "@/lib/store/use-calendar-state";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { ProgressCircle } from "../task/progress-circle";
import { getCalendarBarMetrics } from "@/lib/utils/calendar-bar-layout";
import { getTaskBarColors,getTaskBarProgress,getTaskBarSegment } from "@/lib/utils/task-bar-segment";
import { TaskBarAssignees } from "./task-bar-assignees";
import { useTaskBarProgress } from "./use-task-bar-progress";

interface TaskBarProps {
  task: Task;
  date: Date;
  track: number;
  showUserInfo?: boolean; // 是否显示用户头像和名字
  isPersonalWeekView?: boolean; // 是否是个人周视图
}

export function TaskBar({
  task,
  date,
  track,
  showUserInfo = false,
  isPersonalWeekView = false,
}: TaskBarProps) {
  const {
    getProjectById,
    openTaskEdit,
    hideWeekends,
    startDragMove,
    getUserById,
    taskBarSize,
    updateTask,
    hoveredTaskId,
    setHoveredTaskId,
    currentUser,
  } = useCalendarState(
    "getProjectById",
    "openTaskEdit",
    "hideWeekends",
    "startDragMove",
    "getUserById",
    "taskBarSize",
    "updateTask",
    "hoveredTaskId",
    "setHoveredTaskId",
    "currentUser"
  );
  const isDragMoving = useCalendarStore((state) => state.dragMoveState.isMoving);
  const movingTaskId = useCalendarStore(
    (state) => state.dragMoveState.task?.id
  );
  const isTaskPending = useCalendarStore((state) =>
    state.pendingTaskIds.includes(task.id)
  );

  const segment = getTaskBarSegment(task, date, hideWeekends);
  const colors = getTaskBarColors(task);
  const { taskBarRef, isProgressDragging, displayProgress, handleProgressMouseDown } = useTaskBarProgress({
    progress: task.progress || 0,
    segment,
    isPending: isTaskPending,
    onSave: (progress) => updateTask(task.id, { progress }),
  });
  const { segmentProgress, isHandleInSegment } = getTaskBarProgress(segment, displayProgress);
  const showHandle = task.type === "daily" && isHandleInSegment;

  // 使用全局hover状态来实现跨段高亮
  const isHovered = hoveredTaskId === task.id;

  const project = getProjectById(task.projectId);

  // 判断当前任务是否正在被拖拽
  const isBeingDragged = isDragMoving && movingTaskId === task.id;

  // 处理拖拽开始
  const handleMouseDown = (e: ReactMouseEvent) => {
    // 只响应左键点击
    if (e.button !== 0) return;
    if (isTaskPending) return;

    e.stopPropagation();
    e.preventDefault();

    startDragMove(task, date);
  };

  const handleClick = (e: ReactMouseEvent) => {
    e.stopPropagation(); // Prevent triggering calendar day's drag creation
    if (isTaskPending) return;
    // 只有在不是拖拽状态时才打开编辑面板
    if (!isBeingDragged && !isDragMoving && !isProgressDragging) {
      openTaskEdit(task);
    }
  };

  const TASK_HEIGHT = taskBarSize === "compact" ? 24 : 30; // 任务条高度 (px): 紧凑型24px, 宽松型30px
  const TASK_GAP = 4; // 任务条间距 (px)

  // 根据 taskBarSize 动态设置样式
  const textSizeClass = taskBarSize === "compact" ? "text-xs" : "text-sm";
  const barMetrics = getCalendarBarMetrics(
    segment.spanDays,
    isPersonalWeekView ? "padded-day" : "content-box"
  );

  return (
    <div
      ref={taskBarRef}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onMouseEnter={() => setHoveredTaskId(task.id)}
      onMouseLeave={() => setHoveredTaskId(null)}
      aria-busy={isTaskPending}
      className={cn(
        "task-bar group absolute px-1 font-medium text-white transition-all overflow-visible",
        textSizeClass,
        colors.className,
        segment.roundedClass,
        // 拖拽样式
        isBeingDragged
          ? "shadow-[0_8px_30px_rgb(0,0,0,0.4)] cursor-move"
          : "cursor-move",
        // 进度拖拽时高亮整个任务条
        isProgressDragging && "ring-2 ring-white/90 shadow-lg cursor-ew-resize",
        // 保存中样式
        isTaskPending && "opacity-80 cursor-wait",
        // Hover样式 - 使用全局hover状态,实现跨段高亮
        !isBeingDragged && isHovered && "opacity-90 shadow-md",
        // 其他任务在拖拽时禁用交互
        !isBeingDragged && isDragMoving && "pointer-events-none"
      )}
      style={{
        left: barMetrics.left,
        width: barMetrics.width,
        top: `${
          track * (TASK_HEIGHT + TASK_GAP) + (isPersonalWeekView ? 4 : 0)
        }px`,
        height: `${TASK_HEIGHT}px`,
        zIndex: isBeingDragged ? 50 : 10,
      }}
    >
      {/* 进度背景填充 - 拖拽时禁用过渡效果以提高响应速度 */}
      <div
        className={cn(
          "absolute left-0 top-0 h-full",
          isProgressDragging ? "opacity-50" : "opacity-30",
          !isProgressDragging && "transition-all duration-300",
          // 左边只在任务开始段时圆角，右边只在接近100%时圆角
          segmentProgress >= 99
            ? segment.roundedClass
            : segment.startsHere
            ? "rounded-l-full"
            : ""
        )}
        style={{
          width: `${segmentProgress}%`,
          backgroundColor: colors.hex,
        }}
      />

      {/* 进度拖拽手柄 - 仅日常任务显示，使用 CSS group-hover 控制显示 */}
      {showHandle && (
      <div
        className={cn(
          "absolute top-0 bottom-0 z-30 w-4 -ml-2 cursor-ew-resize flex items-center justify-center group/handle transition-opacity duration-200",
          // 默认隐藏且不响应事件
          "opacity-0 pointer-events-none",
          // 使用 CSS group-hover 控制显示（不受 JS 状态刷新影响）
          "group-hover:opacity-100 group-hover:pointer-events-auto",
          // 拖拽时始终显示
          isProgressDragging && "opacity-100 pointer-events-auto"
        )}
        style={{ left: `${segmentProgress}%` }}
        onMouseDown={handleProgressMouseDown}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 视觉标记：两根黑色竖线 */}
        <div className="flex h-4/5 w-[5px] border-l border-r border-black opacity-80 group-hover/handle:opacity-100" />
      </div>
      )}

      <div className="taskbar flex items-center gap-1 truncate h-full relative z-10">
        {showUserInfo && (
          <TaskBarAssignees task={task} taskBarSize={taskBarSize} currentUserId={currentUser?.id} getUserById={getUserById} />
        )}
        {task.startTime && (
          <span
            className={cn("text-[10px] opacity-90", !showUserInfo && "ml-1")}
          >
            {task.startTime}
          </span>
        )}
        <span
          className={cn(
            "truncate flex-1",
            !showUserInfo && !task.startTime && "ml-1"
          )}
        >
          {task.title}
        </span>

        {/* 保存中：在进度圆的位置显示 spinner */}
        {isTaskPending ? (
          <div className="shrink-0 ml-auto flex items-center">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </div>
        ) : task.type === "daily" ? (
          <div className="shrink-0 ml-auto flex items-center">
            <ProgressCircle
              progress={displayProgress}
              color={task.color}
              size={taskBarSize === "compact" ? 20 : 24}
              showNumber={isHovered || isProgressDragging}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
