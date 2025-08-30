'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Database, Clock, Wifi, WifiOff, List, AlertCircle } from 'lucide-react';

interface DataFreshnessIndicator {
  category: 'assessments' | 'responses' | 'incidents' | 'entities';
  totalCount: number;
  realTimeCount: number; // Synced within 5 minutes
  recentCount: number; // Synced within 1 hour
  offlinePendingCount: number; // Not yet synced
  oldestPending?: Date;
  syncQueueSize: number;
}

interface DataFreshnessIndicatorProps {
  refreshInterval?: number;
  showDetailedView?: boolean;
  categoryFilter?: 'assessments' | 'responses' | 'incidents' | 'entities' | null;
}

export function DataFreshnessIndicator({
  refreshInterval = 25000,
  showDetailedView = false,
  categoryFilter = null
}: DataFreshnessIndicatorProps) {
  const [freshnessData, setFreshnessData] = useState<DataFreshnessIndicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [summaryStats, setSummaryStats] = useState({
    totalItems: 0,
    totalRealTime: 0,
    totalRecent: 0,
    totalOfflinePending: 0,
    totalQueueSize: 0,
    realTimePercentage: 0,
    offlinePendingPercentage: 0,
    oldestPending: undefined as Date | undefined,
  });

  const fetchDataFreshness = async () => {
    try {
      const searchParams = new URLSearchParams();
      if (categoryFilter) searchParams.append('category', categoryFilter);
      searchParams.append('includeDetails', 'true');
      
      const response = await fetch(`/api/v1/monitoring/situation/data-freshness?${searchParams}`);
      const data = await response.json();
      
      if (data.success) {
        setFreshnessData(data.data.map((indicator: any) => ({
          ...indicator,
          oldestPending: indicator.oldestPending ? new Date(indicator.oldestPending) : undefined,
        })));
        
        setSummaryStats({
          ...data.meta.summary,
          oldestPending: data.meta.summary.oldestPending ? new Date(data.meta.summary.oldestPending) : undefined,
        });
        
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch data freshness indicators:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDataFreshness();
    
    const interval = setInterval(fetchDataFreshness, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, categoryFilter]);

  const getFreshnessBadgeVariant = (percentage: number) => {
    if (percentage >= 90) return 'default'; // Green
    if (percentage >= 70) return 'secondary'; // Yellow
    if (percentage >= 50) return 'outline'; // Orange
    return 'destructive'; // Red
  };

  const getFreshnessStatus = (realTimePercentage: number, offlinePendingPercentage: number) => {
    if (realTimePercentage >= 90) return 'EXCELLENT';
    if (realTimePercentage >= 70) return 'GOOD';
    if (offlinePendingPercentage <= 10) return 'FAIR';
    return 'POOR';
  };

  const formatCategoryName = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const formatTimeSince = (date: Date) => {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'assessments': return <Database className="h-4 w-4" />;
      case 'responses': return <Clock className="h-4 w-4" />;
      case 'incidents': return <AlertCircle className="h-4 w-4" />;
      case 'entities': return <List className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Data Freshness Tracking
          </CardTitle>
          <CardDescription>Loading sync status indicators...</CardDescription>
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            <CardTitle>Data Freshness Tracking</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getFreshnessBadgeVariant(summaryStats.realTimePercentage)}>
              {getFreshnessStatus(summaryStats.realTimePercentage, summaryStats.offlinePendingPercentage)}
            </Badge>
            <Button variant="outline" size="sm" onClick={fetchDataFreshness} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        <CardDescription>
          Sync status indicators and offline submission visibility
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Overall Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg bg-green-50">
              <div className="text-2xl font-bold text-green-600">{summaryStats.realTimePercentage}%</div>
              <div className="text-sm font-medium">Real-Time</div>
              <div className="text-xs text-muted-foreground">
                {summaryStats.totalRealTime} items &lt; 5min
              </div>
            </div>
            <div className="text-center p-3 border rounded-lg bg-yellow-50">
              <div className="text-2xl font-bold text-yellow-600">
                {Math.round((summaryStats.totalRecent / summaryStats.totalItems) * 100)}%
              </div>
              <div className="text-sm font-medium">Recent</div>
              <div className="text-xs text-muted-foreground">
                {summaryStats.totalRecent} items &lt; 1hr
              </div>
            </div>
            <div className="text-center p-3 border rounded-lg bg-red-50">
              <div className="text-2xl font-bold text-red-600">{summaryStats.offlinePendingPercentage}%</div>
              <div className="text-sm font-medium">Offline Pending</div>
              <div className="text-xs text-muted-foreground">
                {summaryStats.totalOfflinePending} awaiting sync
              </div>
            </div>
            <div className="text-center p-3 border rounded-lg bg-blue-50">
              <div className="text-2xl font-bold text-blue-600">{summaryStats.totalQueueSize}</div>
              <div className="text-sm font-medium">Queue Size</div>
              <div className="text-xs text-muted-foreground">Processing queue</div>
            </div>
          </div>

          {showDetailedView && (
            <>
              {/* Category Breakdown */}
              <div>
                <h4 className="text-sm font-medium mb-3">Data Freshness by Category</h4>
                <div className="space-y-3">
                  {freshnessData.map((indicator) => {
                    const realTimePercentage = indicator.totalCount > 0 
                      ? Math.round((indicator.realTimeCount / indicator.totalCount) * 100) 
                      : 100;
                    const offlinePendingPercentage = indicator.totalCount > 0 
                      ? Math.round((indicator.offlinePendingCount / indicator.totalCount) * 100) 
                      : 0;
                    
                    return (
                      <div key={indicator.category} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getCategoryIcon(indicator.category)}
                            <span className="text-sm font-medium">
                              {formatCategoryName(indicator.category)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getFreshnessBadgeVariant(realTimePercentage)} className="text-xs">
                              {realTimePercentage}% real-time
                            </Badge>
                            {indicator.syncQueueSize > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {indicator.syncQueueSize} queued
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="text-center">
                            <div className="text-sm font-semibold text-green-600">{indicator.realTimeCount}</div>
                            <div className="text-xs text-muted-foreground">Real-time</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold text-yellow-600">{indicator.recentCount}</div>
                            <div className="text-xs text-muted-foreground">Recent</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold text-red-600">{indicator.offlinePendingCount}</div>
                            <div className="text-xs text-muted-foreground">Pending</div>
                          </div>
                        </div>
                        
                        <Progress value={realTimePercentage} className="mb-2" />
                        
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Total: {indicator.totalCount}</span>
                          {indicator.oldestPending && (
                            <span>Oldest pending: {formatTimeSince(indicator.oldestPending)}</span>
                          )}
                        </div>

                        {offlinePendingPercentage > 20 && (
                          <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                            <WifiOff className="h-3 w-3 text-yellow-500" />
                            <span className="text-xs text-yellow-700">
                              High offline pending rate ({offlinePendingPercentage}%)
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Sync Queue Summary */}
          {summaryStats.totalQueueSize > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <List className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Sync Queue Status</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {summaryStats.totalQueueSize} items currently processing or waiting to sync
                {summaryStats.oldestPending && (
                  <span className="ml-2">
                    • Oldest pending: {formatTimeSince(summaryStats.oldestPending)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Footer Information */}
          <div className="border-t pt-3 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              <span>Thresholds: Real-time &lt; 5min, Recent &lt; 1hr • Auto-refresh every {refreshInterval / 1000}s</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}