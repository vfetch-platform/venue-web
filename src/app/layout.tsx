import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VFetch Venue Portal',
  description: 'Venue staff portal for managing lost and found items',
  manifest: '/manifest.json',
  themeColor: '#0ea5e9',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VFetch Venue Portal',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="theme-color" content="#0ea5e9" />
        <link 
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="bg-slate-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}