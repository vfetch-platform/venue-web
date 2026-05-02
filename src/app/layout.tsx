import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'
import { ToastProvider } from '@/components/Toast'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'VFetch Venue Portal',
  description: 'Venue staff portal for managing lost and found items',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VFetch Venue Portal',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0ea5e9',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="theme-color" content="#0ea5e9" />
      </head>
      <body className={`${dmSans.className} bg-slate-50 min-h-screen`}>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  )
}