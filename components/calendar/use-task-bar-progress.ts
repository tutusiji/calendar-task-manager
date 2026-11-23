"use client";

import { useEffect,useRef,useState,type MouseEvent as ReactMouseEvent } from "react";
import type { TaskBarSegment } from "@/lib/utils/task-bar-segment";

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function useTaskBarProgress({
  progress, segment, isPending, onSave,
}: {
  progress: number;
  segment: TaskBarSegment;
  isPending: boolean;
  onSave: (progress: number) => Promise<void>;
}) {
  const [isProgressDragging, setIsProgressDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(progress);
  const [optimisticProgress, setOptimisticProgress] = useState<number | null>(null);
  const taskBarRef = useRef<HTMLDivElement>(null);
  const removeListeners = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (optimisticProgress === progress) setOptimisticProgress(null);
  }, [progress, optimisticProgress]);

  useEffect(() => () => removeListeners.current?.(), []);

  const handleProgressMouseDown = (event: ReactMouseEvent) => {
    if (isPending || segment.totalDays <= 0) return;
    event.stopPropagation();
    event.preventDefault();

    removeListeners.current?.();
    setIsProgressDragging(true);
    setDragProgress(progress);

    const progressAt = (clientX: number) => {
      const rect = taskBarRef.current?.getBoundingClientRect();
      if (!rect?.width) return progress;
      const segmentPercent = clampPercent((clientX - rect.left) / rect.width * 100);
      const elapsedDays = segment.daysBeforeSegment + segmentPercent / 100 * segment.spanDays;
      return clampPercent(elapsedDays / segment.totalDays * 100);
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      setDragProgress(progressAt(moveEvent.clientX));
    };
    const handleMouseUp = async (upEvent: MouseEvent) => {
      removeListeners.current?.();
      const finalProgress = progressAt(upEvent.clientX);
      setIsProgressDragging(false);
      if (finalProgress === progress) return;

      setOptimisticProgress(finalProgress);
      try {
        await onSave(finalProgress);
      } catch (error) {
        console.error("Failed to update progress:", error);
        setOptimisticProgress(null);
      }
    };
    removeListeners.current = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      removeListeners.current = null;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return {
    taskBarRef,
    isProgressDragging,
    displayProgress: isProgressDragging ? dragProgress : (optimisticProgress ?? progress),
    handleProgressMouseDown,
  };
}
