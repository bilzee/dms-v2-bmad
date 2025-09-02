import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from '@/components/ui/toaster'
import { OfflineModeAlert } from '@/components/shared/OfflineModeAlert'
import { Layout } from '@/components/layouts/Layout'
import { auth } from '@/auth'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Disaster Management System',
  description: 'Comprehensive disaster management and rapid assessment platform',
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
          <Layout>
            {children}
          </Layout>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  )
}