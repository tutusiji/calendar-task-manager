import { NextRequest } from "next/server"
import { switchOrganization } from "@/lib/modules/organization/organization.service"
import { successResponse, errorResponse } from "@/lib/api-response"
import { authenticate } from "@/lib/middleware"

// POST /api/organizations/switch - 切换当前组织
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const body = await req.json()
    const { organizationId } = body

    if (!organizationId) {
      return errorResponse("组织ID不能为空")
    }

    if (!(await switchOrganization(auth.userId, organizationId))) {
      return errorResponse("您不是该组织的成员", 403)
    }

    return successResponse({ 
      message: "已切换组织",
      organizationId 
    })
  } catch (error) {
    console.error("切换组织失败:", error)
    return errorResponse("切换组织失败")
  }
}
