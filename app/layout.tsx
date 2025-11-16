import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Toaster } from '@/components/ui/toaster'
// import { Analytics } from '@vercel/analytics/next'
import './globals.css'

// 加载自定义字体
const cangji = localFont({
  src: '../public/cangji.ttf',
  variable: '--font-cangji',
  display: 'swap',
  fallback: ['system-ui', 'arial'],
})

export const metadata: Metadata = {
  title: 'OxHorse Planner - 牛马日记',
  description: 'Happy every day with OxHorse Planner',
  generator: 'v0.app',
  icons: {
    icon: '/logo.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cangji.variable}>
      <body className={`font-sans antialiased`}>
        {children}
        <Toaster />
        {/* <Analytics /> */}
      </body>
    </html>
  )
}
