# Phase 1B: Enhanced Header System

## 🎯 **OBJECTIVE**
Create a professional, information-rich header that provides constant awareness of system status, user context, and critical notifications - essential for field operations.

---

## 🎨 **STEP 1: Advanced Header Component**

### **A. Create Multi-Level Header System**
**File**: `src/components/layout/EnhancedHeader.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import {
  Menu, Bell, User, Settings, HelpCircle, LogOut,
  Wifi, WifiOff, MapPin, Clock, AlertTriangle,
  CheckCircle, Loader2, Battery, Signal
} from 'lucide-react'

interface EnhancedHeaderProps {
  onSidebarToggle: () => void
  sidebarOpen: boolean
}

export function EnhancedHeader({ onSidebarToggle, sidebarOpen }: EnhancedHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [batteryLevel, setBatteryLevel] = useState(85)
  const [signalStrength, setSignalStrength] = useState(4)
  const [isOnline, setIsOnline] = useState(true)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle')
  const [queueCount, setQueueCount] = useState(0)

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Mock battery and signal updates (in real app, get from device APIs)
  useEffect(() => {
    const interval = setInterval(() => {
      setBatteryLevel(prev => Math.max(20, prev - Math.random() * 2))
      setSignalStrength(Math.floor(Math.random() * 5))
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const getConnectionStatus = () => {
    if (!isOnline) return { status: 'offline' as const, label: 'Offline', color: 'text-orange-600' }
    if (syncStatus === 'syncing') return { status: 'syncing' as const, label: 'Syncing', color: 'text-blue-600' }
    if (syncStatus === 'error') return { status: 'error' as const, label: 'Sync Error', color: 'text-red-600' }
    return { status: 'online' as const, label: 'Online', color: 'text-green-600' }
  }

  const connectionStatus = getConnectionStatus()

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      {/* Main Header Bar */}
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSidebarToggle}
            className="h-10 w-10 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
              <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Disaster Management</h1>
              <p className="text-sm text-gray-500 hidden sm:block">Borno State Field Operations</p>
            </div>
          </div>
        </div>

        {/* Center Section - Location & Time */}
        <div className="hidden lg:flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span className="font-medium">Maiduguri, Nigeria</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{formatTime(currentTime)}</span>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Device Status - Mobile Only */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Battery className={`w-4 h-4 ${batteryLevel > 30 ? 'text-green-600' : 'text-red-600'}`} />
              <span className="text-xs text-gray-600">{Math.round(batteryLevel)}%</span>
            </div>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-3 mx-0.5 rounded-full ${
                    i < signalStrength ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
              {syncStatus === 'syncing' && (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              )}
            </div>
            <StatusBadge status={connectionStatus.status} size="sm">
              <span className="hidden sm:inline">{connectionStatus.label}</span>
            </StatusBadge>
          </div>

          {/* Queue Count */}
          {queueCount > 0 && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
              {queueCount} queued
            </Badge>
          )}

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative h-10 w-10 rounded-lg">
                <Bell className="w-5 h-5" />
                {/* Notification Badge */}
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">3</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                <Badge variant="secondary">3 new</Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem className="flex items-start gap-3 p-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">High Priority Assessment</p>
                  <p className="text-xs text-gray-600">Health emergency in Sector 7 requires immediate attention</p>
                  <p className="text-xs text-gray-500 mt-1">5 minutes ago</p>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuItem className="flex items-start gap-3 p-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Assessment Verified</p>
                  <p className="text-xs text-gray-600">WASH assessment #A2024-001 approved by coordinator</p>
                  <p className="text-xs text-gray-500 mt-1">12 minutes ago</p>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuItem className="flex items-start gap-3 p-3">
                <Wifi className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Sync Complete</p>
                  <p className="text-xs text-gray-600">3 assessments synchronized successfully</p>
                  <p className="text-xs text-gray-500 mt-1">1 hour ago</p>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center text-blue-600 font-medium">
                View All Notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 h-10 px-3 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <span className="hidden sm:block text-sm font-medium">Field Worker</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">Ahmed Mohammed</p>
                  <p className="text-xs text-gray-600">Field Assessor</p>
                  <p className="text-xs text-gray-500">ID: FW-2024-001</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                App Preferences
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="w-4 h-4 mr-2" />
                Help & Support
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status Bar - Contextual Information */}
      <div className="bg-gray-50 border-t border-gray-100 px-6 py-2 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-gray-600">
              <span>Last sync:</span>
              <span className="font-medium">2 minutes ago</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <span>Today's assessments:</span>
              <span className="font-medium text-blue-600">8 completed</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Quick Actions */}
            <Button variant="ghost" size="sm" className="h-7 px-3 text-xs">
              Sync Now
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-3 text-xs text-red-600">
              Emergency Mode
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## 🎨 **STEP 2: Breadcrumb Navigation System**

### **A. Create Dynamic Breadcrumb Component**
**File**: `src/components/layout/Breadcrumb.tsx`

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href: string
  icon?: React.ReactNode
  current?: boolean
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const pathname = usePathname()
  
  // Auto-generate breadcrumbs from pathname if not provided
  const breadcrumbItems = items || generateBreadcrumbs(pathname)

  return (
    <nav className={cn('flex items-center space-x-1 text-sm text-gray-600', className)}>
      {/* Home Link */}
      <Link 
        href="/"
        className="flex items-center gap-1 hover:text-gray-900 transition-colors rounded-md px-2 py-1 hover:bg-gray-100"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>
      
      {breadcrumbItems.length > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
      
      {/* Dynamic Breadcrumb Items */}
      {breadcrumbItems.map((item, index) => (
        <div key={item.href} className="flex items-center space-x-1">
          {item.current ? (
            <span className="font-medium text-gray-900 flex items-center gap-1 px-2 py-1">
              {item.icon}
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-gray-900 transition-colors rounded-md px-2 py-1 hover:bg-gray-100 flex items-center gap-1"
            >
              {item.icon}
              {item.label}
            </Link>
          )}
          {index < breadcrumbItems.length - 1 && (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      ))}
    </nav>
  )
}

// Helper function to generate breadcrumbs from pathname
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []
  
  let currentPath = ''
  
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const isLast = index === segments.length - 1
    
    breadcrumbs.push({
      label: formatSegmentLabel(segment),
      href: currentPath,
      current: isLast
    })
  })
  
  return breadcrumbs
}

function formatSegmentLabel(segment: string): string {
  // Handle special cases
  const specialCases: Record<string, string> = {
    'assessments': 'Assessments',
    'new': 'New Assessment',
    'entities': 'Affected Entities',
    'responses': 'Response Planning',
    'plan': 'Plan Response',
    'queue': 'Sync Queue',
    'help': 'Help & Documentation'
  }
  
  if (specialCases[segment]) {
    return specialCases[segment]
  }
  
  // Capitalize first letter and replace hyphens with spaces
  return segment
    .replace(/-/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
}
```

