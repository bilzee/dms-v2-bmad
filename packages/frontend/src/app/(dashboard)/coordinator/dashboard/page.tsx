'use client';

import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertTriangle, Eye, Plus, Settings, Zap, Clock, TrendingUp, RefreshCw, Package, Users, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { AssessmentVerificationQueue } from '@/components/features/verification/AssessmentVerificationQueue'
import { ResponseVerificationQueue } from '@/components/features/verification/ResponseVerificationQueue'
import { QuickViewModal } from '@/components/features/verification/QuickViewModal'
import { ResourceCoordinationPanel } from '@/components/features/coordinator/ResourceCoordinationPanel'
import { TeamAssignmentPanel } from '@/components/features/coordinator/TeamAssignmentPanel'
import { CommunicationFeedPanel } from '@/components/features/coordinator/CommunicationFeedPanel'
import { useQueueManagement } from '@/hooks/useQueueManagement'
import { useVerificationActions } from '@/hooks/useVerificationActions'
import { useDashboardBadges } from '@/hooks/useDashboardBadges'

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

// Queue metrics interface for bottleneck detection
interface QueueMetrics {
  totalPending: number;
  averageProcessingTime: number;
  queueVelocity: number;
  bottleneckThreshold: number;
  isBottleneck: boolean;
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
}


// Bottleneck Alerts Component
interface BottleneckAlertsProps {
  assessmentMetrics: QueueMetrics;
  responseMetrics: QueueMetrics;
}

