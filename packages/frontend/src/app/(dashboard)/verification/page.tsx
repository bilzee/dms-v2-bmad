'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Users,
  ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useVerificationStore } from '@/stores/verification.store';
import { NotificationCounter } from '@/components/features/verification/VerificationStatusIndicators';

export default function VerificationDashboard() {
  const router = useRouter();
  const { queueStats, fetchQueue } = useVerificationStore();

  // Load queue stats on mount
  React.useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleNavigateToQueue = () => {
    router.push('/verification/queue');
  };

  const stats = [
    {
      title: 'Pending Verification',
      value: queueStats.totalPending,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      description: 'Assessments awaiting review',
      action: 'Review Now',
      onClick: handleNavigateToQueue,
    },
    {
      title: 'Requires Attention',
      value: queueStats.requiresAttention,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      description: 'Urgent or flagged assessments',
      action: 'View Details',
      onClick: handleNavigateToQueue,
    },
    {
      title: 'High Priority',
      value: queueStats.highPriority,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      description: 'Priority assessments',
      action: 'Review Priority',
      onClick: handleNavigateToQueue,
    },
    {
      title: 'Assessment Types',
      value: Object.keys(queueStats.byAssessmentType).length,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Active assessment categories',
      action: 'View Breakdown',
      onClick: handleNavigateToQueue,
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assessment Verification</h1>
          <p className="text-gray-600 mt-2">
            Review and validate field assessments from your coordination dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationCounter 
            count={queueStats.requiresAttention} 
            type="attention" 
          />
          <Button onClick={handleNavigateToQueue} size="lg">
            <ClipboardCheck className="h-5 w-5 mr-2" />
            Open Verification Queue
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <Card key={stat.title} className={`${stat.borderColor} border-2 hover:shadow-lg transition-shadow cursor-pointer`} onClick={stat.onClick}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <IconComponent className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <p className="text-xs text-gray-500 mb-3">{stat.description}</p>
                <Button variant="outline" size="sm" className="w-full">
                  {stat.action}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Assessment Type Breakdown */}
      {Object.keys(queueStats.byAssessmentType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assessment Types in Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {Object.entries(queueStats.byAssessmentType).map(([type, count]) => (
                <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {type.replace('_', ' ').toLowerCase()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Quick Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Access the verification queue to review and approve pending assessments efficiently.
            </p>
            <Button onClick={handleNavigateToQueue} className="w-full">
              Start Verifying Assessments
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              {queueStats.requiresAttention > 0 
                ? `${queueStats.requiresAttention} assessments need immediate attention due to feedback or validation issues.`
                : 'All assessments are currently up to date with no urgent attention required.'
              }
            </p>
            <Button 
              variant={queueStats.requiresAttention > 0 ? "destructive" : "outline"}
              onClick={handleNavigateToQueue} 
              className="w-full"
              disabled={queueStats.requiresAttention === 0}
            >
              {queueStats.requiresAttention > 0 ? 'Review Flagged Items' : 'No Action Needed'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Help Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">Verification Workflow Guide</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Review assessment details and media attachments</li>
                <li>• Verify data quality and completeness</li>
                <li>• Approve valid assessments or provide feedback for improvements</li>
                <li>• Use batch operations for efficient processing of multiple assessments</li>
              </ul>
              <Button variant="outline" size="sm" className="mt-3 border-blue-300 text-blue-700 hover:bg-blue-100">
                View Full Documentation
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}