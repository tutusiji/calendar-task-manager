import { NextRequest } from "next/server"

import { errorResponse, successResponse } from "@/lib/api-response"
import { authenticate } from "@/lib/middleware"
import { summarizeTaskGroup } from "@/lib/modules/ai/ai.service"
import { isAiServiceError } from "@/lib/modules/ai/ai.types"
import { parseAiSummaryInput } from "@/lib/modules/ai/ai.validator"

export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (auth.error) return auth.error

  try {
    const body = await request.json().catch(() => null)
    const input = parseAiSummaryInput(body)
    return successResponse(await summarizeTaskGroup(input))
  } catch (error) {
    if (isAiServiceError(error)) {
      return errorResponse(error.message, error.status)
    }

    console.error("AI summarize route failed", error)
    return errorResponse("AI 总结请求失败，请稍后重试", 502)
  }
}
