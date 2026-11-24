import { completeWithDeepSeek } from "./ai.provider"
import type { AiSummaryInput } from "./ai.types"

export async function summarizeTaskGroup(input: AiSummaryInput) {
  const prompt = [
    `模块名称：${input.title}`,
    "任务数据：",
    JSON.stringify(input.tasks),
  ].join("\n")

  return completeWithDeepSeek([
    {
      role: "system",
      content: "你是一个任务管理助手。请用简洁的中文总结任务模块，包含当前重点、进度风险和下一步建议。只根据提供的任务数据回答，不要编造任务。输出 3 到 5 条短句。",
    },
    { role: "user", content: prompt },
  ])
}
