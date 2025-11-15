/**
 * 验证邮箱格式
 * @param email 邮箱地址
 * @returns 是否有效
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 验证用户名格式
 * - 长度：3-20 个字符
 * - 只能包含字母、数字、下划线、连字符
 * - 必须以字母或数字开头
 * @param username 用户名
 * @returns 是否有效
 */
export function isValidUsername(username: string): boolean {
  if (!username || username.length < 3 || username.length > 20) {
    return false
  }
  const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/
  return usernameRegex.test(username)
}

/**
 * 验证密码强度
 * - 最少 6 个字符
 * - 至少包含一个字母和一个数字
 * @param password 密码
 * @returns 验证结果对象
 */
export function validatePassword(password: string): {
  valid: boolean
  message?: string
} {
  if (!password) {
    return { valid: false, message: '密码不能为空' }
  }

  if (password.length < 6) {
    return { valid: false, message: '密码长度至少为 6 个字符' }
  }

  if (password.length > 100) {
    return { valid: false, message: '密码长度不能超过 100 个字符' }
  }

  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /\d/.test(password)

  if (!hasLetter || !hasNumber) {
    return { valid: false, message: '密码必须包含字母和数字' }
  }

  return { valid: true }
}

/**
 * 验证日期格式和有效性
 * @param dateString 日期字符串
 * @returns 是否为有效日期
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

/**
 * 验证日期范围
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 验证结果对象
 */
export function validateDateRange(
  startDate: string,
  endDate: string
): {
  valid: boolean
  message?: string
} {
  if (!isValidDate(startDate)) {
    return { valid: false, message: '开始日期格式无效' }
  }

  if (!isValidDate(endDate)) {
    return { valid: false, message: '结束日期格式无效' }
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (start > end) {
    return { valid: false, message: '开始日期不能晚于结束日期' }
  }

  return { valid: true }
}

/**
 * 验证时间格式 (HH:MM)
 * @param timeString 时间字符串
 * @returns 是否有效
 */
export function isValidTime(timeString: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(timeString)
}

/**
 * 验证颜色格式（十六进制）
 * @param color 颜色字符串
 * @returns 是否有效
 */
export function isValidHexColor(color: string): boolean {
  const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  return colorRegex.test(color)
}

/**
 * 清理和验证字符串
 * @param str 输入字符串
 * @param maxLength 最大长度
 * @returns 清理后的字符串
 */
export function sanitizeString(str: string, maxLength: number = 1000): string {
  if (!str) return ''
  return str.trim().slice(0, maxLength)
}

/**
 * 验证必填字段
 * @param fields 字段对象
 * @param requiredFields 必填字段名数组
 * @returns 验证结果对象
 */
export function validateRequiredFields(
  fields: Record<string, any>,
  requiredFields: string[]
): {
  valid: boolean
  message?: string
  missingFields?: string[]
} {
  const missingFields: string[] = []

  for (const field of requiredFields) {
    if (
      fields[field] === undefined ||
      fields[field] === null ||
      fields[field] === ''
    ) {
      missingFields.push(field)
    }
  }

  if (missingFields.length > 0) {
    return {
      valid: false,
      message: `缺少必填字段: ${missingFields.join(', ')}`,
      missingFields
    }
  }

  return { valid: true }
}
