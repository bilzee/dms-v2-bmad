import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DMS - Disaster Management System',
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
        <div id="root">
          {children}
        </div>
        <Toaster
          position="top-right"
          gutter={8}
          toastOptions={{
            duration: 5000,
            style: {
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              maxWidth: '500px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
              duration: 7000,
            },
          }}
        />
      </body>
    </html>
  )
}