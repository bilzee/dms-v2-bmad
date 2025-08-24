# Phase 3A: Micro-Animations & Interactive Enhancements

## 🎯 **OBJECTIVE**
Add subtle, professional micro-animations and interactive feedback that enhances user experience without being distracting - perfect for humanitarian field workers who need clear, immediate visual feedback.

---

## ✨ **STEP 1: Enhanced Button Animations**

### **A. Create Animated Button Component**
**File**: `src/components/ui/animated-button.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface AnimatedButtonProps extends ButtonProps {
  loadingText?: string
  successText?: string
  successIcon?: React.ReactNode
  animationType?: 'pulse' | 'bounce' | 'slide' | 'glow'
}

export function AnimatedButton({
  children,
  loadingText = 'Processing...',
  successText,
  successIcon,
  animationType = 'pulse',
  className,
  onClick,
  disabled,
  ...props
}: AnimatedButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      setIsLoading(true)
      try {
        await onClick(e)
        if (successText) {
          setIsSuccess(true)
          setTimeout(() => setIsSuccess(false), 2000)
        }
      } catch (error) {
        console.error('Button action failed:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const getAnimationClasses = () => {
    switch (animationType) {
      case 'pulse':
        return 'hover:animate-pulse active:animate-ping'
      case 'bounce':
        return 'hover:animate-bounce'
      case 'slide':
        return 'transform hover:translate-x-1 transition-transform duration-200'
      case 'glow':
        return 'hover:shadow-lg hover:shadow-blue-500/25 transition-shadow duration-300'
      default:
        return ''
    }
  }

  return (
    <Button
      {...props}
      className={cn(
        'relative overflow-hidden group transition-all duration-300',
        getAnimationClasses(),
        isSuccess && 'bg-green-600 hover:bg-green-700',
        className
      )}
      onClick={handleClick}
      disabled={disabled || isLoading}
    >
      {/* Background Ripple Effect */}
      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-md" />
      
      {/* Content */}
      <div className="relative flex items-center gap-2">
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {isSuccess && successIcon && <span className="animate-bounce">{successIcon}</span>}
        {isLoading ? loadingText : isSuccess && successText ? successText : children}
      </div>
      
      {/* Success Checkmark Animation */}
      {isSuccess && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full bg-green-500 opacity-20 animate-ping rounded-md" />
        </div>
      )}
    </Button>
  )
}
```

### **B. Create Status Badge with Pulse Animation**
**File**: `src/components/ui/status-badge.tsx`

```tsx
'use client'

import { Badge, BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusBadgeProps extends BadgeProps {
  status: 'online' | 'offline' | 'syncing' | 'error' | 'success'
  pulse?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function StatusBadge({ 
  status, 
  pulse = false, 
  size = 'md', 
  className, 
  children, 
  ...props 
}: StatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'offline':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'syncing':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-0.5'
      case 'lg':
        return 'text-sm px-3 py-1'
      default:
        return 'text-xs px-2.5 py-1'
    }
  }

  const getPulseAnimation = () => {
    if (!pulse) return ''
    
    switch (status) {
      case 'online':
        return 'animate-pulse bg-green-50'
      case 'syncing':
        return 'animate-pulse bg-blue-50'
      case 'error':
        return 'animate-pulse bg-red-50'
      default:
        return 'animate-pulse'
    }
  }

  return (
    <Badge
      {...props}
      className={cn(
        'relative border transition-all duration-300 hover:scale-105',
        getStatusStyles(),
        getSizeStyles(),
        getPulseAnimation(),
        className
      )}
    >
      {/* Status Indicator Dot */}
      <div className={cn(
        'w-2 h-2 rounded-full mr-2 flex-shrink-0',
        status === 'online' && 'bg-green-500',
        status === 'offline' && 'bg-orange-500',
        status === 'syncing' && 'bg-blue-500 animate-pulse',
        status === 'error' && 'bg-red-500',
        status === 'success' && 'bg-green-500',
        pulse && 'animate-ping'
      )} />
      {children}
    </Badge>
  )
}
```

---

## ✨ **STEP 2: Loading States & Skeletons**

### **A. Create Card Skeleton Loader**
**File**: `src/components/ui/card-skeleton.tsx`

```tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface CardSkeletonProps {
  showHeader?: boolean
  showFooter?: boolean
  lines?: number
  className?: string
}

export function CardSkeleton({ 
  showHeader = true, 
  showFooter = false, 
  lines = 3, 
  className 
}: CardSkeletonProps) {
  return (
    <Card className={cn('animate-pulse', className)}>
      {showHeader && (
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-3 bg-gray-200 rounded',
                i === lines - 1 ? 'w-3/4' : 'w-full'
              )}
            />
          ))}
        </div>
        
        {showFooter && (
          <div className="flex gap-2 mt-4">
            <div className="h-8 bg-gray-200 rounded w-20" />
            <div className="h-8 bg-gray-200 rounded w-24" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### **B. Create Assessment Grid Skeleton**
**File**: `src/components/dashboard/AssessmentGridSkeleton.tsx`

```tsx
import { CardSkeleton } from '@/components/ui/card-skeleton'

export function AssessmentGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-3" />
              <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## ✨ **STEP 3: Enhanced Hover Effects**

### **A. Create Floating Action Button**
**File**: `src/components/ui/floating-action-button.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Plus, X } from 'lucide-react'

interface FloatingActionButtonProps {
  actions: Array<{
    icon: React.ReactNode
    label: string
    onClick: () => void
    color?: string
  }>
  className?: string
}

export function FloatingActionButton({ actions, className }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={cn('fixed bottom-6 right-6 z-50', className)}>
      {/* Action Menu */}
      <div className={cn(
        'absolute bottom-16 right-0 space-y-3 transition-all duration-300 transform',
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}>
        {actions.map((action, index) => (
          <div
            key={index}
            className="flex items-center gap-3 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <span className="bg-gray-800 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap">
              {action.label}
            </span>
            <Button
              size="sm"
              className={cn(
                'w-12 h-12 rounded-full shadow-lg hover:scale-110 transition-transform duration-200',
                action.color || 'bg-blue-600 hover:bg-blue-700'
              )}
              onClick={action.onClick}
            >
              {action.icon}
            </Button>
          </div>
        ))}
      </div>

      {/* Main FAB */}
      <Button
        size="lg"
        className={cn(
          'w-14 h-14 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300',
          'bg-blue-600 hover:bg-blue-700 hover:scale-110',
          isOpen && 'rotate-45'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </Button>
    </div>
  )
}
```

### **B. Enhanced Card Hover Effects CSS**
**File**: `src/styles/animations.css` (create new file)

```css
/* Custom animations for enhanced UX */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes ripple {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
  }
  50% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.8);
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out forwards;
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out forwards;
}

.animate-ripple {
  animation: ripple 0.6s ease-out forwards;
}

.animate-glow {
  animation: glow 2s ease-in-out infinite;
}

/* Enhanced card hover effects */
.card-hover-lift {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-hover-lift:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* Smooth gradient transitions */
.gradient-shift {
  background-size: 200% 200%;
  transition: all 0.3s ease;
}

.gradient-shift:hover {
  background-position: right center;
}

/* Button ripple effect */
.button-ripple {
  position: relative;
  overflow: hidden;
}

.button-ripple::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.3s, height 0.3s;
}

.button-ripple:active::after {
  width: 300px;
  height: 300px;
}

/* Status indicator pulse */
.status-pulse {
  position: relative;
}

.status-pulse::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: inherit;
  opacity: 0;
  animation: pulse-ring 2s ease-out infinite;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(1.2);
    opacity: 0;
  }
}
```

---

## ✨ **STEP 4: Progress Indicators & Feedback**

