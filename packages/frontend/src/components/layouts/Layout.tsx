'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { RoleContextProvider } from '@/components/providers/RoleContextProvider'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Handle responsive sidebar behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile) {
        setSidebarOpen(false)
      }
    }

    // Initial check after mount to avoid hydration mismatch
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

  return (
    <RoleContextProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className={`${isMobile && sidebarOpen ? 'fixed inset-0 z-50' : ''}`}>
          {isMobile && sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={toggleSidebar}
            />
          )}
          <div className={`${isMobile ? 'fixed left-0 top-0 h-full z-50' : 'relative'}`}>
            <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onSidebarToggle={toggleSidebar} sidebarOpen={sidebarOpen} />
          
          <main className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm p-6">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </RoleContextProvider>
  )
}