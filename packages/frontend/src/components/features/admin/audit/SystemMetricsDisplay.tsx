// components/features/admin/audit/SystemMetricsDisplay.tsx

'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity,
  Database,
  Globe,
  Queue,
  Sync,
  Cpu,
  HardDrive,
  Memory,
  Wifi,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { SystemPerformanceMetrics, SystemPerformanceResponse } from '@dms/shared/types/admin';

interface SystemMetricsDisplayProps {
  metrics: SystemPerformanceMetrics;
  historicalData?: SystemPerformanceMetrics[];
  alerts?: SystemPerformanceResponse['data']['alerts'];
  showDetailedView?: boolean;
  className?: string;
}

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  alert?: boolean;
}

function MetricCard({ title, icon, children, alert }: MetricCardProps) {
  return (
    <Card className={alert ? 'border-red-200 bg-red-50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface ProgressMetricProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  thresholds?: { warning: number; critical: number };
}

function ProgressMetric({ label, value, max = 100, unit = '%', thresholds }: ProgressMetricProps) {
  const percentage = (value / max) * 100;
  
  let color = 'bg-green-500';
  if (thresholds) {
    if (value >= thresholds.critical) color = 'bg-red-500';
    else if (value >= thresholds.warning) color = 'bg-yellow-500';
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">
          {value.toFixed(1)}{unit}
        </span>
      </div>
      <Progress value={percentage} className="h-2" indicatorClassName={color} />
    </div>
  );
}

interface TrendIndicatorProps {
  current: number;
  previous?: number;
  formatter?: (value: number) => string;
}

function TrendIndicator({ current, previous, formatter = (v) => v.toFixed(1) }: TrendIndicatorProps) {
  if (!previous) {
    return <span className="text-muted-foreground">-</span>;
  }

  const change = current - previous;
  const isPositive = change > 0;
  const percentage = Math.abs((change / previous) * 100);

  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="font-medium">{formatter(current)}</span>
      {change !== 0 && (
        <span className={`flex items-center gap-1 ${isPositive ? 'text-red-500' : 'text-green-500'}`}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {percentage.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

export function SystemMetricsDisplay({
  metrics,
  historicalData = [],
  alerts = [],
  showDetailedView = false,
  className
}: SystemMetricsDisplayProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Get previous metrics for trends
  const previousMetrics = historicalData.length > 0 ? historicalData[0] : undefined;

  // Categorize alerts by severity
  const criticalAlerts = alerts?.filter(alert => alert.severity === 'CRITICAL') || [];
  const warningAlerts = alerts?.filter(alert => alert.severity === 'WARNING') || [];

  // Helper function to get alert for a specific metric type
  const getMetricAlert = (type: string) => {
    return alerts?.find(alert => alert.type === type);
  };

  if (!showDetailedView) {
    // Simple overview mode
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {/* Database Metrics */}
        <MetricCard 
          title="Database" 
          icon={<Database className="h-4 w-4 text-blue-500" />}
          alert={!!getMetricAlert('DATABASE_ERROR')}
        >
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Connections:</span>
              <span className="font-medium">{metrics.database.connectionCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Avg Query Time:</span>
              <span className="font-medium">{metrics.database.avgQueryTime.toFixed(0)}ms</span>
            </div>
          </div>
        </MetricCard>

        {/* API Metrics */}
        <MetricCard 
          title="API Performance" 
          icon={<Globe className="h-4 w-4 text-green-500" />}
          alert={!!getMetricAlert('HIGH_ERROR_RATE') || !!getMetricAlert('SLOW_RESPONSE')}
        >
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Requests/min:</span>
              <span className="font-medium">{metrics.api.requestsPerMinute.toFixed(1)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Error Rate:</span>
              <span className={`font-medium ${metrics.api.errorRate > 5 ? 'text-red-500' : ''}`}>
                {metrics.api.errorRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </MetricCard>

        {/* Queue Metrics */}
        <MetricCard 
          title="Queue Status" 
          icon={<Queue className="h-4 w-4 text-purple-500" />}
          alert={!!getMetricAlert('HIGH_QUEUE_SIZE')}
        >
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Active Jobs:</span>
              <span className="font-medium">{metrics.queue.activeJobs}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Waiting:</span>
              <span className="font-medium">{metrics.queue.waitingJobs}</span>
            </div>
          </div>
        </MetricCard>

        {/* System Resources */}
        <MetricCard 
          title="System Resources" 
          icon={<Activity className="h-4 w-4 text-orange-500" />}
          alert={!!getMetricAlert('HIGH_RESOURCE_USAGE')}
        >
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>CPU:</span>
              <span className="font-medium">{metrics.system.cpuUsage.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Memory:</span>
              <span className="font-medium">{metrics.system.memoryUsage.toFixed(1)}%</span>
            </div>
          </div>
        </MetricCard>
      </div>
    );
  }

  // Detailed view mode
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Alerts Section */}
      {alerts && alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant={alert.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
                      {alert.severity}
                    </Badge>
                    <span className="text-sm">{alert.message}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Metrics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Database Health" icon={<Database className="h-4 w-4" />}>
              <ProgressMetric 
                label="Connection Pool" 
                value={metrics.database.connectionCount} 
                max={100}
                unit=""
                thresholds={{ warning: 80, critical: 95 }}
              />
            </MetricCard>
            
            <MetricCard title="API Performance" icon={<Globe className="h-4 w-4" />}>
              <ProgressMetric 
                label="Error Rate" 
                value={metrics.api.errorRate} 
                max={10}
                unit="%"
                thresholds={{ warning: 5, critical: 10 }}
              />
            </MetricCard>
            
            <MetricCard title="Queue Load" icon={<Queue className="h-4 w-4" />}>
              <ProgressMetric 
                label="Waiting Jobs" 
                value={metrics.queue.waitingJobs} 
                max={100}
                unit=""
                thresholds={{ warning: 50, critical: 80 }}
              />
            </MetricCard>
            
            <MetricCard title="System Load" icon={<Cpu className="h-4 w-4" />}>
              <ProgressMetric 
                label="CPU Usage" 
                value={metrics.system.cpuUsage} 
                max={100}
                unit="%"
                thresholds={{ warning: 70, critical: 90 }}
              />
            </MetricCard>
          </div>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Connection Pool</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-2xl font-bold">
                    <TrendIndicator 
                      current={metrics.database.connectionCount} 
                      previous={previousMetrics?.database.connectionCount}
                      formatter={(v) => v.toString()}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">Active Connections</div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Active Queries</span>
                      <span className="text-sm font-medium">{metrics.database.activeQueries}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Query Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-2xl font-bold">
                    <TrendIndicator 
                      current={metrics.database.avgQueryTime} 
                      previous={previousMetrics?.database.avgQueryTime}
                      formatter={(v) => `${v.toFixed(0)}ms`}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">Average Query Time</div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Slow Queries</span>
                      <span className="text-sm font-medium">{metrics.database.slowQueries}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-2xl font-bold text-green-600">
                    {metrics.database.errorRate.toFixed(2)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Database Error Rate</div>
                  <ProgressMetric 
                    label="Error Rate" 
                    value={metrics.database.errorRate} 
                    max={5}
                    unit="%"
                    thresholds={{ warning: 2, critical: 5 }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Request Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-2xl font-bold">
                    <TrendIndicator 
                      current={metrics.api.requestsPerMinute} 
                      previous={previousMetrics?.api.requestsPerMinute}
                      formatter={(v) => v.toFixed(1)}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">Requests per Minute</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-2xl font-bold">
                    <TrendIndicator 
                      current={metrics.api.avgResponseTime} 
                      previous={previousMetrics?.api.avgResponseTime}
                      formatter={(v) => `${v.toFixed(0)}ms`}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">Average Response Time</div>
                  <ProgressMetric 
                    label="Response Time" 
                    value={metrics.api.avgResponseTime} 
                    max={1000}
                    unit="ms"
                    thresholds={{ warning: 500, critical: 1000 }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-2xl font-bold">
                    <TrendIndicator 
                      current={metrics.api.errorRate} 
                      previous={previousMetrics?.api.errorRate}
                      formatter={(v) => `${v.toFixed(1)}%`}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">Error Rate</div>
                  <ProgressMetric 
                    label="Error Rate" 
                    value={metrics.api.errorRate} 
                    max={10}
                    unit="%"
                    thresholds={{ warning: 5, critical: 10 }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Endpoint Statistics */}
          {Object.keys(metrics.api.endpointStats).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Endpoint Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(metrics.api.endpointStats).map(([endpoint, stats]) => (
                    <div key={endpoint} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="font-mono text-sm">{endpoint}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span>{stats.requestCount} requests</span>
                        <span>{stats.avgResponseTime.toFixed(0)}ms avg</span>
                        <span className={stats.errorRate > 5 ? 'text-red-500' : 'text-green-600'}>
                          {stats.errorRate.toFixed(1)}% errors
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Active Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.queue.activeJobs}
                </div>
                <div className="text-sm text-muted-foreground">Currently Processing</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Waiting Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {metrics.queue.waitingJobs}
                </div>
                <div className="text-sm text-muted-foreground">In Queue</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {metrics.queue.completedJobs}
                </div>
                <div className="text-sm text-muted-foreground">Total Completed</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {metrics.queue.failedJobs}
                </div>
                <div className="text-sm text-muted-foreground">Total Failed</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Processing Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.queue.processingRate.toFixed(1)} jobs/min
                </div>
                <div className="text-sm text-muted-foreground">Average Processing Rate</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(metrics.queue.avgJobDuration / 1000).toFixed(1)}s
                </div>
                <div className="text-sm text-muted-foreground">Average Job Duration</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  CPU Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressMetric 
                  label="CPU Usage" 
                  value={metrics.system.cpuUsage} 
                  max={100}
                  unit="%"
                  thresholds={{ warning: 70, critical: 90 }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Memory className="h-4 w-4" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressMetric 
                  label="Memory Usage" 
                  value={metrics.system.memoryUsage} 
                  max={100}
                  unit="%"
                  thresholds={{ warning: 80, critical: 95 }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Disk Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressMetric 
                  label="Disk Usage" 
                  value={metrics.system.diskUsage} 
                  max={100}
                  unit="%"
                  thresholds={{ warning: 85, critical: 95 }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  Network Latency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.system.networkLatency.toFixed(0)}ms
                </div>
                <div className="text-sm text-muted-foreground">Average Network Latency</div>
              </CardContent>
            </Card>
          </div>

          {/* Sync Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sync className="h-4 w-4" />
                Sync Engine Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {metrics.sync.successRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {metrics.sync.conflictRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Conflict Rate</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {metrics.sync.avgSyncTime.toFixed(0)}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Sync Time</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {metrics.sync.pendingItems}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending Items</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Last sync: {new Date(metrics.sync.lastSyncAt).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}