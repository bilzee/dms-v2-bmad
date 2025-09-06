// components/features/admin/audit/AuditDashboard.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, AlertTriangle, Shield, Activity } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { UserActivityTable } from './UserActivityTable';
import { SecurityEventsPanel } from './SecurityEventsPanel';
import { SystemMetricsDisplay } from './SystemMetricsDisplay';
import { AuditExportControls } from './AuditExportControls';
import { 
  AuditActivityResponse, 
  SecurityEventResponse, 
  SystemPerformanceResponse,
  SystemActivityLog,
  SecurityEvent
} from '@dms/shared/types/admin';

interface AuditDashboardProps {
  className?: string;
}

interface DashboardStats {
  totalActivities: number;
  securityEvents: number;
  criticalEvents: number;
  systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

export function AuditDashboard({ className }: AuditDashboardProps) {
  const { toast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalActivities: 0,
    securityEvents: 0,
    criticalEvents: 0,
    systemHealth: 'HEALTHY'
  });
  const [recentActivities, setRecentActivities] = useState<SystemActivityLog[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [performanceData, setPerformanceData] = useState<SystemPerformanceResponse['data'] | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Load all dashboard data
   */
  async function loadDashboardData() {
    try {
      setIsLoading(true);

      // Fetch all required data in parallel
      const [activitiesResponse, securityResponse, performanceResponse] = await Promise.all([
        fetch('/api/v1/admin/audit/activity?limit=10&sortOrder=desc'),
        fetch('/api/v1/admin/audit/security-events?limit=10&sortOrder=desc'),
        fetch('/api/v1/admin/monitoring/performance?includeHistorical=false')
      ]);

      // Parse responses
      const activitiesData: AuditActivityResponse = await activitiesResponse.json();
      const securityData: SecurityEventResponse = await securityResponse.json();
      const performanceData: SystemPerformanceResponse = await performanceResponse.json();

      if (activitiesData.success) {
        setRecentActivities(activitiesData.data.activities);
      }

      if (securityData.success) {
        setSecurityEvents(securityData.data.events);
      }

      if (performanceData.success) {
        setPerformanceData(performanceData.data);
      }

      // Calculate dashboard stats
      setDashboardStats({
        totalActivities: activitiesData.data?.totalCount || 0,
        securityEvents: securityData.data?.totalCount || 0,
        criticalEvents: securityData.data?.stats?.criticalEvents || 0,
        systemHealth: performanceData.data?.healthStatus || 'HEALTHY'
      });

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load audit dashboard data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Manual refresh handler
   */
  function handleRefresh() {
    loadDashboardData();
  }

  /**
   * Get health status badge variant
   */
  function getHealthBadgeVariant(health: string) {
    switch (health) {
      case 'HEALTHY': return 'default';
      case 'WARNING': return 'secondary';
      case 'CRITICAL': return 'destructive';
      default: return 'default';
    }
  }

  /**
   * Get health status icon
   */
  function getHealthIcon(health: string) {
    switch (health) {
      case 'HEALTHY': return <Activity className="h-4 w-4" />;
      case 'WARNING': return <AlertTriangle className="h-4 w-4" />;
      case 'CRITICAL': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor system activity, security events, and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalActivities.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.securityEvents.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {dashboardStats.criticalEvents.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            {getHealthIcon(dashboardStats.systemHealth)}
          </CardHeader>
          <CardContent>
            <Badge variant={getHealthBadgeVariant(dashboardStats.systemHealth)}>
              {dashboardStats.systemHealth}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">User Activity</TabsTrigger>
          <TabsTrigger value="security">Security Events</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <UserActivityTable 
                  activities={recentActivities}
                  showPagination={false}
                  maxHeight="400px"
                />
              </CardContent>
            </Card>

            {/* Security Events */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Security Events</CardTitle>
              </CardHeader>
              <CardContent>
                <SecurityEventsPanel 
                  events={securityEvents}
                  showFilters={false}
                  showPagination={false}
                  maxHeight="400px"
                />
              </CardContent>
            </Card>
          </div>

          {/* System Metrics Summary */}
          {performanceData && (
            <Card>
              <CardHeader>
                <CardTitle>System Metrics Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <SystemMetricsDisplay 
                  metrics={performanceData.currentMetrics}
                  alerts={performanceData.alerts}
                  showDetailedView={false}
                />
              </CardContent>
            </Card>
          )}

          {/* Export Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Data Export</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditExportControls />
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Activity Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <UserActivityTable showFilters={true} showPagination={true} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Events Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              <SecurityEventsPanel showFilters={true} showPagination={true} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {performanceData ? (
            <SystemMetricsDisplay 
              metrics={performanceData.currentMetrics}
              historicalData={performanceData.historicalData}
              alerts={performanceData.alerts}
              showDetailedView={true}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading performance data...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}