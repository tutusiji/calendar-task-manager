import { NextRequest } from "next/server"
import { authenticate } from "@/lib/middleware"
import {
  successResponse,
  validationErrorResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/api-response"
import {
  isPlanningScopeType,
} from "@/lib/planning"
import { createPlanningBoard, listPlanningBoards } from "@/lib/modules/planning/planning.service"
import { normalizePlanningColor, sanitizePlanningText } from "@/lib/modules/planning/planning.validator"

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const scopeTypeValue = request.nextUrl.searchParams.get("scopeType")
    const scopeIdValue = request.nextUrl.searchParams.get("scopeId")

    if (!scopeTypeValue || !isPlanningScopeType(scopeTypeValue)) {
      return validationErrorResponse("计划作用域类型无效")
    }

    const effectiveScopeId =
      scopeTypeValue === "PERSONAL" ? scopeIdValue || auth.userId : scopeIdValue || ""

    const result = await listPlanningBoards(
      auth.userId, scopeTypeValue, effectiveScopeId,
      request.nextUrl.searchParams.get("summary") === "true",
    )
    return result.kind === "forbidden" ? forbiddenResponse(result.message) : successResponse(result.boards)
  } catch (error) {
    console.error("获取计划板列表失败:", error)
    return serverErrorResponse("获取计划板列表失败")
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const scopeTypeValue = body.scopeType
    const scopeIdValue = body.scopeId
    const name = sanitizePlanningText(body.name, 80)
    const description = sanitizePlanningText(body.description, 500)
    const color = normalizePlanningColor(body.color)

    if (!scopeTypeValue || !isPlanningScopeType(scopeTypeValue)) {
      return validationErrorResponse("计划作用域类型无效")
    }

    if (!name) {
      return validationErrorResponse("计划板名称不能为空")
    }

    const effectiveScopeId =
      scopeTypeValue === "PERSONAL" ? scopeIdValue || auth.userId : scopeIdValue || ""

    const result = await createPlanningBoard(auth.userId, scopeTypeValue, effectiveScopeId, {
      name, description: description || null, color,
    })
    return result.kind === "forbidden"
      ? forbiddenResponse(result.message)
      : successResponse(result.board, "计划板已创建", 201)
  } catch (error) {
    console.error("创建计划板失败:", error)
    return serverErrorResponse("创建计划板失败")
  }
}
