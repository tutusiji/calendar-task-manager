import { fetchAPI } from "@/lib/api-client"
import type { Task } from "@/lib/types"

export async function summarizeTaskGroup(title: string, tasks: Task[]) {
  return fetchAPI<string>("/ai/summarize", {
    method: "POST",
    body: JSON.stringify({
      title,
      tasks: tasks.map((task) => ({
        title: task.title,
        description: task.description,
        startDate: task.startDate,
        endDate: task.endDate,
        startTime: task.startTime,
        type: task.type,
        progress: task.progress,
      })),
    }),
  })
}
