'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Menu, Wifi, WifiOff, Bell, User } from 'lucide-react'
import { useOffline } from '@/hooks/useOffline'
import { useOfflineStore } from '@/stores/offline.store'
import { RoleIndicator } from './RoleIndicator'
import { useSession } from 'next-auth/react'

interface HeaderProps {
  onSidebarToggle: () => void
  sidebarOpen: boolean
}

export function Header({ onSidebarToggle, sidebarOpen }: HeaderProps) {
  const { isOffline } = useOffline();
  const queue = useOfflineStore(state => state.queue);
  const { data: session } = useSession();

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
            <div data-testid="connection-status" className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Online</span>
            </div>
          ) : (
            <div data-testid="connection-status" className="hidden sm:flex items-center gap-2 px-3 py-1 bg-orange-50 rounded-full border border-orange-200">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <WifiOff className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">Offline</span>
            </div>
          )}

          {/* Queue Status - FIXED */}
          <Badge data-testid="queue-status" variant="outline" className="hidden sm:flex">
            {queue.length} queued
          </Badge>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
          </Button>

          {/* Role Indicator */}
          <RoleIndicator />

          {/* User Profile */}
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <User className="w-5 h-5" />
            <span className="hidden sm:block text-sm">{session?.user?.name || 'User'}</span>
          </Button>
        </div>
      </div>
    </header>
  )
}