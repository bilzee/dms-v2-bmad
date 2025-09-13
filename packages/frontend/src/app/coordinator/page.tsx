'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, BarChart3, Users, AlertTriangle, Eye, Settings, HandHeart } from "lucide-react"
import Link from 'next/link'
import { useSession } from 'next-auth/react'

export default function CoordinatorDashboard() {
  const { data: session } = useSession()

  const coordinatorFeatures = [
    {
      title: 'Verification Dashboard',
      description: 'Review and approve assessments and responses',
      icon: <ClipboardList className="w-6 h-6" />,
      href: '/coordinator/dashboard',
      badge: 13
    },
    {
      title: 'Incident Management',
      description: 'Manage active incidents and emergency situations',
      icon: <AlertTriangle className="w-6 h-6" />,
      href: '/coordinator/incidents',
      badge: 4
    },
    {
      title: 'Donor Coordination',
      description: 'Coordinate with donors and manage resources',
      icon: <HandHeart className="w-6 h-6" />,
      href: '/coordinator/donors',
      badge: 7
    },
    {
      title: 'System Monitoring',
      description: 'Monitor system performance and queue status',
      icon: <BarChart3 className="w-6 h-6" />,
      href: '/coordinator/monitoring',
      badge: 0
    },
    {
      title: 'Auto-Approval Config',
      description: 'Configure automatic approval rules',
      icon: <Settings className="w-6 h-6" />,
      href: '/coordinator/auto-approval',
      badge: 0
    },
    {
      title: 'Conflict Resolution',
      description: 'Resolve data conflicts and synchronization issues',
      icon: <Eye className="w-6 h-6" />,
      href: '/coordinator/conflicts',
      badge: 3
    }
  ]

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
            <div className="text-2xl font-bold">13</div>
            <p className="text-xs text-orange-600 mt-1">8 assessments, 5 responses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">4</div>
            <p className="text-xs text-red-600 mt-1">2 high priority</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Donor Coordination</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-gray-500 mt-1">Active donors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Conflicts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">3</div>
            <p className="text-xs text-orange-600 mt-1">Need resolution</p>
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