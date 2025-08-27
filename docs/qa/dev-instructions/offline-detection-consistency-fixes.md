# Dev Instructions: Fix Offline Detection UI Inconsistencies

## Issue Summary

**INCONSISTENT OFFLINE/ONLINE INDICATORS**: The DMS application has a properly functional offline detection system (`useOffline` hook, `useOfflineStore`, etc.), but several UI components still use **hardcoded/mock status values** instead of the functional system.

**Root Cause**: Mixed implementation where some components use the functional offline detection system while others display static/hardcoded values.

**Impact**: Users see conflicting status information, with some areas showing "Online" while others correctly show "Offline Mode" when disconnected.

---

## Understanding the Current System

### ✅ **Functional Components (Already Working)**
These components properly use the offline detection system:
- `OfflineModeAlert.tsx` - Shows offline banner when disconnected
- `ConnectionStatusHeader.tsx` - Reactive online/offline status with queue count
- `AssessmentForm.tsx` - Uses `useOfflineStore()` for proper offline behavior
- `PreliminaryAssessmentForm.tsx` - Uses `useOfflineStore()` for proper offline behavior  
- `EntityManagementForm.tsx` - Uses `useOfflineStore()` for proper offline behavior
- Most assessment-related components

### ❌ **Components Using Mock/Hardcoded Values (Need Fixing)**
These components display static values instead of using the functional system:

1. **Header Component** (`packages/frontend/src/components/layouts/Header.tsx`)
2. **Homepage System Status** (`packages/frontend/src/app/page.tsx`)  
3. **Response Plan Page** (`packages/frontend/src/app/(dashboard)/responses/plan/page.tsx`)

---

## Required Fixes

### **Fix 1: Header Component - CRITICAL**

**File**: `packages/frontend/src/components/layouts/Header.tsx`

**Current Issue (Lines 36-44)**:
```typescript
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
```

**Solution**: Replace hardcoded status with functional offline detection:

```typescript
'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Menu, Wifi, WifiOff, Bell, User } from 'lucide-react'
import { useOffline } from '@/hooks/useOffline'
import { useOfflineStore } from '@/stores/offline.store'

interface HeaderProps {
  onSidebarToggle: () => void
  sidebarOpen: boolean
}

export function Header({ onSidebarToggle, sidebarOpen }: HeaderProps) {
  const { isOffline } = useOffline();
  const queue = useOfflineStore(state => state.queue);

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
          {/* Connection Status - FIXED */}
          {!isOffline ? (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Online</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-orange-50 rounded-full border border-orange-200">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <WifiOff className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">Offline</span>
            </div>
          )}

          {/* Queue Status - FIXED */}
          <Badge variant="outline" className="hidden sm:flex">
            {queue.length} queued
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

---

### **Fix 2: Homepage System Status - HIGH PRIORITY**

**File**: `packages/frontend/src/app/page.tsx`

**Current Issue (Lines 228-237)**:
```typescript
<div className="flex items-center gap-2">
  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
  <span className="text-green-700 font-medium">Online</span>
  <Badge variant="secondary" className="ml-auto bg-green-100 text-green-800">
    Connected
  </Badge>
</div>
<p className="text-muted-foreground text-sm">
  All features available including real-time sync
