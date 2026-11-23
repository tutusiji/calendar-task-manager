import { addDays, startOfDay } from "date-fns";
import { TASK_COLORS, type Task } from "@/lib/types";

function countVisibleDays(start: Date, end: Date, hideWeekends: boolean) {
  let count = 0;
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    if (!hideWeekends || (date.getDay() !== 0 && date.getDay() !== 6)) count++;
  }
  return count;
}

export function getTaskBarSegment(task: Pick<Task, "startDate" | "endDate">, date: Date, hideWeekends: boolean) {
  const current = startOfDay(date);
  const start = startOfDay(task.startDate);
  const end = startOfDay(task.endDate);
  const weekday = current.getDay() || 7;
  const remainingInWeek = Math.max(0, (hideWeekends ? 5 : 7) - weekday + 1);
  const spanDays = Math.min(remainingInWeek, countVisibleDays(current, end, hideWeekends));
  const totalDays = countVisibleDays(start, end, hideWeekends);
  const daysBeforeSegment = countVisibleDays(start, current, hideWeekends) - 1;
  const startsHere = +current === +start;
  const endsHere = end >= current && end <= addDays(current, spanDays - 1);

  const roundedClass = startsHere && endsHere ? "rounded-full"
    : startsHere ? "rounded-l-full"
    : endsHere ? "rounded-r-full" : "";

  return { spanDays, totalDays, daysBeforeSegment, startsHere, endsHere, roundedClass };
}

export type TaskBarSegment = ReturnType<typeof getTaskBarSegment>;

export function getTaskBarProgress(segment: TaskBarSegment, progress: number) {
  const { totalDays, spanDays, daysBeforeSegment, endsHere } = segment;
  const elapsed = totalDays * (progress / 100) - daysBeforeSegment;
  const segmentProgress = elapsed < 0 ? 0 : elapsed >= spanDays ? 100 : elapsed / spanDays * 100;
  const isHandleInSegment = (elapsed >= 0 && elapsed < spanDays) || (progress === 100 && endsHere);
  return { segmentProgress, isHandleInSegment };
}

const taskTypeColors = {
  daily: { className: "bg-blue-500", hex: "#3b82f6" },
  meeting: { className: "bg-yellow-500", hex: "#eab308" },
  vacation: { className: "bg-red-500", hex: "#ef4444" },
};

export function getTaskBarColors(task: Pick<Task, "type" | "color">) {
  const customColor = task.type === "daily" && TASK_COLORS.find(({ value }) => value === task.color);
  if (customColor) {
    const { border, lightBg, text, hex } = customColor;
    return { className: [border, lightBg, text, "border"].join(" "), hex };
  }
  return taskTypeColors[task.type] ?? taskTypeColors.daily;
}
