import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// Dashboard metrics interface
interface DashboardMetrics {
  pendingAssessments: number
  pendingResponses: number
  recentApprovals: number
  flaggedItems: number
}

// Mock data - replace with actual API call
async function getDashboardMetrics(): Promise<DashboardMetrics> {
  // Simulate API call
  return {
    pendingAssessments: 8,
    pendingResponses: 5,
    recentApprovals: 12,
    flaggedItems: 3
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
      <div className="grid gap-4 md:grid-cols-2">
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
      </div>
    </div>
  )
}