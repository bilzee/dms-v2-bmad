import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Eye, Plus } from 'lucide-react'
import Link from 'next/link'

// Dashboard metrics interface
interface DashboardMetrics {
  pendingAssessments: number
  pendingResponses: number
  recentApprovals: number
  flaggedItems: number
  activeIncidents: number
  highPriorityIncidents: number
  totalIncidents: number
}

// Mock data - replace with actual API call
async function getDashboardMetrics(): Promise<DashboardMetrics> {
  // Simulate API call
  return {
    pendingAssessments: 8,
    pendingResponses: 5,
    recentApprovals: 12,
    flaggedItems: 3,
    activeIncidents: 4,
    highPriorityIncidents: 2,
    totalIncidents: 15
  }
}

export const metadata = {
  title: 'Coordinator Dashboard | DMS',
  description: 'Assessment and response verification dashboard'
}

export default async function CoordinatorDashboard() {
  const metrics = await getDashboardMetrics()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verification Dashboard</h1>
        <p className="text-muted-foreground">
          Review and approve assessments and responses from field operations
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Assessments</CardTitle>
            <Badge variant="secondary">{metrics.pendingAssessments}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingAssessments}</div>
            <p className="text-xs text-muted-foreground">
              Require verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Responses</CardTitle>
            <Badge variant="secondary">{metrics.pendingResponses}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingResponses}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Approvals</CardTitle>
            <Badge variant="default">{metrics.recentApprovals}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.recentApprovals}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged Items</CardTitle>
            <Badge variant="destructive">{metrics.flaggedItems}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.flaggedItems}</div>
            <p className="text-xs text-muted-foreground">
              High priority
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Assessment Queue</CardTitle>
            <p className="text-sm text-muted-foreground">
              Review and approve field assessments
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Emergency assessments</span>
              <Badge variant="destructive">2</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Standard assessments</span>
              <Badge variant="secondary">6</Badge>
            </div>
            <Link href="/coordinator/assessments/review">
              <Button className="w-full">Review Assessments</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Queue</CardTitle>
            <p className="text-sm text-muted-foreground">
              Approve response plans and deliveries
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Planned responses</span>
              <Badge variant="outline">3</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Completed deliveries</span>
              <Badge variant="secondary">2</Badge>
            </div>
            <Link href="/coordinator/responses/review">
              <Button className="w-full">Review Responses</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <CardTitle>Incident Management</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Create and track multi-phase incident responses
                </p>
                <p className="text-xs text-blue-600 font-medium">
                  {metrics.activeIncidents} active incidents
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium text-red-600">{metrics.activeIncidents}</span>
                <span className="text-muted-foreground"> Active</span>
              </div>
              <div>
                <span className="font-medium text-orange-600">{metrics.highPriorityIncidents}</span>
                <span className="text-muted-foreground"> High Priority</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/coordinator/incidents" className="flex-1">
                <Button size="sm" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  Manage Incidents
                </Button>
              </Link>
              <Link href="/coordinator/incidents?action=create" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  New Incident
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}