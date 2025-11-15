import { NextResponse } from 'next/server'

/**
 * 统一的 API 响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * 成功响应
 * @param data 响应数据
 * @param message 可选的成功消息
 * @param status HTTP 状态码，默认 200
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message })
    },
    { status }
  )
}

/**
 * 错误响应
 * @param error 错误消息
 * @param status HTTP 状态码，默认 400
 */
export function errorResponse(
  error: string,
  status: number = 400
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error
    },
    { status }
  )
}

/**
 * 未授权响应（401）
 * @param message 错误消息
 */
export function unauthorizedResponse(
  message: string = '未授权，请先登录'
): NextResponse<ApiResponse> {
  return errorResponse(message, 401)
}

/**
 * 禁止访问响应（403）
 * @param message 错误消息
 */
export function forbiddenResponse(
  message: string = '无权访问此资源'
): NextResponse<ApiResponse> {
  return errorResponse(message, 403)
}

/**
 * 未找到响应（404）
 * @param message 错误消息
 */
export function notFoundResponse(
  message: string = '资源未找到'
): NextResponse<ApiResponse> {
  return errorResponse(message, 404)
}

/**
 * 服务器错误响应（500）
 * @param message 错误消息
 */
export function serverErrorResponse(
  message: string = '服务器内部错误'
): NextResponse<ApiResponse> {
  return errorResponse(message, 500)
}

/**
 * 验证错误响应（400）
 * @param message 错误消息
 */
export function validationErrorResponse(
  message: string
): NextResponse<ApiResponse> {
  return errorResponse(message, 400)
}
