/**
 * 站点配置
 * 从环境变量中读取站点相关配置，支持不同部署环境使用不同的站点信息
 */

export const siteConfig = {
  // 应用名称
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'OxHorse Planner',
  
  // 应用副标题
  appSubtitle: process.env.NEXT_PUBLIC_APP_SUBTITLE || '牛马日记1',
  
  // 应用标语/描述
  appSlogan: process.env.NEXT_PUBLIC_APP_SLOGAN || '打工人必备的轻量任务管理工具',
  
  // 页面标题（浏览器标签页）
  pageTitle: process.env.NEXT_PUBLIC_PAGE_TITLE || 'OxHorse Planner - 牛马日记',
  
  // 页面描述（SEO）- 使用完整格式
  get pageDescription() {
    return `${this.appName} ${this.appSubtitle} —— ${this.appSlogan}`
  },
  
  // Logo Alt 文本
  get logoAlt() {
    return `${this.appName} Logo`
  },
  
  // 完整标题（带副标题）
  get fullTitle() {
    return `${this.appSubtitle} —— ${this.appSlogan}`
  }
}