</p>
```

**Solution**: Add offline detection imports and replace static content:

**Add imports at the top of the file**:
```typescript
import { useOffline } from '@/hooks/useOffline'
import { useOfflineStore } from '@/stores/offline.store'
```

**Add hook usage inside the component**:
```typescript
export default function Home() {
  const { isOffline } = useOffline();
  const queue = useOfflineStore(state => state.queue);

  // ... existing code ...
```

**Replace the hardcoded System Status section**:
```typescript
{/* System Status Card - FIXED */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Activity className="w-5 h-5" />
      System Status
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full animate-pulse ${
          isOffline ? 'bg-orange-500' : 'bg-green-500'
        }`}></div>
        <span className={`font-medium ${
          isOffline ? 'text-orange-700' : 'text-green-700'
        }`}>
          {isOffline ? 'Offline' : 'Online'}
        </span>
        <Badge 
          variant="secondary" 
          className={`ml-auto ${
            isOffline 
              ? 'bg-orange-100 text-orange-800' 
              : 'bg-green-100 text-green-800'
          }`}
        >
          {isOffline ? 'Disconnected' : 'Connected'}
        </Badge>
      </div>
      <p className="text-muted-foreground text-sm">
        {isOffline 
          ? `Work saved locally. ${queue.length} items will sync when connected.`
          : 'All features available including real-time sync'
        }
      </p>
    </div>
  </CardContent>
</Card>
```

---

### **Fix 3: Response Plan Page - MEDIUM PRIORITY**

**File**: `packages/frontend/src/app/(dashboard)/responses/plan/page.tsx`

**Current Issue (Lines 178-203)**: Custom offline detection implementation instead of using the centralized system.

**Problem**: Duplicates offline detection logic instead of using the existing `useOffline` hook and `useOfflineStore`.

**Solution**: Replace the custom `OfflineStatusBanner` component:

**Remove the custom implementation (Lines 178-210)** and replace with:

```typescript
import { useOffline } from '@/hooks/useOffline';
import { useOfflineStore } from '@/stores/offline.store';

// Replace OfflineStatusBanner function with this:
function OfflineStatusBanner() {
  const { isOffline } = useOffline();
  const queue = useOfflineStore(state => state.queue);

  if (!isOffline) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>Online - Changes will be synced in real-time</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
      <span>Offline - Changes saved locally ({queue.length} items will sync when connected)</span>
    </div>
  );
}
```

---

## Additional Improvements (Optional)

### **Enhancement 1: Add Offline Queue Details**

Consider adding a queue status component that shows what's waiting to sync:

**File**: `packages/frontend/src/components/shared/QueueStatusDetail.tsx` (new file)

```typescript
'use client';

import { useOfflineStore } from '@/stores/offline.store';
import { Badge } from '@/components/ui/badge';
import { Clock, Upload } from 'lucide-react';

export function QueueStatusDetail() {
  const queue = useOfflineStore(state => state.queue);
  
  if (queue.length === 0) return null;

  const assessmentCount = queue.filter(item => item.type === 'ASSESSMENT').length;
  const responseCount = queue.filter(item => item.type === 'RESPONSE').length;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Clock className="w-3 h-3" />
      <span>Queue:</span>
      {assessmentCount > 0 && (
        <Badge variant="outline" className="h-4 text-xs">
          {assessmentCount} assessments
        </Badge>
      )}
      {responseCount > 0 && (
        <Badge variant="outline" className="h-4 text-xs">
          {responseCount} responses
        </Badge>
      )}
    </div>
  );
}
```

### **Enhancement 2: Consistent Color Scheme**

Ensure all offline indicators use the same color scheme:
- **Online**: Green (`bg-green-50`, `text-green-700`, `border-green-200`)  
- **Offline**: Orange (`bg-orange-50`, `text-orange-700`, `border-orange-200`)

---

## Testing Instructions

### **Manual Testing**
1. Start development server: `pnpm dev`
2. Open browser developer tools → Application → Service Workers (or Network tab)
3. Navigate to main page and header areas
4. Simulate offline:
   - Chrome: Network tab → Throttling → "Offline" 
   - Firefox: Web Developer → Network → "Offline"
5. Verify all status indicators change consistently

### **Browser Console Testing**
```javascript
// Test offline detection
console.log('Navigator online:', navigator.onLine);

// Simulate offline
Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
window.dispatchEvent(new Event('offline'));

// Check components updated
setTimeout(() => {
  console.log('Page updated correctly');
}, 1000);
```

### **Expected Results After Fixes**
- ✅ Header shows "Offline" and correct queue count when disconnected
- ✅ Homepage system status shows "Offline" and queue information
- ✅ Response plan page uses centralized offline detection
- ✅ No conflicting status indicators anywhere in the app
- ✅ All offline indicators use consistent styling

---

## Implementation Priority

**CRITICAL (Must Fix)**:
1. ✅ Header Component - Most visible, affects all pages
2. ✅ Homepage System Status - Primary user landing page

**HIGH PRIORITY (Should Fix)**:  
3. ✅ Response Plan Page - Remove duplicate offline detection logic

**MEDIUM PRIORITY (Nice to Have)**:
4. ⏳ Add QueueStatusDetail component for better user feedback
5. ⏳ Ensure consistent color scheme across all components

---

## Success Criteria

✅ **All status indicators use the functional offline detection system**  
✅ **No hardcoded "Online" or "0 queued" values remain**  
✅ **Consistent user experience across all pages**  
✅ **Proper queue count display when items are pending sync**  
✅ **No conflicting online/offline status information**  

**Post-Fix Validation**: Test offline simulation across all pages to ensure consistent behavior.