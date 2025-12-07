import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Toaster } from '@/components/ui/toaster'
// import { Analytics } from '@vercel/analytics/next'
import { siteConfig } from '@/lib/site-config'
import './globals.css'

// 加载自定义字体
const cangji = localFont({
  src: '../public/cangji.ttf',
  variable: '--font-cangji',
  display: 'swap',
  fallback: ['system-ui', 'arial'],
})

export const metadata: Metadata = {
  title: siteConfig.pageTitle,
  description: siteConfig.pageDescription,
  generator: 'tutusiji',
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@800;900&display=swap" rel="stylesheet" />
      </head>
      <body className={`font-sans antialiased`}>
        {children}
        <Toaster />
        {/* <Analytics /> */}
      </body>
    </html>
  )
}
