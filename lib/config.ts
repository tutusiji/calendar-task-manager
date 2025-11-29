/**
 * 应用配置
 * 支持通过环境变量覆盖默认配置
 */

export const config = {
  /**
   * 头像服务配置
   * 生产环境: 通过 AVATAR_API_URL 环境变量配置
   * 开发环境: 默认使用公网 DiceBear API
   * 内网部署: 设置为内网头像服务地址,如 http://10.11.22.33:4567
   */
  avatarApiUrl: process.env.AVATAR_API_URL || 'https://api.dicebear.com',
  
  /**
   * 头像 API 路径模板
   * 完整 URL 格式: {avatarApiUrl}/9.x/avataaars/svg?seed={username}
   */
  avatarApiPath: '/9.x/avataaars/svg',
  
  /**
   * 生成用户头像 URL
   * @param username 用户名,用作头像种子
   * @returns 完整的头像 URL
   */
  getAvatarUrl(username: string): string {
    return `${this.avatarApiUrl}${this.avatarApiPath}?seed=${username}`
  }
}
