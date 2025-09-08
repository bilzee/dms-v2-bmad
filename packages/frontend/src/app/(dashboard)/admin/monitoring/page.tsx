// app/(dashboard)/admin/monitoring/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Metadata } from 'next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  Activity, 
  AlertTriangle, 
  TrendingUp,
  Database,
  Globe,
  List,
  Cpu
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { SystemMetricsDisplay } from '@/components/features/admin/audit/SystemMetricsDisplay';
import { 
  SystemPerformanceResponse, 
  SystemPerformanceMetrics,
  SystemAlert
} from '@dms/shared/types/admin';

export default function MonitoringPage() {
  const { toast } = useToast();
  
  // State management
  const [currentMetrics, setCurrentMetrics] = useState<SystemPerformanceMetrics | null>(null);
  const [historicalData, setHistoricalData] = useState<SystemPerformanceMetrics[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [healthStatus, setHealthStatus] = useState<'HEALTHY' | 'WARNING' | 'CRITICAL'>('HEALTHY');
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load monitoring data
  const loadMonitoringData = async (includeHistorical = false) => {
    try {
      setIsLoading(true);

      const searchParams = new URLSearchParams({
        includeAlerts: 'true',
        includeHistorical: includeHistorical.toString(),
        historicalHours: '24'
      });

      const response = await fetch(`/api/v1/admin/monitoring/performance?${searchParams}`);
      const data: SystemPerformanceResponse = await response.json();

      if (data.success) {
        setCurrentMetrics(data.data.currentMetrics);
        setHistoricalData(data.data.historicalData || []);
        setAlerts(data.data.alerts || []);
        setHealthStatus(data.data.healthStatus || 'HEALTHY');
        setLastRefresh(new Date());
      } else {
        throw new Error(data.message || 'Failed to load monitoring data');
      }
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load monitoring data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadMonitoringData(true);
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => loadMonitoringData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  // Manual refresh handler
  const handleRefresh = () => {
    loadMonitoringData(true);
  };

  // Get health status color
  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-green-600';
      case 'WARNING': return 'text-yellow-600';
      case 'CRITICAL': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Get health status badge variant
  const getHealthBadgeVariant = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'default' as const;
      case 'WARNING': return 'secondary' as const;
      case 'CRITICAL': return 'destructive' as const;
      default: return 'outline' as const;
    }
  };

  if (isLoading && !currentMetrics) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading system monitoring data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentMetrics) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Monitoring Data Unavailable</h2>
          <p className="text-muted-foreground mb-4">
            Unable to load system monitoring data. Please try refreshing the page.
          </p>
          <Button onClick={() => loadMonitoringData(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time system performance metrics and health monitoring
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <Badge variant={getHealthBadgeVariant(healthStatus)} className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            System {healthStatus}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {alerts.some(alert => alert.severity === 'CRITICAL') && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Critical System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts
                .filter(alert => alert.severity === 'CRITICAL')
                .map((alert, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded border-l-4 border-red-500">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <div>
                        <div className="font-medium text-red-800">{alert.message}</div>
                        <div className="text-sm text-red-600">
                          Value: {alert.value?.toFixed(2)}, Threshold: {alert.threshold}
                        </div>
                      </div>
                    </div>
                    <Badge variant="destructive">CRITICAL</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Database Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMetrics.database.connectionCount}</div>
            <p className="text-xs text-muted-foreground">Active Connections</p>
            <div className="mt-2 text-xs">
              <div className="flex justify-between">
                <span>Avg Query:</span>
                <span className={
                  currentMetrics.database.avgQueryTime > 100 ? 'text-red-500' : 'text-green-600'
                }>
                  {currentMetrics.database.avgQueryTime.toFixed(0)}ms
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Performance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Performance</CardTitle>
            <Globe className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics.api.requestsPerMinute.toFixed(1)}/min
            </div>
            <p className="text-xs text-muted-foreground">Request Rate</p>
            <div className="mt-2 text-xs">
              <div className="flex justify-between">
                <span>Error Rate:</span>
                <span className={
                  currentMetrics.api.errorRate > 5 ? 'text-red-500' : 'text-green-600'
                }>
                  {currentMetrics.api.errorRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queue Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
            <List className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics.queue.activeJobs + currentMetrics.queue.waitingJobs}
            </div>
            <p className="text-xs text-muted-foreground">Total Jobs</p>
            <div className="mt-2 text-xs">
              <div className="flex justify-between">
                <span>Processing:</span>
                <span className="text-blue-600">{currentMetrics.queue.activeJobs}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Resources */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Load</CardTitle>
            <Cpu className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics.system.cpuUsage?.toFixed(1) || '0.0'}%
            </div>
            <p className="text-xs text-muted-foreground">CPU Usage</p>
            <div className="mt-2 text-xs">
              <div className="flex justify-between">
                <span>Memory:</span>
                <span className={
                  (currentMetrics.system.memoryUsage || 0) > 80 ? 'text-red-500' : 'text-green-600'
                }>
                  {currentMetrics.system.memoryUsage?.toFixed(1) || '0.0'}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Detailed Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SystemMetricsDisplay 
            metrics={currentMetrics}
            historicalData={historicalData}
            alerts={alerts?.filter(alert => 
              alert.severity === 'CRITICAL' || alert.severity === 'WARNING'
            ).map(alert => ({
              type: alert.type as 'HIGH_ERROR_RATE' | 'SLOW_RESPONSE' | 'HIGH_QUEUE_SIZE' | 'SYNC_FAILURE',
              severity: alert.severity as 'CRITICAL' | 'WARNING',
              message: alert.message,
              value: alert.value || 0,
              threshold: alert.threshold || 0,
              timestamp: alert.timestamp
            }))}
            showDetailedView={true}
          />
        </CardContent>
      </Card>

      {/* Alerts History */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div key={index} className={`p-3 rounded border-l-4 ${
                  alert.severity === 'CRITICAL' ? 'bg-red-50 border-red-500' : 
                  alert.severity === 'WARNING' ? 'bg-yellow-50 border-yellow-500' : 
                  'bg-gray-50 border-gray-500'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`h-4 w-4 ${
                        alert.severity === 'CRITICAL' ? 'text-red-500' : 
                        alert.severity === 'WARNING' ? 'text-yellow-500' : 
                        'text-gray-500'
                      }`} />
                      <div>
                        <div className="font-medium">{alert.message}</div>
                        <div className="text-sm text-muted-foreground">
                          Current: {alert.value?.toFixed(2)}, Threshold: {alert.threshold}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        alert.severity === 'CRITICAL' ? 'destructive' : 
                        alert.severity === 'WARNING' ? 'secondary' : 'outline'
                      }>
                        {alert.severity}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}