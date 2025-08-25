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
  Package,
  ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useVerificationStore } from '@/stores/verification.store';
import { NotificationCounter } from '@/components/features/verification/VerificationStatusIndicators';

export default function ResponseVerificationDashboard() {
  const router = useRouter();
  const { responseQueueStats, fetchResponseQueue } = useVerificationStore();

  // Load queue stats on mount
  React.useEffect(() => {
    fetchResponseQueue();
  }, [fetchResponseQueue]);

  const handleNavigateToQueue = () => {
    router.push('/verification/responses/queue');
  };

  const stats = [
    {
      title: 'Pending Verification',
      value: responseQueueStats.totalPending,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      description: 'Responses awaiting review',
      action: 'Review Now',
      onClick: handleNavigateToQueue,
    },
    {
      title: 'Requires Attention',
      value: responseQueueStats.requiresAttention,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      description: 'Urgent or flagged responses',
      action: 'View Details',
      onClick: handleNavigateToQueue,
    },
    {
      title: 'High Priority',
      value: responseQueueStats.highPriority,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      description: 'Priority responses',
      action: 'Review Priority',
      onClick: handleNavigateToQueue,
    },
    {
      title: 'Response Types',
      value: Object.keys(responseQueueStats.byResponseType).length,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Active response categories',
      action: 'View Breakdown',
      onClick: handleNavigateToQueue,
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Response Verification</h1>
          <p className="text-gray-600 mt-2">
            Review and validate field responses from your coordination dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationCounter 
            count={responseQueueStats.requiresAttention} 
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

      {/* Response Type Breakdown */}
      {Object.keys(responseQueueStats.byResponseType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Response Types in Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {Object.entries(responseQueueStats.byResponseType).map(([type, count]) => (
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
              Access the verification queue to review and approve pending responses efficiently.
            </p>
            <Button onClick={handleNavigateToQueue} className="w-full">
              Start Verifying Responses
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
              {responseQueueStats.requiresAttention > 0 
                ? `${responseQueueStats.requiresAttention} responses need immediate attention due to feedback or validation issues.`
                : 'All responses are currently up to date with no urgent attention required.'
              }
            </p>
            <Button 
              variant={responseQueueStats.requiresAttention > 0 ? "destructive" : "outline"}
              onClick={handleNavigateToQueue} 
              className="w-full"
              disabled={responseQueueStats.requiresAttention === 0}
            >
              {responseQueueStats.requiresAttention > 0 ? 'Review Flagged Items' : 'No Action Needed'}
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
              <h3 className="font-semibold text-blue-900 mb-2">Response Verification Workflow Guide</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Review response details and delivery documentation</li>
                <li>• Verify delivery completion and quality</li>
                <li>• Approve valid responses or provide feedback for improvements</li>
                <li>• Use batch operations for efficient processing of multiple responses</li>
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