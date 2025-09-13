'use client';

import { useSession, signIn } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'

export function RoleSwitcher() {
  const { data: session, update } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  
  // Only show if user has multiple roles
  if (!session?.user?.allRoles || session.user.allRoles.length <= 1) {
    return null
  }

  const switchRole = async (newRole: string) => {
    if (newRole === session.user.role) {
      return // Already on this role
    }

    setIsLoading(true)
    try {
      // Create new session with updated role
      const updatedUser = {
        ...session.user,
        role: newRole,
        activeRole: {
          id: `${newRole.toLowerCase()}-role`,
          name: newRole,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }

      // Update the session
      await update({
        ...session,
        user: updatedUser
      })
      
      // Stay on current page - let the UI update to show new role features
      // Force a page refresh to ensure all components update with new role
      window.location.reload()
    } catch (error) {
      console.error('Failed to switch role:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="text-xs">
        Multi-Role User
      </Badge>
      <Select
        value={session.user.role}
        onValueChange={switchRole}
        disabled={isLoading}
      >
        <SelectTrigger className="w-auto min-w-[120px] h-8 text-sm">
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          {session.user.allRoles.map((role: string) => (
            <SelectItem key={role} value={role}>
              <div className="flex items-center gap-2">
                <span>{role}</span>
                {role === session.user.role && (
                  <Badge variant="secondary" className="text-xs">
                    Active
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isLoading && (
        <RefreshCw className="h-4 w-4 animate-spin" />
      )}
    </div>
  )
}