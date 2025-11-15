import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import { Toaster } from '@/components/ui/toaster'
// import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

// 加载自定义字体
const cangji = localFont({
  src: '../public/cangji.ttf',
  variable: '--font-cangji',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'OxHorse Planner - 智能日常管理',
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
