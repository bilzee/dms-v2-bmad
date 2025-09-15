'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserCheck, Eye, CheckCircle, XCircle, Clock, AlertTriangle, Archive } from 'lucide-react'
import Link from 'next/link'
import { useDashboardBadges } from '@/hooks/useDashboardBadges'
import { useVerificationQueue } from '@/hooks/useVerificationQueue'

// Dashboard metrics interface for verifier
interface VerifierMetrics {
  pendingVerifications: number
  assessmentsToReview: number
  responsesToReview: number
  approvedToday: number
  rejectedToday: number
  flaggedItems: number
}

export default function VerifierDashboard() {
  const { badges, loading: badgesLoading, error: badgesError } = useDashboardBadges();
  const { counts, loading: queueLoading, error: queueError } = useVerificationQueue();
  
  const loading = badgesLoading || queueLoading;
  const error = badgesError || queueError;
  
  // Combine data from both hooks to create comprehensive metrics
  const metrics = badges && counts ? {
    pendingVerifications: counts.totalPending || 0,
    assessmentsToReview: counts.assessmentQueue || 0,
    responsesToReview: counts.responseQueue || 0,
    approvedToday: badges.approvedToday || 0,
    rejectedToday: badges.rejectedToday || 0,
    flaggedItems: badges.flaggedItems || 0
  } : null;
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!metrics) return <div>No data available</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verifier Dashboard</h1>
          <p className="text-muted-foreground">
            Review and verify assessments and responses for quality assurance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/verification/queue">
            <Button>
              <UserCheck className="h-4 w-4 mr-2" />
              Verification Queue
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Badge variant="secondary">{metrics.pendingVerifications}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingVerifications}</div>
            <p className="text-xs text-muted-foreground">Total items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assessments</CardTitle>
            <UserCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.assessmentsToReview}</div>
            <p className="text-xs text-muted-foreground">To review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responses</CardTitle>
            <Archive className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.responsesToReview}</div>
            <p className="text-xs text-muted-foreground">To review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.approvedToday}</div>
            <p className="text-xs text-muted-foreground">Verified items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected Today</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.rejectedToday}</div>
            <p className="text-xs text-muted-foreground">Sent back</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.flaggedItems}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/verification/queue">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
                Verification Queue
              </CardTitle>
              <CardDescription>
                Review pending assessments and responses
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/verification/responses/queue">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-orange-600" />
                Response Queue
              </CardTitle>
              <CardDescription>
                Verify response deliveries and documentation
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/verification/responses">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-green-600" />
                Review History
              </CardTitle>
              <CardDescription>
                View previously reviewed and verified items
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/verification/batch">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-purple-600" />
                Batch Operations
              </CardTitle>
              <CardDescription>
                Process multiple verifications efficiently
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/verification/analytics">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600" />
                Verification Analytics
              </CardTitle>
              <CardDescription>
                Track verification performance and trends
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/help/verification-guide">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-gray-600" />
                Verification Guide
              </CardTitle>
              <CardDescription>
                Learn verification standards and procedures
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  )
}