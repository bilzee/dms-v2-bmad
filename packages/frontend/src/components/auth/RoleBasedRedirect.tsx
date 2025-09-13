'use client';

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'

export function RoleBasedRedirect() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Only redirect if user is authenticated and on root path
    if (status === 'authenticated' && session?.user && pathname === '/') {
      const userRole = session.user.role || session.user.activeRole?.name
      
      // Define role-based dashboard routes
      const roleRoutes: { [key: string]: string } = {
        'ADMIN': '/admin',
        'COORDINATOR': '/coordinator/dashboard', 
        'ASSESSOR': '/assessor',
        'RESPONDER': '/responder',
        'VERIFIER': '/verifier',
        'DONOR': '/donor'
      }
      
      const dashboardPath = roleRoutes[userRole] || '/assessor'
      router.push(dashboardPath)
    }
  }, [session, status, router, pathname])

  return null // This component doesn't render anything
}