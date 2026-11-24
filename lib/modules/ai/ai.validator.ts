import { AiServiceError, type AiSummaryInput, type AiSummaryTask } from "./ai.types"

const MAX_TASKS = 100
const MAX_TEXT_LENGTH = 600

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function parseTask(value: unknown): AiSummaryTask {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {}

  return {
    title: normalizeText(item.title, 160),
    description: normalizeText(item.description, MAX_TEXT_LENGTH) || null,
    startDate: normalizeText(item.startDate, 40),
    endDate: normalizeText(item.endDate, 40),
    startTime: normalizeText(item.startTime, 20) || null,
    type: normalizeText(item.type, 30),
    progress: typeof item.progress === "number"
      ? Math.max(0, Math.min(100, item.progress))
      : undefined,
  }
}

export function parseAiSummaryInput(value: unknown): AiSummaryInput {
  const body = value && typeof value === "object" ? value as Record<string, unknown> : {}
  const title = normalizeText(body.title, 160)

  if (!title || !Array.isArray(body.tasks) || body.tasks.length > MAX_TASKS) {
    throw new AiServiceError(400, "总结数据格式无效")
  }

  const tasks = body.tasks.map(parseTask).filter((task) => task.title.length > 0)
  return { title, tasks }
}
