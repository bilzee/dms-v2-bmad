'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  AlertTriangle, 
  Settings, 
  RefreshCw, 
  Filter,
  MoreHorizontal,
  TrendingUp,
  Users,
  Activity
} from 'lucide-react';
import { useSyncStore } from '@/stores/sync.store';
import { ManualPriorityOverride } from './ManualPriorityOverride';
import type { PriorityQueueItem } from '@dms/shared';

/**
 * PriorityQueueVisualization component for queue transparency
 * Implements AC: 4 - Priority queue visible to users
 */
export function PriorityQueueVisualization() {
  const {
    filteredQueue,
    priorityStats,
    isLoading,
    isRefreshing,
    error,
    loadQueue,
    loadPriorityStats,
    refreshQueue,
    clearError,
    updateFilters,
    currentFilters
  } = useSyncStore();

  const [selectedItem, setSelectedItem] = useState<PriorityQueueItem | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  // Load queue and stats on mount
  useEffect(() => {
    loadQueue();
    loadPriorityStats();
  }, [loadQueue, loadPriorityStats]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshQueue();
      loadPriorityStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshQueue, loadPriorityStats]);

  const handleRefresh = async () => {
    await refreshQueue();
    await loadPriorityStats();
  };

  const handleOverrideClick = (item: PriorityQueueItem) => {
    setSelectedItem(item);
    setIsOverrideModalOpen(true);
  };

  const handleOverrideClose = () => {
    setIsOverrideModalOpen(false);
    setSelectedItem(null);
  };

  const getPriorityColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (score >= 20) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getPriorityLabel = (score: number) => {
    if (score >= 70) return 'Critical';
    if (score >= 40) return 'High';
    if (score >= 20) return 'Normal';
    return 'Low';
  };

  const formatEstimatedTime = (item: PriorityQueueItem): string => {
    if (!item.estimatedSyncTime) return 'Calculating...';
    
    const now = new Date();
    const estimatedTime = new Date(item.estimatedSyncTime);
    const diffMinutes = Math.ceil((estimatedTime.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffMinutes <= 0) return 'Next';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffMinutes < 1440) return `${Math.ceil(diffMinutes / 60)}h`;
    return `${Math.ceil(diffMinutes / 1440)}d`;
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Failed to load priority queue: {error}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                clearError();
                handleRefresh();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Priority Sync Queue</h2>
          <p className="text-gray-600 mt-1">
            Real-time view of sync items ordered by priority
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {priorityStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold">{priorityStats.totalItems}</p>
                </div>
                <Activity className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">High Priority</p>
                  <p className="text-2xl font-bold text-red-600">{priorityStats.highPriorityItems}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Wait Time</p>
                  <p className="text-2xl font-bold">{Math.round(priorityStats.averageWaitTime)}m</p>
                </div>
                <Clock className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Sync Rate</p>
                  <p className="text-2xl font-bold">{priorityStats.syncThroughput.itemsPerMinute}/min</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Queue Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Queue Items</CardTitle>
              <CardDescription>
                Items are automatically sorted by priority score. Higher scores sync first.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading queue...
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Queue is empty</p>
              <p className="text-sm">All items have been synchronized</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQueue.slice(0, 20).map((item, index) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 transition-colors hover:bg-gray-50 ${getPriorityColor(item.priorityScore || 0)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Priority Badge */}
                      <div className="text-center min-w-[60px]">
                        <div className="text-xs text-gray-500 mb-1">#{index + 1}</div>
                        <Badge 
                          variant="outline" 
                          className={`font-bold ${getPriorityColor(item.priorityScore || 0)}`}
                        >
                          {item.priorityScore || 0}
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">
                          {getPriorityLabel(item.priorityScore || 0)}
                        </div>
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {item.type} • {item.action}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {item.id.slice(0, 8)}
                          </Badge>
                          {item.manualOverride && (
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
                              Manual Override
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 truncate">
                          {item.priorityReason || 'Automatic priority assignment'}
                        </p>
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Created: {new Date(item.createdAt).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            ETA: {formatEstimatedTime(item)}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOverrideClick(item)}
                          className="text-xs"
                        >
                          Override
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar for Estimated Sync Time */}
                  {item.estimatedSyncTime && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Sync Progress</span>
                        <span>{formatEstimatedTime(item)}</span>
                      </div>
                      <Progress 
                        value={Math.max(0, Math.min(100, ((index + 1) / filteredQueue.length) * 100))} 
                        className="h-1"
                      />
                    </div>
                  )}
                </div>
              ))}

              {filteredQueue.length > 20 && (
                <div className="text-center py-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing top 20 items • {filteredQueue.length - 20} more items in queue
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Priority Override Modal */}
      <ManualPriorityOverride
        isOpen={isOverrideModalOpen}
        onClose={handleOverrideClose}
        queueItem={selectedItem}
      />
    </div>
  );
}