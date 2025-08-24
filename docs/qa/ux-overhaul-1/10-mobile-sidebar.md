# Phase 4A: Mobile-Optimized Sidebar & Navigation

## 🎯 **OBJECTIVE**
Implement mobile-first navigation patterns with hamburger menu, touch-friendly interactions, and proper overlay behaviors for field workers using mobile devices in challenging environments.

---

## 📱 **STEP 1: Mobile Sidebar Enhancements**

### **A. Enhanced Mobile Sidebar Component**
**File**: `src/components/layout/MobileSidebar.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  ClipboardList, BarChart3, Building, Archive, AlertTriangle,
  HelpCircle, Settings, X, User, ChevronDown, ChevronRight,
  Heart, Droplet, Home, Utensils, Shield, Users, Menu
} from 'lucide-react'

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

// Mobile-optimized navigation structure
const mobileNavigation = {
  assessor: {
    label: 'Field Assessor',
    icon: <ClipboardList className="w-5 h-5" />,
    sections: [
      {
        title: 'Quick Assessment',
        items: [
          { icon: Heart, label: 'Health Emergency', href: '/assessments/new?type=HEALTH', badge: 3, priority: 'high' },
          { icon: Droplet, label: 'WASH Crisis', href: '/assessments/new?type=WASH', badge: 1, priority: 'medium' },
          { icon: Shield, label: 'Security Issue', href: '/assessments/new?type=SECURITY', badge: 1, priority: 'high' }
        ]
      },
      {
        title: 'All Types',
        collapsible: true,
        items: [
          { icon: Home, label: 'Shelter', href: '/assessments/new?type=SHELTER', badge: 2 },
          { icon: Utensils, label: 'Food', href: '/assessments/new?type=FOOD', badge: 0 },
          { icon: Users, label: 'Population', href: '/assessments/new?type=POPULATION', badge: 4 }
        ]
      },
      {
        title: 'Management',
        items: [
          { icon: ClipboardList, label: 'My Assessments', href: '/assessments', badge: 12 },
          { icon: Building, label: 'Locations', href: '/entities', badge: 0 },
          { icon: Archive, label: 'Offline Queue', href: '/queue', badge: 3 }
        ]
      }
    ]
  },
  coordinator: {
    label: 'Crisis Coordinator',
    icon: <BarChart3 className="w-5 h-5" />,
    sections: [
      {
        title: 'Urgent Actions',
        items: [
          { icon: AlertTriangle, label: 'Pending Verifications', href: '/coordinator/assessments', badge: 5, priority: 'high' },
          { icon: ClipboardList, label: 'Response Approvals', href: '/coordinator/responses', badge: 3, priority: 'medium' }
        ]
      },
      {
        title: 'Management',
        items: [
          { icon: BarChart3, label: 'Crisis Dashboard', href: '/coordinator/crisis', badge: 0 },
          { icon: Building, label: 'Resource Overview', href: '/coordinator/resources', badge: 0 }
        ]
      }
    ]
  }
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname()
  const [currentRole, setCurrentRole] = useState<keyof typeof mobileNavigation>('assessor')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Close sidebar on route change
  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const toggleSection = (sectionTitle: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionTitle)) {
      newExpanded.delete(sectionTitle)
    } else {
      newExpanded.add(sectionTitle)
    }
    setExpandedSections(newExpanded)
  }

  const currentNav = mobileNavigation[currentRole]

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={cn(
        'fixed left-0 top-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-out lg:hidden',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-lg">DMS Mobile</h2>
              <p className="text-sm text-gray-600">Field Operations</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-10 w-10 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Connection Status */}
        <div className="p-4 bg-green-50 border-b border-green-200">
          <div className="flex items-center justify-between">
            <StatusBadge status="online" pulse className="text-sm">
              Connected
            </StatusBadge>
            <Badge variant="outline" className="text-xs">
              3 items syncing
            </Badge>
          </div>
        </div>

        {/* Role Selection */}
        <div className="p-4 border-b border-gray-200">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
            Current Role
          </label>
          <div className="relative">
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as keyof typeof mobileNavigation)}
              className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="assessor">Field Assessor</option>
              <option value="coordinator">Crisis Coordinator</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto py-2">
          {currentNav.sections.map((section) => (
            <div key={section.title} className="mb-2">
              {/* Section Header */}
              {section.collapsible ? (
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    {section.title}
                  </span>
                  <ChevronRight className={cn(
                    "w-4 h-4 text-gray-400 transition-transform",
                    expandedSections.has(section.title) && "rotate-90"
                  )} />
                </button>
              ) : (
                <div className="px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    {section.title}
                  </h3>
                </div>
              )}

              {/* Section Items */}
              <div className={cn(
                "space-y-1 px-2",
                section.collapsible && !expandedSections.has(section.title) && "hidden"
              )}>
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  const isPriority = item.priority === 'high'
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className={cn(
                        "flex items-center gap-3 px-3 py-4 mx-2 rounded-xl text-sm font-medium transition-all duration-200",
                        isActive 
                          ? "bg-blue-100 text-blue-700 border-l-4 border-blue-500 shadow-sm" 
                          : "text-gray-700 hover:bg-gray-100 active:bg-gray-200",
                        isPriority && !isActive && "border-l-4 border-red-300 bg-red-50"
                      )}>
                        <div className={cn(
                          "flex-shrink-0 p-2 rounded-lg",
                          isActive ? "bg-blue-200 text-blue-700" : "bg-gray-100 text-gray-600"
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <span className="block truncate">{item.label}</span>
                          {isPriority && (
                            <span className="text-xs text-red-600 font-medium">Priority</span>
                          )}
                        </div>
                        
                        {item.badge > 0 && (
                          <Badge 
                            variant={isActive ? "default" : isPriority ? "destructive" : "secondary"}
                            className="text-xs min-w-[1.5rem] h-6"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-2">
            <Link href="/help" className="block">
              <div className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                <HelpCircle className="w-5 h-5" />
                <span>Help & Support</span>
              </div>
            </Link>
            <Link href="/settings" className="block">
              <div className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
```

