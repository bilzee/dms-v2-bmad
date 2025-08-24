# Phase 1A: Collapsible Sidebar Layout Implementation

## 🎯 **OBJECTIVE**
Implement the missing collapsible sidebar architecture from the UX specification - this is the most critical missing piece for proper navigation.

---

## 🏗️ **STEP 1: Create Layout Components**

### **A. Create Sidebar Component**
**File**: `src/components/layout/Sidebar.tsx`

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardList, BarChart3, Building, Archive, AlertTriangle,
  HelpCircle, Settings, ChevronLeft, ChevronRight, User,
  Heart, Droplet, Home, Utensils, Shield, Users
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

// Role-based navigation configuration
const navigationSections = {
  assessor: [
    {
      title: 'Assessment Types',
      items: [
        { icon: Heart, label: 'Health', href: '/assessments/new?type=HEALTH', badge: 3 },
        { icon: Droplet, label: 'WASH', href: '/assessments/new?type=WASH', badge: 1 },
        { icon: Home, label: 'Shelter', href: '/assessments/new?type=SHELTER', badge: 2 },
        { icon: Utensils, label: 'Food', href: '/assessments/new?type=FOOD', badge: 0 },
        { icon: Shield, label: 'Security', href: '/assessments/new?type=SECURITY', badge: 1 },
        { icon: Users, label: 'Population', href: '/assessments/new?type=POPULATION', badge: 4 }
      ]
    },
    {
      title: 'Management',
      items: [
        { icon: ClipboardList, label: 'All Assessments', href: '/assessments', badge: 0 },
        { icon: Building, label: 'Entities', href: '/entities', badge: 0 },
        { icon: Archive, label: 'Queue', href: '/queue', badge: 0 }
      ]
    }
  ],
  coordinator: [
    {
      title: 'Verification',
      items: [
        { icon: ClipboardList, label: 'Assessment Queue', href: '/coordinator/assessments', badge: 5 },
        { icon: BarChart3, label: 'Response Queue', href: '/coordinator/responses', badge: 3 }
      ]
    },
    {
      title: 'Management',
      items: [
        { icon: AlertTriangle, label: 'Crisis Dashboard', href: '/coordinator/crisis', badge: 0 },
        { icon: Building, label: 'Resource Overview', href: '/coordinator/resources', badge: 0 }
      ]
    }
  ],
  responder: [
    {
      title: 'Response Planning',
      items: [
        { icon: BarChart3, label: 'Plan Response', href: '/responses/plan', badge: 0 },
        { icon: ClipboardList, label: 'Active Responses', href: '/responses/active', badge: 2 },
        { icon: Archive, label: 'Delivery Tracking', href: '/responses/tracking', badge: 1 }
      ]
    }
  ],
  donor: [
    {
      title: 'Contribution Tracking',
      items: [
        { icon: BarChart3, label: 'Donation Planning', href: '/donor/planning', badge: 0 },
        { icon: ClipboardList, label: 'Commitments', href: '/donor/commitments', badge: 1 },
        { icon: Archive, label: 'Performance', href: '/donor/performance', badge: 0 }
      ]
    }
  ]
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [currentRole, setCurrentRole] = useState<keyof typeof navigationSections>('assessor')

  return (
    <div className={cn(
      "flex flex-col h-full bg-white shadow-lg border-r border-gray-200 transition-all duration-300",
      isOpen ? "w-64" : "w-16"
    )}>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className={cn("flex items-center gap-3", !isOpen && "justify-center")}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          {isOpen && (
            <div>
              <h2 className="font-semibold text-gray-800">DMS</h2>
              <p className="text-xs text-gray-500">Field Operations</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn("h-8 w-8", !isOpen && "mx-auto")}
        >
          {isOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Role Selection */}
      {isOpen && (
        <div className="p-4 border-b border-gray-200">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role</label>
          <select
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value as keyof typeof navigationSections)}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="assessor">Field Assessor</option>
            <option value="coordinator">Crisis Coordinator</option>
            <option value="responder">Field Responder</option>
            <option value="donor">Donor Organization</option>
          </select>
        </div>
      )}

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-4">
        {navigationSections[currentRole].map((section, sectionIdx) => (
          <div key={section.title} className={cn("mb-6", sectionIdx !== 0 && "mt-8")}>
            {isOpen && (
              <h3 className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={cn(
                      "mx-2 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-blue-100 text-blue-700 border border-blue-200" 
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                      !isOpen && "justify-center"
                    )}>
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {isOpen && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {item.badge > 0 && (
                            <Badge variant={isActive ? "default" : "secondary"} className="h-5 text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Footer */}
      <div className="border-t border-gray-200 p-4">
        <Link href="/help">
          <div className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors",
            !isOpen && "justify-center"
          )}>
            <HelpCircle className="w-5 h-5" />
            {isOpen && <span>Help & Support</span>}
          </div>
        </Link>
      </div>
    </div>
  )
}
```

### **B. Create Enhanced Header Component**
**File**: `src/components/layout/Header.tsx`

```tsx
'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Menu, Wifi, Bell, User } from 'lucide-react'

interface HeaderProps {
  onSidebarToggle: () => void
  sidebarOpen: boolean
}

export function Header({ onSidebarToggle, sidebarOpen }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center px-6">
      <div className="flex items-center justify-between w-full">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSidebarToggle}
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div>
            <h1 className="text-xl font-bold text-gray-800">Disaster Management</h1>
            <p className="text-sm text-gray-500 hidden sm:block">Field Operations Dashboard</p>
          </div>
        </div>

        {/* Right Side - Status Indicators */}
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <Wifi className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Online</span>
          </div>

          {/* Queue Status */}
          <Badge variant="outline" className="hidden sm:flex">
            0 queued
          </Badge>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
          </Button>

          {/* User Profile */}
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <User className="w-5 h-5" />
            <span className="hidden sm:block text-sm">Field Worker</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
```

### **C. Create Main Layout Wrapper**
**File**: `src/components/layout/Layout.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

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

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

  return (
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
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
```

---

## 🔧 **STEP 2: Update App Layout**

### **Update Root Layout**
**File**: `src/app/layout.tsx`

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Layout } from '@/components/layout/Layout'

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
        <Layout>
          {children}
        </Layout>
      </body>
    </html>
  )
}
```

---

## 🎯 **STEP 3: Update Dashboard Content**

### **Transform Homepage Layout**
**File**: `src/app/page.tsx` (Update the return statement)

```tsx
// Remove the outer layout div and header - now handled by Layout component
export default function HomePage() {
  // ... keep existing data arrays (mainFeatures, assessmentTypes)

  return (
    <>
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome back, Field Worker</h2>
        <p className="text-gray-600">Here's your current operational overview</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">12</p>
              <p className="text-sm text-gray-600">Active Assessments</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">8</p>
              <p className="text-sm text-gray-600">Completed Today</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">3</p>
              <p className="text-sm text-gray-600">Pending Sync</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">1</p>
              <p className="text-sm text-gray-600">Critical Issues</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rest of your existing content - keep all the card layouts */}
      {/* ... existing mainFeatures grid, assessmentTypes grid, etc. */}
    </>
  )
}
```

---

## ✅ **TESTING CHECKLIST**

1. **Sidebar Functionality**:
   - ✅ Sidebar toggles open/closed correctly
   - ✅ Role selection dropdown works
   - ✅ Navigation items highlight active page
   - ✅ Badge counts display properly

2. **Responsive Behavior**:
   - ✅ Desktop: Sidebar visible by default
   - ✅ Mobile: Sidebar hidden with overlay when open
   - ✅ Header hamburger menu works on mobile

3. **Visual Polish**:
   - ✅ Smooth transitions when toggling
   - ✅ Proper hover states on navigation items
   - ✅ Icons and badges aligned correctly

4. **Functionality Preservation**:
   - ✅ All existing links continue to work
   - ✅ Assessment type navigation functional
   - ✅ Emergency report button accessible

---

## 🚨 **CRITICAL NOTES**

- This creates the **foundational architecture** for the entire UX overhaul
- **Test thoroughly** before proceeding to Phase 2
- The sidebar is **role-based** as specified in the UX requirements
- Mobile behavior includes **proper overlay and touch interactions**

**Next**: Proceed to `02-header-enhancement.md` for additional header improvements.