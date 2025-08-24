import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { OfflineModeAlert } from '@/components/shared/OfflineModeAlert'
import { Layout } from '@/components/layouts/Layout'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Disaster Management System',
  description: 'Comprehensive disaster management and rapid assessment platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <OfflineModeAlert />
        <Layout>
          {children}
        </Layout>
        <Toaster />
      </body>
    </html>
  )
}