### **B. Enhanced Mobile Header**
**File**: `src/components/layout/MobileHeader.tsx`

```tsx
'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { Menu, Bell, User, Wifi, AlertTriangle } from 'lucide-react'

interface MobileHeaderProps {
  onMenuToggle: () => void
  title?: string
  subtitle?: string
}

export function MobileHeader({ onMenuToggle, title = "DMS", subtitle }: MobileHeaderProps) {
  return (
    <header className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left Side */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            className="h-10 w-10 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="min-w-0">
            <h1 className="font-bold text-gray-800 text-lg truncate">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Connection Status - Compact */}
          <StatusBadge status="online" size="sm" className="hidden sm:flex">
            Online
          </StatusBadge>
          
          {/* Connection Indicator - Icon Only */}
          <div className="sm:hidden flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative h-10 w-10 rounded-lg">
            <Bell className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">3</span>
            </div>
          </Button>

          {/* User Profile */}
          <Button variant="ghost" size="sm" className="h-10 w-10 rounded-lg">
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Quick Status Bar */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Last sync: 2m ago</span>
            <Badge variant="outline" className="text-xs">
              0 queued
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-amber-600">
            <AlertTriangle className="w-3 h-3" />
            <span>1 priority</span>
          </div>
        </div>
      </div>
    </header>
  )
}
```

---

## 📱 **STEP 2: Touch-Optimized Components**

### **A. Mobile-First Card Component**
**File**: `src/components/ui/mobile-card.tsx`

```tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle, CardProps } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MobileCardProps extends CardProps {
  touchOptimized?: boolean
  compact?: boolean
  highlighted?: boolean
}

export function MobileCard({ 
  children, 
  touchOptimized = true, 
  compact = false,
  highlighted = false,
  className, 
  ...props 
}: MobileCardProps) {
  return (
    <Card
      {...props}
      className={cn(
        'transition-all duration-200',
        touchOptimized && 'active:scale-95 active:shadow-sm',
        compact ? 'p-3' : 'p-4',
        highlighted && 'ring-2 ring-blue-500 ring-opacity-50',
        'hover:shadow-md',
        className
      )}
    >
      {children}
    </Card>
  )
}

// Quick Assessment Card for Mobile
export function QuickAssessmentCard({ 
  title, 
  icon, 
  badge, 
  priority, 
  href, 
  color = 'blue' 
}: {
  title: string
  icon: React.ReactNode
  badge?: number
  priority?: 'high' | 'medium' | 'low'
  href: string
  color?: string
}) {
  return (
    <MobileCard 
      className={cn(
        "cursor-pointer border-l-4",
        priority === 'high' && 'border-l-red-500 bg-red-50',
        priority === 'medium' && 'border-l-yellow-500 bg-yellow-50',
        (!priority || priority === 'low') && `border-l-${color}-500 bg-${color}-50`
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-xl flex items-center justify-center",
              priority === 'high' && 'bg-red-100',
              priority === 'medium' && 'bg-yellow-100',
              (!priority || priority === 'low') && `bg-${color}-100`
            )}>
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{title}</h3>
              {priority === 'high' && (
                <p className="text-xs text-red-600 font-medium">High Priority</p>
              )}
            </div>
          </div>
          {badge && badge > 0 && (
            <div className={cn(
              "px-3 py-1 rounded-full text-sm font-bold",
              priority === 'high' && 'bg-red-600 text-white',
              priority === 'medium' && 'bg-yellow-600 text-white',
              (!priority || priority === 'low') && `bg-${color}-600 text-white`
            )}>
              {badge}
            </div>
          )}
        </div>
      </CardContent>
    </MobileCard>
  )
}
```

