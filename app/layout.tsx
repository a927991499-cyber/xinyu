import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '心屿·你的数字备份',
  description: '你不会消失，记忆永远在线，备份另外一个你',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  other: {
    'huzhan-web-verification': '51fa973a99',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="bg-background">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
