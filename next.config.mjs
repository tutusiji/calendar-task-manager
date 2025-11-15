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
}

export default nextConfig
