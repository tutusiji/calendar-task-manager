/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker 部署使用 standalone 模式
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  
  // 禁用 Turbopack 的字体优化（Docker 构建时无法访问外部字体）
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons'],
  },
}

export default nextConfig
