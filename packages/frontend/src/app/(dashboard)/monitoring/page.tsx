'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Activity, AlertTriangle, TrendingUp, Database, Globe, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SituationOverview {
  timestamp: Date;
  totalAssessments: number;
  totalResponses: number;
  pendingVerification: number;
  activeIncidents: number;
  criticalGaps: number;
  dataFreshness: {
    realTime: number;
    recent: number;
    offlinePending: number;
  };
}

export default function SituationDisplay() {
  const router = useRouter();
  const [situationData, setSituationData] = useState<SituationOverview | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'degraded' | 'offline'>('connected');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshInterval] = useState(25000); // 25 seconds - established pattern

  const fetchSituationOverview = async () => {
    try {
      const response = await fetch('/api/v1/monitoring/situation/overview');
      const data = await response.json();
      
      if (data.success) {
        setSituationData({
          ...data.data,
          timestamp: new Date(data.data.timestamp),
        });
        setConnectionStatus(data.meta.connectionStatus);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch situation overview:', error);
      setConnectionStatus('offline');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSituationOverview();
    
    const interval = setInterval(fetchSituationOverview, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getConnectionBadgeVariant = (status: string) => {
    switch (status) {
      case 'connected': return 'default';
      case 'degraded': return 'secondary';
      case 'offline': return 'destructive';
      default: return 'outline';
    }
  };

  const getDataFreshnessPercentage = (category: keyof SituationOverview['dataFreshness']) => {
    if (!situationData) return 0;
    const total = situationData.dataFreshness.realTime + 
                  situationData.dataFreshness.recent + 
                  situationData.dataFreshness.offlinePending;
    return total > 0 ? Math.round((situationData.dataFreshness[category] / total) * 100) : 0;
  };

  const getResponseRate = () => {
    if (!situationData || situationData.totalAssessments === 0) return 0;
    return Math.round((situationData.totalResponses / situationData.totalAssessments) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Real-Time Situation Display</h2>
            <p className="text-muted-foreground">Loading real-time assessment and response data...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-100 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!situationData) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Real-Time Situation Display</h2>
            <p className="text-muted-foreground">Unable to load situation data</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Failed to fetch real-time situation data. Please check your connection and try refreshing.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6" data-testid="monitoring-page">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Real-Time Situation Display</h2>
          <p className="text-muted-foreground">
            Current disaster situation and response effectiveness overview
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={getConnectionBadgeVariant(connectionStatus)} className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {connectionStatus.toUpperCase()}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/monitoring/drill-down')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Drill Down
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSituationOverview}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Live Data Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => router.push('/monitoring/drill-down?tab=assessments')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{situationData.totalAssessments}</div>
            <p className="text-xs text-muted-foreground">
              Active assessments across all incidents • Click for details
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => router.push('/monitoring/drill-down?tab=responses')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{situationData.totalResponses}</div>
            <p className="text-xs text-muted-foreground">
              {getResponseRate()}% response rate • Click for details
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => router.push('/monitoring/drill-down?tab=incidents')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{situationData.activeIncidents}</div>
            <p className="text-xs text-muted-foreground">
              Requiring immediate attention • Click for details
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => router.push('/monitoring/drill-down?tab=entities')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Gaps</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{situationData.criticalGaps}</div>
            <p className="text-xs text-muted-foreground">
              Urgent needs requiring resources • Click for details
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Freshness Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Data Freshness Overview
          </CardTitle>
          <CardDescription>
            Real-time data synchronization status across all data categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg bg-green-50">
              <div className="text-2xl font-bold text-green-600">
                {getDataFreshnessPercentage('realTime')}%
              </div>
              <div className="text-sm font-medium">Real-Time</div>
              <div className="text-xs text-muted-foreground">
                {situationData.dataFreshness.realTime} items synced &lt; 5min
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg bg-yellow-50">
              <div className="text-2xl font-bold text-yellow-600">
                {getDataFreshnessPercentage('recent')}%
              </div>
              <div className="text-sm font-medium">Recent</div>
              <div className="text-xs text-muted-foreground">
                {situationData.dataFreshness.recent} items synced &lt; 1hr
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg bg-red-50">
              <div className="text-2xl font-bold text-red-600">
                {getDataFreshnessPercentage('offlinePending')}%
              </div>
              <div className="text-sm font-medium">Offline Pending</div>
              <div className="text-xs text-muted-foreground">
                {situationData.dataFreshness.offlinePending} items awaiting sync
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
        <div className="flex items-center gap-4">
          <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          <span>Auto-refresh every {refreshInterval / 1000} seconds</span>
          <span>Data timestamp: {situationData.timestamp.toLocaleTimeString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Pending verification: {situationData.pendingVerification}</span>
          <Badge variant="outline" className="text-xs">
            Connection: {connectionStatus}
          </Badge>
        </div>
      </div>
    </div>
  );
}