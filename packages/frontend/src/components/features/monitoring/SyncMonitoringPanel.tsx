'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { RefreshCw, RotateCcw, AlertTriangle, CheckCircle, Clock, TrendingUp, List } from 'lucide-react';

interface RotateCcwStatistics {
  totalRotateCcwRequests: number;
  successfulRotateCcws: number;
  failedRotateCcws: number;
  conflictCount: number;
  averageProcessingTime: number;
  queueSize: number;
  priorityBreakdown: {
    high: number;
    normal: number;
    low: number;
  };
  errorCategorization: {
    networkErrors: number;
    validationErrors: number;
    conflictErrors: number;
    serverErrors: number;
  };
}

interface QueueMetrics {
  syncQueue: QueueInfo;
  verificationQueue: QueueInfo;
  mediaQueue: QueueInfo;
  totalJobs: number;
  totalFailures: number;
  overallHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
}

interface QueueInfo {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  completedRate: number;
  failureRate: number;
  avgProcessingTime: number;
}

interface RotateCcwMonitoringPanelProps {
  refreshInterval?: number;
  showDetailedMetrics?: boolean;
}

export function RotateCcwMonitoringPanel({
  refreshInterval = 25000,
  showDetailedMetrics = false
}: RotateCcwMonitoringPanelProps) {
  const [syncStats, setRotateCcwStats] = useState<RotateCcwStatistics | null>(null);
  const [queueMetrics, setQueueMetrics] = useState<QueueMetrics | null>(null);
  const [healthIndicators, setHealthIndicators] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchRotateCcwStats = async () => {
    try {
      const response = await fetch('/api/v1/system/performance/sync-stats?includeQueue=true&includeHistory=false');
      const data = await response.json();
      
      if (data.success) {
        setRotateCcwStats(data.data.syncStatistics);
        setQueueMetrics(data.data.queueMetrics);
        setHealthIndicators(data.data.healthIndicators);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch sync statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRotateCcwStats();
    
    const interval = setInterval(fetchRotateCcwStats, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getHealthBadgeVariant = (health: string) => {
    switch (health) {
      case 'HEALTHY': return 'default';
      case 'DEGRADED': return 'secondary';
      case 'CRITICAL': return 'destructive';
      default: return 'outline';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'HEALTHY': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'DEGRADED': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'CRITICAL': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatProcessingTime = (milliseconds: number) => {
    if (milliseconds < 1000) return `${milliseconds.toFixed(0)}ms`;
    return `${(milliseconds / 1000).toFixed(1)}s`;
  };

  const calculateSuccessRate = () => {
    if (!syncStats || syncStats.totalRotateCcwRequests === 0) return 0;
    return (syncStats.successfulRotateCcws / syncStats.totalRotateCcwRequests) * 100;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            RotateCcw Monitoring
          </CardTitle>
          <CardDescription>Loading sync performance data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-2 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!syncStats || !queueMetrics || !healthIndicators) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            RotateCcw Monitoring
          </CardTitle>
          <CardDescription>Unable to load sync performance data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to fetch sync statistics. Please try refreshing.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* RotateCcw Health Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              <CardTitle>RotateCcw Performance Overview</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getHealthBadgeVariant(healthIndicators.overall)} className="flex items-center gap-1">
                {getHealthIcon(healthIndicators.overall)}
                {healthIndicators.overall}
              </Badge>
              <Button variant="outline" size="sm" onClick={fetchRotateCcwStats} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          <CardDescription>
            Real-time synchronization operations and queue management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{calculateSuccessRate().toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
              <Progress value={calculateSuccessRate()} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{syncStats.queueSize}</div>
              <div className="text-sm text-muted-foreground">Queue Size</div>
              <div className="text-xs text-muted-foreground mt-1">pending items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatProcessingTime(syncStats.averageProcessingTime)}</div>
              <div className="text-sm text-muted-foreground">Avg Processing</div>
              <div className="text-xs text-muted-foreground mt-1">per operation</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{syncStats.conflictCount}</div>
              <div className="text-sm text-muted-foreground">Conflicts</div>
              <div className="text-xs text-muted-foreground mt-1">requiring resolution</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* RotateCcw Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              RotateCcw Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Total Requests</p>
                <p className="text-2xl font-bold">{syncStats.totalRotateCcwRequests}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Successful</p>
                <p className="text-2xl font-bold text-green-600">{syncStats.successfulRotateCcws}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Failed</p>
                <p className="text-2xl font-bold text-red-600">{syncStats.failedRotateCcws}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Conflicts</p>
                <p className="text-2xl font-bold text-yellow-600">{syncStats.conflictCount}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Priority Breakdown</p>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs">High Priority</span>
                <span className="text-xs font-medium">{syncStats.priorityBreakdown.high}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs">Normal Priority</span>
                <span className="text-xs font-medium">{syncStats.priorityBreakdown.normal}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Low Priority</span>
                <span className="text-xs font-medium">{syncStats.priorityBreakdown.low}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queue Monitoring */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Queue Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {/* RotateCcw Queue */}
              <div className="border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">RotateCcw Queue</span>
                  <Badge variant={queueMetrics.syncQueue.completedRate > 95 ? 'default' : 'secondary'}>
                    {queueMetrics.syncQueue.completedRate.toFixed(1)}%
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-medium">{queueMetrics.syncQueue.waiting}</div>
                    <div className="text-muted-foreground">Waiting</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{queueMetrics.syncQueue.active}</div>
                    <div className="text-muted-foreground">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{queueMetrics.syncQueue.completed}</div>
                    <div className="text-muted-foreground">Completed</div>
                  </div>
                </div>
              </div>

              {/* Verification Queue */}
              <div className="border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Verification Queue</span>
                  <Badge variant={queueMetrics.verificationQueue.completedRate > 90 ? 'default' : 'secondary'}>
                    {queueMetrics.verificationQueue.completedRate.toFixed(1)}%
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-medium">{queueMetrics.verificationQueue.waiting}</div>
                    <div className="text-muted-foreground">Waiting</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{queueMetrics.verificationQueue.active}</div>
                    <div className="text-muted-foreground">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{queueMetrics.verificationQueue.completed}</div>
                    <div className="text-muted-foreground">Completed</div>
                  </div>
                </div>
              </div>

              {/* Media Queue */}
              <div className="border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Media Queue</span>
                  <Badge variant={queueMetrics.mediaQueue.completedRate > 85 ? 'default' : 'secondary'}>
                    {queueMetrics.mediaQueue.completedRate.toFixed(1)}%
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-medium">{queueMetrics.mediaQueue.waiting}</div>
                    <div className="text-muted-foreground">Waiting</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{queueMetrics.mediaQueue.active}</div>
                    <div className="text-muted-foreground">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{queueMetrics.mediaQueue.completed}</div>
                    <div className="text-muted-foreground">Completed</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showDetailedMetrics && (
        <>
          {/* Error Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Error Analysis
              </CardTitle>
              <CardDescription>
                Breakdown of sync failures by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-red-500">{syncStats.errorCategorization.networkErrors}</div>
                  <div className="text-sm text-muted-foreground">Network Errors</div>
                  <div className="text-xs text-muted-foreground">Connection issues</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-500">{syncStats.errorCategorization.validationErrors}</div>
                  <div className="text-sm text-muted-foreground">Validation Errors</div>
                  <div className="text-xs text-muted-foreground">Data format issues</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-500">{syncStats.errorCategorization.conflictErrors}</div>
                  <div className="text-sm text-muted-foreground">Conflict Errors</div>
                  <div className="text-xs text-muted-foreground">Data conflicts</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-500">{syncStats.errorCategorization.serverErrors}</div>
                  <div className="text-sm text-muted-foreground">Server Errors</div>
                  <div className="text-xs text-muted-foreground">Backend issues</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Health Indicators */}
          <Card>
            <CardHeader>
              <CardTitle>Health Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="text-sm font-medium">RotateCcw Engine</p>
                    <p className="text-xs text-muted-foreground">Core sync operations</p>
                  </div>
                  <Badge variant={getHealthBadgeVariant(healthIndicators.syncEngine)}>
                    {healthIndicators.syncEngine}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="text-sm font-medium">Queue Processor</p>
                    <p className="text-xs text-muted-foreground">Queue processing</p>
                  </div>
                  <Badge variant={getHealthBadgeVariant(healthIndicators.queueProcessor)}>
                    {healthIndicators.queueProcessor}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="text-sm font-medium">Conflict Resolution</p>
                    <p className="text-xs text-muted-foreground">Automatic resolution</p>
                  </div>
                  <Badge variant={getHealthBadgeVariant(healthIndicators.conflictResolution)}>
                    {healthIndicators.conflictResolution}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="text-sm font-medium">Overall Health</p>
                    <p className="text-xs text-muted-foreground">System health</p>
                  </div>
                  <Badge variant={getHealthBadgeVariant(healthIndicators.overall)}>
                    {healthIndicators.overall}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="text-xs text-muted-foreground text-center">
        Last updated: {lastUpdated.toLocaleTimeString()} • Auto-refresh every {refreshInterval / 1000} seconds
      </div>
    </div>
  );
}