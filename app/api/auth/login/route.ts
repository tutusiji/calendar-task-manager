import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, generateToken } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { validateRequiredFields } from "@/lib/validation";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
  resetRateLimit,
} from "@/lib/server/security/rate-limit";

const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_IP_MAX_ATTEMPTS = 30;
const LOGIN_ACCOUNT_MAX_ATTEMPTS = 10;

// POST /api/auth/login - 用户登录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 验证必填字段
    const requiredValidation = validateRequiredFields(body, [
      "username",
      "password",
    ]);
    if (!requiredValidation.valid) {
      return validationErrorResponse(requiredValidation.message!);
    }

    if (typeof username !== "string" || typeof password !== "string") {
      return validationErrorResponse("用户名或密码格式错误");
    }

    const normalizedUsername = username.trim().toLowerCase();
    const clientIp = getClientIp(request);

    const ipRateLimit = checkRateLimit(
      `login:ip:${clientIp}`,
      LOGIN_IP_MAX_ATTEMPTS,
      LOGIN_RATE_LIMIT_WINDOW_MS
    );
    if (!ipRateLimit.allowed) {
      return rateLimitExceededResponse(ipRateLimit.retryAfterSeconds);
    }

    const accountRateLimitKey = `login:account:${clientIp}:${normalizedUsername}`;
    const accountRateLimit = checkRateLimit(
      accountRateLimitKey,
      LOGIN_ACCOUNT_MAX_ATTEMPTS,
      LOGIN_RATE_LIMIT_WINDOW_MS
    );
    if (!accountRateLimit.allowed) {
      return rateLimitExceededResponse(accountRateLimit.retryAfterSeconds);
    }

    // 查找用户（使用小写用户名）
    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      select: {
        id: true,
        username: true,
        password: true,
        name: true,
        email: true,
        avatar: true,
        gender: true,
        role: true,
        isAdmin: true,
        currentOrganizationId: true,
        defaultTeamId: true,
        points: true,
      },
    });

    if (!user) {
      return errorResponse("用户名或密码错误", 401);
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return errorResponse("用户名或密码错误", 401);
    }

    resetRateLimit(accountRateLimitKey);

    // 生成 JWT Token
    const token = generateToken({ userId: user.id });

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;

    return successResponse(
      {
        user: userWithoutPassword,
        token,
      },
      "登录成功"
    );
  } catch (error) {
    console.error("Error logging in:", error);
    return serverErrorResponse("登录失败，请稍后重试");
  }
}