### **A. Create Enhanced Progress Component**
**File**: `src/components/ui/enhanced-progress.tsx`

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface EnhancedProgressProps {
  value: number
  max?: number
  status?: 'loading' | 'success' | 'error' | 'warning'
  showLabel?: boolean
  animated?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function EnhancedProgress({
  value,
  max = 100,
  status = 'loading',
  showLabel = true,
  animated = true,
  size = 'md',
  className
}: EnhancedProgressProps) {
  const [animatedValue, setAnimatedValue] = useState(0)
  const percentage = Math.round((value / max) * 100)

  // Animate progress value
  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimatedValue(value)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setAnimatedValue(value)
    }
  }, [value, animated])

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'warning':
        return 'bg-yellow-500'
      default:
        return 'bg-blue-500'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      default:
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-2'
      case 'lg':
        return 'h-4'
      default:
        return 'h-3'
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">
              {status === 'success' ? 'Completed' : 
               status === 'error' ? 'Failed' :
               status === 'warning' ? 'Warning' : 'Processing'}
            </span>
          </div>
          <span className="text-muted-foreground">{percentage}%</span>
        </div>
      )}
      
      <div className={cn('relative overflow-hidden rounded-full bg-gray-200', getSizeClasses())}>
        <div
          className={cn(
            'h-full transition-all duration-700 ease-out rounded-full',
            getStatusColor(),
            animated && 'animate-pulse'
          )}
          style={{ 
            width: `${(animatedValue / max) * 100}%`,
            transition: animated ? 'width 0.7s ease-out' : 'none'
          }}
        />
        
        {/* Shimmer effect for loading state */}
        {status === 'loading' && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 -skew-x-12 animate-shimmer" />
        )}
      </div>
    </div>
  )
}
```

### **B. Create Toast Notification System**
**File**: `src/components/ui/enhanced-toast.tsx`

```tsx
'use client'

import { useEffect } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface EnhancedToastProps {
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  description?: string
  duration?: number
  onClose: () => void
  action?: {
    label: string
    onClick: () => void
  }
}

export function EnhancedToast({
  type,
  title,
  description,
  duration = 5000,
  onClose,
  action
}: EnhancedToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-900'
      case 'error':
        return 'border-red-200 bg-red-50 text-red-900'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-900'
      default:
        return 'border-blue-200 bg-blue-50 text-blue-900'
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      default:
        return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  return (
    <div className={cn(
      'relative flex items-start gap-3 p-4 border rounded-lg shadow-lg animate-slide-up',
      getTypeStyles()
    )}>
      {getIcon()}
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium">{title}</h4>
        {description && (
          <p className="mt-1 text-sm opacity-90">{description}</p>
        )}
        {action && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-7 px-2"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-white/20"
        onClick={onClose}
      >
        <X className="w-4 h-4" />
      </Button>
      
      {/* Progress bar for auto-dismiss */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-lg">
          <div 
            className="h-full bg-current opacity-50 rounded-b-lg animate-progress"
            style={{ 
              animation: `progress-shrink ${duration}ms linear forwards`
            }}
          />
        </div>
      )}
    </div>
  )
}

/* Add to animations.css */
/*
@keyframes progress-shrink {
  from { width: 100%; }
  to { width: 0%; }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.animate-shimmer {
  animation: shimmer 1.5s infinite;
}

.animate-progress {
  animation-fill-mode: forwards;
}
*/
```

---

## 🔧 **STEP 5: Update Global Styles**

### **Import Animation Styles**
**File**: `src/app/globals.css` (add to existing imports)

```css
@import '../styles/animations.css';

/* ... existing styles ... */

/* Add enhanced interaction styles */
.interactive-scale {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.interactive-scale:hover {
  transform: scale(1.05);
}

.interactive-scale:active {
  transform: scale(0.95);
}

/* Improved focus states */
.focus-enhanced:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4);
}

/* Smooth color transitions */
.color-transition {
  transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
}
```

---

## ✅ **TESTING CHECKLIST**

1. **Animation Performance**:
   - ✅ All animations run at 60fps
   - ✅ No janky movements or laggy interactions
   - ✅ Animations are subtle and professional
   - ✅ Reduced motion respected for accessibility

2. **Interactive Feedback**:
   - ✅ Button hover states provide clear feedback
   - ✅ Loading states are visually clear
   - ✅ Success/error states are immediately obvious
   - ✅ Progress indicators work smoothly

3. **Mobile Optimization**:
   - ✅ Touch interactions feel responsive
   - ✅ Hover effects adapt appropriately for touch
   - ✅ Animations don't drain battery excessively

4. **Accessibility**:
   - ✅ Animations can be disabled via prefers-reduced-motion
   - ✅ Focus states remain clearly visible
   - ✅ Screen readers aren't disrupted by animations

---

## 🎯 **ANIMATION PHILOSOPHY**

- **Subtle & Professional**: Animations enhance, never distract
- **Purposeful**: Every animation provides user feedback or guides attention
- **Performant**: GPU-accelerated transforms, optimized for mobile devices
- **Humanitarian Context**: Appropriate for serious, field-critical applications

**Next**: Proceed to `08-assessment-grid.md` for enhanced assessment type selection interactions.