import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from '@/components/ui/toaster'
import { OfflineModeAlert } from '@/components/shared/OfflineModeAlert'
import { PWAInstallPrompt } from '@/components/layouts/PWAInstallPrompt'
import { Layout } from '@/components/layouts/Layout'
import { auth } from '@/auth'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Disaster Management System',
  description: 'Humanitarian disaster management system for field operations',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DMS Field',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'DMS Field',
    'application-name': 'DMS Field',
    'msapplication-TileColor': '#dc2626',
    'msapplication-config': '/browserconfig.xml',
    'theme-color': '#dc2626',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider session={session}>
          <OfflineModeAlert />
          <PWAInstallPrompt />
          <Layout>
            {children}
          </Layout>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  )
}