import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate } from "@/lib/middleware"
import {
  successResponse,
  validationErrorResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/api-response"
import {
  DEFAULT_PLANNING_BUCKET_TITLE,
  isPlanningScopeType,
} from "@/lib/planning"
import {
  buildPlanningScopeWhere,
  ensurePlanningScopeAccess,
  normalizePlanningColor,
  planningBoardInclude,
  sanitizePlanningText,
} from "@/lib/planning-server"

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

    const access = await ensurePlanningScopeAccess(
      auth.userId,
      scopeTypeValue,
      effectiveScopeId
    )

    if (!access.allowed) {
      return forbiddenResponse(access.message)
    }

    const boards = await prisma.planningBoard.findMany({
      where: buildPlanningScopeWhere(scopeTypeValue, effectiveScopeId),
      include: planningBoardInclude,
      orderBy: [
        { createdAt: "asc" },
        { updatedAt: "asc" },
      ],
    })

    return successResponse(boards)
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

    const access = await ensurePlanningScopeAccess(
      auth.userId,
      scopeTypeValue,
      effectiveScopeId
    )

    if (!access.allowed) {
      return forbiddenResponse(access.message)
    }

    const board = await prisma.planningBoard.create({
      data: {
        name,
        description: description || null,
        color,
        scopeType: scopeTypeValue,
        creatorId: auth.userId,
        ...access.scopeData,
        buckets: {
          create: [
            {
              title: DEFAULT_PLANNING_BUCKET_TITLE,
              sortOrder: 0,
            },
          ],
        },
      },
      include: planningBoardInclude,
    })

    return successResponse(board, "计划板已创建", 201)
  } catch (error) {
    console.error("创建计划板失败:", error)
    return serverErrorResponse("创建计划板失败")
  }
}
