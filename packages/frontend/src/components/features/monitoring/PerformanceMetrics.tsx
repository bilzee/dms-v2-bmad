'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, BarChart3, Clock, Database, Globe, Zap } from 'lucide-react';

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

interface SystemHealth {
  overall: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  components: {
    cpu: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    memory: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    database: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    api: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  };
}

interface PerformanceMetricsProps {
  refreshInterval?: number; // in milliseconds
  showDetailedView?: boolean;
}

export function PerformanceMetrics({
  refreshInterval = 25000,
  showDetailedView = false
}: PerformanceMetricsProps) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/v1/system/performance/metrics?includeHistory=true');
      const data = await response.json();
      
      if (data.success) {
        const metricsData = {
          ...data.data.metrics,
          timestamp: new Date(data.data.metrics.timestamp),
        };
        setMetrics(metricsData);
        setSystemHealth(data.data.systemHealth);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getHealthBadgeVariant = (health: string) => {
    switch (health) {
      case 'HEALTHY': return 'default';
      case 'WARNING': return 'secondary';
      case 'CRITICAL': return 'destructive';
      default: return 'outline';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'HEALTHY': return 'text-green-600';
      case 'WARNING': return 'text-yellow-600';
      case 'CRITICAL': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatUptime = (timestamp: Date) => {
    const uptime = Date.now() - timestamp.getTime();
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
          <CardDescription>Loading system performance data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
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

  if (!metrics || !systemHealth) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
          <CardDescription>Unable to load performance data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to fetch system metrics. Please try refreshing the page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle>System Health Overview</CardTitle>
            </div>
            <Badge variant={getHealthBadgeVariant(systemHealth.overall)}>
              {systemHealth.overall}
            </Badge>
          </div>
          <CardDescription>
            Real-time system performance and component health
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-sm font-medium ${getHealthColor(systemHealth.components.cpu)}`}>
                CPU
              </div>
              <div className="text-2xl font-bold">{metrics.cpuUsage.toFixed(1)}%</div>
              <Progress value={metrics.cpuUsage} className="mt-2" />
            </div>
            <div className="text-center">
              <div className={`text-sm font-medium ${getHealthColor(systemHealth.components.memory)}`}>
                Memory
              </div>
              <div className="text-2xl font-bold">{metrics.memoryUsage.toFixed(1)}%</div>
              <Progress value={metrics.memoryUsage} className="mt-2" />
            </div>
            <div className="text-center">
              <div className={`text-sm font-medium ${getHealthColor(systemHealth.components.database)}`}>
                Database
              </div>
              <div className="text-2xl font-bold">{metrics.databaseLatency.toFixed(0)}ms</div>
              <Progress value={Math.min((metrics.databaseLatency / 100) * 100, 100)} className="mt-2" />
            </div>
            <div className="text-center">
              <div className={`text-sm font-medium ${getHealthColor(systemHealth.components.api)}`}>
                API
              </div>
              <div className="text-2xl font-bold">{metrics.apiResponseTime.toFixed(0)}ms</div>
              <Progress value={Math.min((metrics.apiResponseTime / 500) * 100, 100)} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {showDetailedView && (
        <>
          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Resource Utilization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">CPU Usage</span>
                    <span className="text-sm text-muted-foreground">{metrics.cpuUsage.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.cpuUsage} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Threshold: 70% warning, 85% critical
                  </p>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Memory Usage</span>
                    <span className="text-sm text-muted-foreground">{metrics.memoryUsage.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.memoryUsage} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Threshold: 75% warning, 90% critical
                  </p>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Error Rate</span>
                    <span className="text-sm text-muted-foreground">{metrics.errorRate.toFixed(2)}%</span>
                  </div>
                  <Progress value={Math.min(metrics.errorRate * 10, 100)} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Threshold: 2% warning, 5% critical
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">API Response Time</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{metrics.apiResponseTime.toFixed(0)}ms</div>
                    <div className="text-xs text-muted-foreground">avg response</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Database Latency</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{metrics.databaseLatency.toFixed(0)}ms</div>
                    <div className="text-xs text-muted-foreground">query time</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Queue Processing</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{metrics.queueProcessingRate.toFixed(0)}/min</div>
                    <div className="text-xs text-muted-foreground">processing rate</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Active Connections</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{metrics.activeConnections}</div>
                    <div className="text-xs text-muted-foreground">concurrent</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Last Updated:</span>
                  <div className="font-medium">{lastUpdated.toLocaleTimeString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">System Uptime:</span>
                  <div className="font-medium">{formatUptime(metrics.timestamp)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Auto Refresh:</span>
                  <div className="font-medium">Every {refreshInterval / 1000}s</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}