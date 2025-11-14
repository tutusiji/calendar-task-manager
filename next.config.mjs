/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静态导出配置 - 生成纯静态 HTML 页面
  output: 'export',
  
  // 构建输出目录配置
  distDir: 'dist',
  
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