### **B. Mobile Button Variants**
**File**: `src/components/ui/mobile-button.tsx`

```tsx
'use client'

import { Button, ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface MobileButtonProps extends ButtonProps {
  fullWidth?: boolean
  touchOptimized?: boolean
  loading?: boolean
  loadingText?: string
}

export function MobileButton({ 
  children,
  fullWidth = false,
  touchOptimized = true,
  loading = false,
  loadingText = "Loading...",
  className,
  disabled,
  ...props 
}: MobileButtonProps) {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      className={cn(
        // Base mobile-friendly sizing
        'h-12 text-base font-semibold',
        // Touch optimization
        touchOptimized && 'active:scale-95 transition-transform duration-100',
        // Full width option
        fullWidth && 'w-full',
        // Loading state
        loading && 'cursor-not-allowed',
        className
      )}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading ? loadingText : children}
    </Button>
  )
}

// Emergency Action Button
export function EmergencyButton({ children, ...props }: MobileButtonProps) {
  return (
    <MobileButton
      {...props}
      className={cn(
        'bg-red-600 hover:bg-red-700 text-white shadow-lg',
        'ring-2 ring-red-300 ring-opacity-50',
        'animate-pulse hover:animate-none',
        props.className
      )}
    >
      {children}
    </MobileButton>
  )
}
```

---

## 📱 **STEP 3: Update Layout System for Mobile**

### **A. Enhanced Layout Component with Mobile Support**
**File**: `src/components/layout/ResponsiveLayout.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileSidebar } from './MobileSidebar'
import { MobileHeader } from './MobileHeader'

interface ResponsiveLayoutProps {
  children: React.ReactNode
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile and handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      
      // Auto-close sidebar on mobile
      if (mobile && sidebarOpen) {
        setSidebarOpen(false)
      }
      // Auto-open sidebar on desktop
      if (!mobile && !sidebarOpen) {
        setSidebarOpen(true)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [sidebarOpen])

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  const closeSidebar = () => setSidebarOpen(false)

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileHeader onMenuToggle={toggleSidebar} />
        <MobileSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        
        <main className="pb-safe">
          <div className="p-4">
            {children}
          </div>
        </main>
      </div>
    )
  }

  // Desktop layout (existing)
  return (
    <div className="flex h-screen bg-gray-50">
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300`}>
        <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      </div>
      
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

### **B. Mobile-Optimized Dashboard Page**
**File**: `src/app/mobile-dashboard.tsx` (alternative mobile layout)