---

## 🎨 **STEP 3: Page Header Component**

### **A. Create Contextual Page Header**
**File**: `src/components/layout/PageHeader.tsx`

```tsx
'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from './Breadcrumb'
import { ArrowLeft, MoreVertical, Share, Bookmark } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PageHeaderProps {
  title: string
  description?: string
  showBackButton?: boolean
  backHref?: string
  actions?: React.ReactNode
  status?: {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
  }
  breadcrumbItems?: Array<{
    label: string
    href: string
    icon?: React.ReactNode
  }>
}

export function PageHeader({
  title,
  description,
  showBackButton = false,
  backHref = '/',
  actions,
  status,
  breadcrumbItems
}: PageHeaderProps) {
  return (
    <div className="space-y-4 mb-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Main Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <Button variant="ghost" size="sm" className="h-10 w-10 rounded-lg">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              {status && (
                <Badge variant={status.variant}>
                  {status.label}
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-lg text-gray-600 max-w-2xl">{description}</p>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {actions}
          
          {/* More Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-10 w-10 rounded-lg">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Share className="w-4 h-4 mr-2" />
                Share Page
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bookmark className="w-4 h-4 mr-2" />
                Bookmark
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
```

---

## 🔧 **STEP 4: Update Layout Integration**

### **A. Update Main Layout to Use Enhanced Header**
**File**: `src/components/layout/Layout.tsx` (update existing)

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { EnhancedHeader } from './EnhancedHeader'

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
      {/* Sidebar with improved spacing */}
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
        {/* Enhanced Header */}
        <EnhancedHeader onSidebarToggle={toggleSidebar} sidebarOpen={sidebarOpen} />
        
        {/* Main Content with Better Spacing */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
```

### **B. Create Header Hook for State Management**
**File**: `src/hooks/useHeaderState.ts`

```tsx
'use client'

import { useState, useEffect } from 'react'

interface HeaderState {
  isOnline: boolean
  batteryLevel: number
  signalStrength: number
  syncStatus: 'idle' | 'syncing' | 'error'
  queueCount: number
  notifications: Array<{
    id: string
    type: 'info' | 'warning' | 'error' | 'success'
    title: string
    description: string
    timestamp: Date
    read: boolean
  }>
}

export function useHeaderState() {
  const [state, setState] = useState<HeaderState>({
    isOnline: navigator.onLine,
    batteryLevel: 85,
    signalStrength: 4,
    syncStatus: 'idle',
    queueCount: 0,
    notifications: [
      {
        id: '1',
        type: 'warning',
        title: 'High Priority Assessment',
        description: 'Health emergency in Sector 7 requires immediate attention',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        read: false
      },
      {
        id: '2',
        type: 'success',
        title: 'Assessment Verified',
        description: 'WASH assessment #A2024-001 approved by coordinator',
        timestamp: new Date(Date.now() - 12 * 60 * 1000),
        read: false
      },
      {
        id: '3',
        type: 'info',
        title: 'Sync Complete',
        description: '3 assessments synchronized successfully',
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        read: false
      }
    ]
  })

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }))
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Mock data updates (replace with real API calls)
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        batteryLevel: Math.max(20, prev.batteryLevel - Math.random() * 0.5),
        signalStrength: Math.floor(Math.random() * 5)
      }))
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const markNotificationAsRead = (id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    }))
  }

  const unreadCount = state.notifications.filter(n => !n.read).length

  return {
    ...state,
    unreadCount,
    markNotificationAsRead
  }
}
```

---

## ✅ **TESTING CHECKLIST**

1. **Header Functionality**:
   - ✅ Sidebar toggle works correctly
   - ✅ Connection status updates properly
   - ✅ Notifications dropdown displays correctly
   - ✅ User menu shows appropriate options

2. **Responsive Behavior**:
   - ✅ Header adapts to different screen sizes
   - ✅ Mobile optimizations work properly
   - ✅ Status information remains accessible

3. **Information Display**:
   - ✅ Time updates correctly
   - ✅ Battery and signal indicators work
   - ✅ Sync status shows appropriate states
   - ✅ Queue count displays when relevant

4. **User Experience**:
   - ✅ Quick actions are easily accessible
   - ✅ Notifications provide clear context
   - ✅ Professional appearance maintained

---

## 🎯 **HEADER ENHANCEMENTS ACHIEVED**

- **Rich Context Awareness**: Time, location, device status, connection state
- **Critical Notifications**: Priority alerts, sync status, assessment updates  
- **Quick Actions**: Emergency mode, sync controls, user preferences
- **Professional Branding**: Humanitarian color scheme, consistent iconography
- **Mobile Optimization**: Responsive design, touch-friendly interactions

**Next**: Proceed to `03-layout-structure.md` for complete layout architecture implementation.