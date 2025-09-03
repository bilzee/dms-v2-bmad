'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle, Clock, Users, Activity, BarChart3 } from 'lucide-react';

interface SystemMetrics {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  apiResponseTime: number;
  databaseLatency: number;
  queueProcessingRate: number;
  activeConnections: number;
  errorRate: number;
}

interface UserActivity {
  userId: string;
  userName: string;
  role: 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN';
  sessionStart: Date;
  lastActivity: Date;
  actionsCount: number;
  currentPage: string;
  isActive: boolean;
}

interface SyncStatistics {
  totalSyncRequests: number;
  successfulSyncs: number;
  failedSyncs: number;
  conflictCount: number;
  averageProcessingTime: number;
  queueSize: number;
  priorityBreakdown: {
    high: number;
    normal: number;
    low: number;
  };
}

interface ActiveAlert {
  id: string;
  type: 'PERFORMANCE' | 'ERROR_RATE' | 'QUEUE_BACKLOG' | 'SYNC_FAILURE' | 'USER_ACTIVITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  threshold: number;
  currentValue: number;
  isActive: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export default function SystemPerformanceMonitoring() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [syncStats, setSyncStats] = useState<SyncStatistics | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchSystemMetrics = async () => {
    try {
      const response = await fetch('/api/v1/system/performance/metrics?includeHistory=true');
      const data = await response.json();
      if (data.success) {
        setMetrics({
          ...data.data.metrics,
          timestamp: new Date(data.data.metrics.timestamp),
        });
      }
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
    }
  };

  const fetchUserActivity = async () => {
    try {
      const response = await fetch('/api/v1/system/performance/users?includeInactive=false');
      const data = await response.json();
      if (data.success) {
        setUserActivity(data.data.users.map((user: any) => ({
          ...user,
          sessionStart: new Date(user.sessionStart),
          lastActivity: new Date(user.lastActivity),
        })));
      }
    } catch (error) {
      console.error('Failed to fetch user activity:', error);
    }
  };

  const fetchSyncStats = async () => {
    try {
      const response = await fetch('/api/v1/system/performance/sync-stats?includeQueue=true');
      const data = await response.json();
      if (data.success) {
        setSyncStats(data.data.syncStatistics);
      }
    } catch (error) {
      console.error('Failed to fetch sync statistics:', error);
    }
  };