function BottleneckAlerts({ assessmentMetrics, responseMetrics }: BottleneckAlertsProps) {
  const alerts = [];
  
  if (assessmentMetrics.isBottleneck) {
    alerts.push({
      type: 'assessment' as const,
      severity: 'high' as const,
      message: `Assessment queue processing is ${assessmentMetrics.averageProcessingTime}s above threshold`,
      trend: assessmentMetrics.trendDirection
    });
  }
  
  if (responseMetrics.isBottleneck) {
    alerts.push({
      type: 'response' as const,
      severity: 'high' as const,
      message: `Response queue processing is ${responseMetrics.averageProcessingTime}s above threshold`,
      trend: responseMetrics.trendDirection
    });
  }

  if (alerts.length === 0) {
    return (
      <Card className="border-green-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            <CardTitle className="text-lg">Queue Performance</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">All queues operating within normal parameters</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <CardTitle className="text-lg">Bottleneck Alerts</CardTitle>
          <Badge variant="destructive">{alerts.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">{alert.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <TrendingUp className={`h-3 w-3 ${
                    alert.trend === 'UP' ? 'text-red-500' : 
                    alert.trend === 'DOWN' ? 'text-green-500' : 'text-yellow-500'
                  }`} />
                  <span className="text-xs text-muted-foreground">
                    Trend: {alert.trend}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Note: metadata removed because this is a client component
// If metadata is needed, convert to server component or use dynamic head management

export default function CoordinatorDashboard() {
  const { badges, loading: badgesLoading, error: badgesError } = useDashboardBadges();
  
  // Use custom hooks for queue management and verification actions
  const {
    assessmentQueue,
    responseQueue,
    assessmentMetrics,
    responseMetrics,
    combinedMetrics,
    refreshQueues,
    previewItem,
    previewType,
    openPreview,
    closePreview,
    isLoading,
    error
  } = useQueueManagement();

  const {
    verifyItem,
    rejectItem,
    isVerifying,
    isRejecting
  } = useVerificationActions(() => {
    // Refresh queues after verification actions
    refreshQueues();
  });

  // Create metrics from badges data
  const metrics = badges ? {
    pendingAssessments: badges.assessmentQueue || 0,
    pendingResponses: badges.responseQueue || 0,
    recentApprovals: badges.assessmentReviews || 0,
    flaggedItems: badges.conflictResolution || 0,
    activeIncidents: badges.activeIncidents || 0,
    highPriorityIncidents: Math.floor((badges.activeIncidents || 0) / 2),
    totalIncidents: badges.incidentManagement || 0
  } : null;

  // Handle preview actions
  const handlePreviewAssessment = (assessmentId: string) => {
    const assessmentItem = assessmentQueue.find(item => item.assessment.id === assessmentId);
    if (assessmentItem) {
      openPreview(assessmentItem.assessment, 'assessment');
    }
  };

  const handlePreviewResponse = (responseId: string) => {
    const responseItem = responseQueue.find(item => item.response.id === responseId);
    if (responseItem) {
      openPreview(responseItem.response, 'response');
    }
  };

  // Handle verification actions from modal
  const handleVerifyFromModal = async (id: string) => {
    if (previewType) {
      await verifyItem(id, previewType);
      closePreview();
    }
  };

  const handleRejectFromModal = async (id: string) => {
    if (previewType) {
      await rejectItem(id, previewType);
      closePreview();
    }
  };

  // Only wait for badges to load, let queues load independently
  const loading = badgesLoading;
  const allError = badgesError || error;
  
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-lg font-medium">Loading Dashboard...</div>
            <div className="text-sm text-muted-foreground mt-2">Fetching coordination data</div>
          </div>
        </div>
      </div>
    );
  }
  if (allError) return <div>Error: {allError}</div>;
  if (!metrics) return <div>No data available</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coordination Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time assessment and response queue management with direct verification
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            Live Updates
          </div>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Assessments</CardTitle>
            <Badge variant="secondary">{assessmentMetrics.totalPending}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assessmentMetrics.totalPending}</div>
            <p className="text-xs text-muted-foreground">
              Avg processing: {assessmentMetrics.averageProcessingTime}s
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Responses</CardTitle>
            <Badge variant="secondary">{responseMetrics.totalPending}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responseMetrics.totalPending}</div>
            <p className="text-xs text-muted-foreground">
              Avg processing: {responseMetrics.averageProcessingTime}s
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Velocity</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{combinedMetrics.totalVelocity}</div>
            <p className="text-xs text-muted-foreground">
              Items per hour
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
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottleneck Alerts */}
      <BottleneckAlerts 
        assessmentMetrics={assessmentMetrics} 
        responseMetrics={responseMetrics} 
      />

      {/* Coordinator Management Tabs */}
      <Tabs defaultValue="combined" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-2xl grid-cols-6">
            <TabsTrigger value="combined">Queue View</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="responses">Responses</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="communications">Messages</TabsTrigger>
          </TabsList>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Link href="/coordinator/incidents">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Manage Incidents
              </Button>
            </Link>
            <Link href="/coordinator/auto-approval">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Auto-Approval
              </Button>
            </Link>
            <Link href="/coordinator/conflicts">
              <Button variant="outline" size="sm">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Conflicts ({badges?.conflictResolution || 0})
              </Button>
            </Link>
          </div>
        </div>

        <TabsContent value="combined" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Assessment Queue</h2>
                <Badge variant="outline">{assessmentMetrics.totalPending} pending</Badge>
              </div>
              <AssessmentVerificationQueue 
                className="h-[600px] overflow-hidden"
                onPreviewAssessment={handlePreviewAssessment}
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Response Queue</h2>
                <Badge variant="outline">{responseMetrics.totalPending} pending</Badge>
              </div>
              <ResponseVerificationQueue 
                className="h-[600px] overflow-hidden"
                onPreviewResponse={handlePreviewResponse}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="assessments">
          <AssessmentVerificationQueue 
            onPreviewAssessment={handlePreviewAssessment}
          />
        </TabsContent>

        <TabsContent value="responses">
          <ResponseVerificationQueue 
            onPreviewResponse={handlePreviewResponse}
          />
        </TabsContent>

        <TabsContent value="resources">
          <ResourceCoordinationPanel />
        </TabsContent>

        <TabsContent value="teams">
          <TeamAssignmentPanel />
        </TabsContent>

        <TabsContent value="communications">
          <CommunicationFeedPanel />
        </TabsContent>
      </Tabs>

      {/* Quick View Modal */}
      <QuickViewModal
        isOpen={previewItem !== null}
        onClose={closePreview}
        item={previewItem}
        type={previewType || 'assessment'}
        onVerify={handleVerifyFromModal}
        onReject={handleRejectFromModal}
      />
    </div>
  )
}