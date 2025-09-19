'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ClipboardList, BarChart3, Users, AlertTriangle, Eye, Settings, HandHeart } from "lucide-react"
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useDashboardBadges } from '@/hooks/useDashboardBadges'
import { useEffect, useState } from 'react'

export default function CoordinatorDashboard() {
  const { data: session } = useSession()
  const { badges, loading: badgesLoading, error: badgesError } = useDashboardBadges()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const coordinatorFeatures = [
    {
      title: 'Verification Dashboard',
      description: 'Review and approve assessments and responses',
      icon: <ClipboardList className="w-6 h-6" />,
      href: '/coordinator/dashboard',
      badge: mounted ? (badges?.pendingReview || 0) : 0
    },
    {
      title: 'Incident Management',
      description: 'Manage active incidents and emergency situations',
      icon: <AlertTriangle className="w-6 h-6" />,
      href: '/coordinator/incidents',
      badge: mounted ? (badges?.activeIncidents || 0) : 0
    },
    {
      title: 'Donor Coordination',
      description: 'Coordinate with donors and manage resources',
      icon: <HandHeart className="w-6 h-6" />,
      href: '/coordinator/donors',
      badge: mounted ? (badges?.donorDashboard || 0) : 0
    },
    {
      title: 'System Monitoring',
      description: 'Monitor system performance and queue status',
      icon: <BarChart3 className="w-6 h-6" />,
      href: '/coordinator/monitoring',
      badge: mounted ? (badges?.activeAlerts || 0) : 0
    },
    {
      title: 'Auto-Approval Config',
      description: 'Configure automatic approval rules',
      icon: <Settings className="w-6 h-6" />,
      href: '/coordinator/auto-approval',
      badge: mounted ? (badges?.configurations || 0) : 0
    },
    {
      title: 'Conflict Resolution',
      description: 'Resolve data conflicts and synchronization issues',
      icon: <Eye className="w-6 h-6" />,
      href: '/coordinator/conflicts',
      badge: mounted ? (badges?.conflictResolution || 0) : 0
    }
  ]

  // Show error state if badges failed to load
  if (badgesError) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-red-600">Failed to load dashboard data: {badgesError}</p>
          <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Coordinator Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Coordinate disaster response and manage verification workflows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            Coordinator
          </Badge>
          {session && (
            <span className="text-sm text-gray-600">
              Welcome, {session.user.name}
            </span>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {!mounted || badgesLoading ? (
              <Skeleton className="h-8 w-16 mb-2" />
            ) : (
              <div className="text-2xl font-bold">{badges?.pendingReview || 0}</div>
            )}
            <p className="text-xs text-orange-600 mt-1">
              {mounted ? (badges?.assessmentQueue || 0) : 0} assessments, {mounted ? (badges?.responseQueue || 0) : 0} responses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            {!mounted || badgesLoading ? (
              <Skeleton className="h-8 w-16 mb-2" />
            ) : (
              <div className="text-2xl font-bold text-red-600">{badges?.activeIncidents || 0}</div>
            )}
            <p className="text-xs text-red-600 mt-1">High priority incidents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            {!mounted || badgesLoading ? (
              <Skeleton className="h-8 w-16 mb-2" />
            ) : (
              <div className="text-2xl font-bold">{badges?.activeUsers || 0}</div>
            )}
            <p className="text-xs text-gray-500 mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Locations</CardTitle>
          </CardHeader>
          <CardContent>
            {!mounted || badgesLoading ? (
              <Skeleton className="h-8 w-16 mb-2" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">{badges?.totalLocations || 0}</div>
            )}
            <p className="text-xs text-blue-600 mt-1">Covered areas</p>
          </CardContent>
        </Card>
      </div>

      {/* Coordinator Features */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Coordination Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coordinatorFeatures.map((feature) => (
            <Card key={feature.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    {feature.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </div>
                {feature.badge > 0 && (
                  <Badge variant="destructive">{feature.badge}</Badge>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <Link href={feature.href}>
                  <Button className="w-full">
                    Access {feature.title}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-green-50 rounded border-l-4 border-green-400">
              <span className="text-sm">Assessment HEALTH-2024-001 approved</span>
              <Badge variant="outline" className="text-green-700">Approved</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-red-50 rounded border-l-4 border-red-400">
              <span className="text-sm">Incident INC-2024-003 escalated to high priority</span>
              <Badge variant="outline" className="text-red-700">Incident</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded border-l-4 border-blue-400">
              <span className="text-sm">Donor coordination meeting scheduled</span>
              <Badge variant="outline" className="text-blue-700">Donor</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}