  const fetchActiveAlerts = async () => {
    try {
      const response = await fetch('/api/v1/system/alerts/active?acknowledged=false');
      const data = await response.json();
      if (data.success) {
        setActiveAlerts(data.data.alerts.map((alert: any) => ({
          ...alert,
          createdAt: new Date(alert.createdAt),
          updatedAt: new Date(alert.updatedAt),
          acknowledgedAt: alert.acknowledgedAt ? new Date(alert.acknowledgedAt) : undefined,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch active alerts:', error);
    }
  };

  const refreshAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchSystemMetrics(),
      fetchUserActivity(),
      fetchSyncStats(),
      fetchActiveAlerts()
    ]);
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    refreshAllData();
    
    // Set up automatic refresh every 25 seconds (established pattern from previous stories)
    const interval = setInterval(refreshAllData, 25000);
    
    return () => clearInterval(interval);
  }, []);

  const getSystemHealthStatus = () => {
    if (!metrics) return 'UNKNOWN';
    
    const criticalIssues = activeAlerts.filter(a => a.severity === 'CRITICAL').length;
    const highIssues = activeAlerts.filter(a => a.severity === 'HIGH').length;
    
    if (criticalIssues > 0 || metrics.cpuUsage > 90 || metrics.memoryUsage > 95 || metrics.errorRate > 10) {
      return 'CRITICAL';
    } else if (highIssues > 0 || metrics.cpuUsage > 80 || metrics.memoryUsage > 85 || metrics.errorRate > 5) {
      return 'WARNING';
    } else if (metrics.cpuUsage > 70 || metrics.memoryUsage > 75 || metrics.errorRate > 2) {
      return 'DEGRADED';
    }
    return 'HEALTHY';
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'default';
      case 'DEGRADED': return 'secondary';
      case 'WARNING': return 'destructive';
      case 'CRITICAL': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'DEGRADED': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'WARNING': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'CRITICAL': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const systemHealth = getSystemHealthStatus();

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Performance Monitoring</h2>
          <p className="text-muted-foreground">
            Monitor system operations, user activity, and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={getStatusBadgeVariant(systemHealth)} className="flex items-center gap-1">
            {getStatusIcon(systemHealth)}
            System {systemHealth}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAllData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.cpuUsage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Threshold: 70% warning, 85% critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.memoryUsage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Threshold: 75% warning, 90% critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userActivity.filter(u => u.isActive).length}</div>
            <p className="text-xs text-muted-foreground">
              {userActivity.length} total sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.errorRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              Threshold: 2% warning, 5% critical
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Performance Metrics */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>
              Real-time system performance data
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">API Response Time</p>
                  <p className="text-2xl font-bold">{metrics?.apiResponseTime.toFixed(0)}ms</p>
                  <p className="text-xs text-muted-foreground">Average response time</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Database Latency</p>
                  <p className="text-2xl font-bold">{metrics?.databaseLatency.toFixed(0)}ms</p>
                  <p className="text-xs text-muted-foreground">Query execution time</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Queue Processing</p>
                  <p className="text-2xl font-bold">{metrics?.queueProcessingRate.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Items per minute</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Active Connections</p>
                  <p className="text-2xl font-bold">{metrics?.activeConnections}</p>
                  <p className="text-xs text-muted-foreground">Current connections</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
            <CardDescription>
              Current system alerts requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6">
                <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">No active alerts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="flex items-start space-x-3 p-3 border rounded">
                    <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                      alert.severity === 'CRITICAL' ? 'text-red-500' :
                      alert.severity === 'HIGH' ? 'text-orange-500' :
                      alert.severity === 'MEDIUM' ? 'text-yellow-500' : 'text-blue-500'
                    }`} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.description}</p>
                      <Badge variant="outline" className="text-xs">
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* User Activity */}
        <Card>
          <CardHeader>
            <CardTitle>User Activity</CardTitle>
            <CardDescription>
              Current active users and their sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userActivity.filter(u => u.isActive).slice(0, 5).map((user) => (
                <div key={user.userId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {user.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.userName}</p>
                      <p className="text-xs text-muted-foreground">{user.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{user.actionsCount} actions</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.floor((new Date().getTime() - new Date(user.lastActivity).getTime()) / (1000 * 60))}m ago
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sync Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Sync Performance</CardTitle>
            <CardDescription>
              Synchronization operations and queue status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {syncStats && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Success Rate</p>
                    <p className="text-2xl font-bold">
                      {((syncStats.successfulSyncs / syncStats.totalSyncRequests) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {syncStats.successfulSyncs} of {syncStats.totalSyncRequests}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Queue Size</p>
                    <p className="text-2xl font-bold">{syncStats.queueSize}</p>
                    <p className="text-xs text-muted-foreground">Pending items</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Priority Breakdown</p>
                  <div className="flex space-x-4 mt-2">
                    <div className="text-center">
                      <p className="text-lg font-semibold">{syncStats.priorityBreakdown.high}</p>
                      <p className="text-xs text-muted-foreground">High</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{syncStats.priorityBreakdown.normal}</p>
                      <p className="text-xs text-muted-foreground">Normal</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{syncStats.priorityBreakdown.low}</p>
                      <p className="text-xs text-muted-foreground">Low</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-center text-xs text-muted-foreground">
        Last updated: {lastUpdated.toLocaleTimeString()} • Auto-refresh every 25 seconds
      </div>
    </div>
  );
}