```tsx
'use client'

import { useState } from 'react'
import { QuickAssessmentCard } from '@/components/ui/mobile-card'
import { MobileButton, EmergencyButton } from '@/components/ui/mobile-button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Heart, Droplet, Shield, AlertTriangle, Clock, CheckCircle,
  MapPin, Users, Building
} from 'lucide-react'

export function MobileDashboard() {
  const [selectedRegion, setSelectedRegion] = useState('Maiduguri')

  const quickActions = [
    { icon: <Heart className="w-6 h-6 text-red-500" />, title: 'Health Emergency', badge: 3, priority: 'high' as const, href: '/assessments/new?type=HEALTH' },
    { icon: <Droplet className="w-6 h-6 text-blue-500" />, title: 'WASH Crisis', badge: 1, priority: 'medium' as const, href: '/assessments/new?type=WASH' },
    { icon: <Shield className="w-6 h-6 text-purple-500" />, title: 'Security Issue', badge: 1, priority: 'high' as const, href: '/assessments/new?type=SECURITY' }
  ]

  return (
    <div className="space-y-6">
      {/* Location Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-800">Current Location</span>
          </div>
          <StatusBadge status="online" size="sm">GPS Active</StatusBadge>
        </div>
        <p className="text-lg font-bold text-gray-900">{selectedRegion}, Borno State</p>
        <p className="text-sm text-gray-600">Field operations active</p>
      </div>

      {/* Emergency Actions */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-gray-800">Quick Assessment</h2>
        <div className="grid gap-3">
          {quickActions.map((action, index) => (
            <QuickAssessmentCard key={index} {...action} />
          ))}
        </div>
      </div>

      {/* Emergency Report Button */}
      <EmergencyButton fullWidth>
        <AlertTriangle className="w-5 h-5 mr-2" />
        Report Critical Emergency
      </EmergencyButton>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Today's Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">8</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">3</p>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">95%</p>
              <p className="text-sm text-gray-600">Sync Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <MobileButton variant="outline" className="h-16">
          <div className="text-center">
            <Building className="w-6 h-6 mx-auto mb-1" />
            <span className="text-sm">Locations</span>
          </div>
        </MobileButton>
        <MobileButton variant="outline" className="h-16">
          <div className="text-center">
            <Users className="w-6 h-6 mx-auto mb-1" />
            <span className="text-sm">My Team</span>
          </div>
        </MobileButton>
      </div>
    </div>
  )
}
```

---

## 📱 **STEP 4: Add Tailwind Mobile Utilities**

### **A. Update Tailwind Config for Mobile**
**File**: `tailwind.config.js` (add to existing config)

```js
module.exports = {
  // ... existing config
  theme: {
    extend: {
      // ... existing extensions
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'screen-safe': ['100vh', '100dvh'],
      },
      padding: {
        'safe': 'env(safe-area-inset-bottom)',
      }
    },
  },
  // ... rest of config
}
```

### **B. Add Mobile-Specific CSS**
**File**: `src/styles/mobile.css` (create new file)

```css
/* Mobile-specific enhancements */

/* Touch targets */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* Safe area handling */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}

.pt-safe {
  padding-top: env(safe-area-inset-top);
}

/* Mobile scroll improvements */
.mobile-scroll {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

/* Improved tap highlights */
.tap-highlight-none {
  -webkit-tap-highlight-color: transparent;
}

/* Mobile-optimized focus states */
@media (hover: none) {
  .hover\:scale-105:hover {
    transform: none;
  }
  
  .active\:scale-95:active {
    transform: scale(0.95);
  }
}

/* Smooth transitions for mobile */
.mobile-transition {
  transition: transform 0.1s ease-out, background-color 0.15s ease-out;
}

/* Emergency pulse animation */
@keyframes emergency-pulse {
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  50% { 
    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
  }
}

.emergency-pulse {
  animation: emergency-pulse 2s infinite;
}
```

---

## ✅ **TESTING CHECKLIST**

1. **Mobile Navigation**:
   - ✅ Sidebar slides in/out smoothly on mobile
   - ✅ Backdrop closes sidebar when tapped
   - ✅ Touch targets are minimum 44px
   - ✅ Role switching works in mobile sidebar

2. **Touch Interactions**:
   - ✅ All buttons provide immediate visual feedback
   - ✅ Cards have appropriate active states
   - ✅ Scroll behavior is smooth and natural
   - ✅ No accidental activations

3. **Responsive Behavior**:
   - ✅ Layout switches correctly at 1024px breakpoint
   - ✅ Mobile header shows appropriate information
   - ✅ Desktop sidebar behavior unaffected
   - ✅ Content areas properly sized

4. **Field Worker UX**:
   - ✅ Emergency actions prominently displayed
   - ✅ Priority items clearly marked
   - ✅ Quick access to common tasks
   - ✅ Status information easily visible

---

## 🎯 **MOBILE-FIRST ACHIEVEMENTS**

- **Touch-Optimized Navigation**: Large touch targets, smooth animations
- **Priority-Based Interface**: Emergency actions prominently featured
- **Context-Aware Layout**: Role-based navigation with collapsible sections
- **Field-Ready Design**: Status indicators, offline awareness, quick actions
- **Performance Optimized**: Smooth transitions even on mid-range devices

**Next**: Proceed to `11-responsive-design.md` for complete responsive design implementation across all breakpoints.