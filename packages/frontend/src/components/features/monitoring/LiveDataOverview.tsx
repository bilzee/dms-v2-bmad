'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Activity, Clock, Database, Signal, AlertCircle } from 'lucide-react';

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

interface LiveDataOverviewProps {
  refreshInterval?: number; // in milliseconds
  showConnectionStatus?: boolean;
  autoRefresh?: boolean;
}

export function LiveDataOverview({
  refreshInterval = 25000,
  showConnectionStatus = true,
  autoRefresh = true
}: LiveDataOverviewProps) {
  const [situationData, setSituationData] = useState<SituationOverview | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'degraded' | 'offline'>('connected');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchSituationData = async () => {
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
      console.error('Failed to fetch live situation data:', error);
      setConnectionStatus('offline');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSituationData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchSituationData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, autoRefresh]);

  const getConnectionBadgeVariant = (status: string) => {
    switch (status) {
      case 'connected': return 'default';
      case 'degraded': return 'secondary';
      case 'offline': return 'destructive';
      default: return 'outline';
    }
  };

  const getConnectionIcon = (status: string) => {
    switch (status) {
      case 'connected': return <Signal className="h-3 w-3" />;
      case 'degraded': return <Clock className="h-3 w-3" />;
      case 'offline': return <AlertCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getDataFreshnessStatus = () => {
    if (!situationData) return 'UNKNOWN';
    
    const total = situationData.dataFreshness.realTime + 
                  situationData.dataFreshness.recent + 
                  situationData.dataFreshness.offlinePending;
    
    const realTimePercentage = total > 0 ? (situationData.dataFreshness.realTime / total) * 100 : 100;
    
    if (realTimePercentage >= 90) return 'EXCELLENT';
    if (realTimePercentage >= 70) return 'GOOD';
    if (realTimePercentage >= 50) return 'FAIR';
    return 'POOR';
  };

  const getResponseRate = () => {
    if (!situationData || situationData.totalAssessments === 0) return 0;
    return Math.round((situationData.totalResponses / situationData.totalAssessments) * 100);
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Data Overview
          </CardTitle>
          <CardDescription>Loading real-time situation data...</CardDescription>
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

  if (!situationData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Data Overview
          </CardTitle>
          <CardDescription>Unable to load live data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to fetch situation overview. Please try refreshing.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle>Live Data Overview</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {showConnectionStatus && (
              <Badge variant={getConnectionBadgeVariant(connectionStatus)} className="flex items-center gap-1">
                {getConnectionIcon(connectionStatus)}
                {connectionStatus}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={fetchSituationData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        <CardDescription>
          Real-time assessment and response data with timestamp indicators
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Main Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{situationData.totalAssessments}</div>
              <div className="text-sm text-muted-foreground">Assessments</div>
              <div className="text-xs text-muted-foreground">Total active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{situationData.totalResponses}</div>
              <div className="text-sm text-muted-foreground">Responses</div>
              <div className="text-xs text-muted-foreground">{getResponseRate()}% rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{situationData.activeIncidents}</div>
              <div className="text-sm text-muted-foreground">Incidents</div>
              <div className="text-xs text-muted-foreground">Currently active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{situationData.criticalGaps}</div>
              <div className="text-sm text-muted-foreground">Critical Gaps</div>
              <div className="text-xs text-muted-foreground">Need attention</div>
            </div>
          </div>

          {/* Data Freshness Indicators */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Data Freshness Status</h4>
              <Badge variant="outline">
                {getDataFreshnessStatus()}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="font-medium text-green-700">{situationData.dataFreshness.realTime}</div>
                <div className="text-green-600">Real-time</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded">
                <div className="font-medium text-yellow-700">{situationData.dataFreshness.recent}</div>
                <div className="text-yellow-600">Recent</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded">
                <div className="font-medium text-red-700">{situationData.dataFreshness.offlinePending}</div>
                <div className="text-red-600">Pending</div>
              </div>
            </div>
          </div>

          {/* Timestamp Information */}
          <div className="border-t pt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">Last Update:</span>
                <div>{lastUpdated.toLocaleTimeString()}</div>
              </div>
              <div>
                <span className="font-medium">Data Timestamp:</span>
                <div>{formatTimestamp(situationData.timestamp)}</div>
              </div>
              <div>
                <span className="font-medium">Verification Queue:</span>
                <div>{situationData.pendingVerification} pending</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}