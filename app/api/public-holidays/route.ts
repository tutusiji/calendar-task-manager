import { NextRequest } from "next/server"
import { authenticate } from "@/lib/middleware"
import {
  serverErrorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response"
import { isValidDate } from "@/lib/validation"
import {
  ensurePublicHolidaysSeeded,
  getPublicHolidaysInRange,
} from "@/lib/public-holiday-service"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (startDate && !isValidDate(startDate)) {
      return validationErrorResponse("开始日期格式无效")
    }

    if (endDate && !isValidDate(endDate)) {
      return validationErrorResponse("结束日期格式无效")
    }

    await ensurePublicHolidaysSeeded()

    const holidays = await getPublicHolidaysInRange(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    )

    return successResponse(holidays)
  } catch (error) {
    console.error("Error fetching public holidays:", error)
    return serverErrorResponse("获取法定节假日失败")
  }
}
