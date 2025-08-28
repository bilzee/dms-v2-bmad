'use client';

/**
 * SyncProgressIndicator Component
 * 
 * Provides unobtrusive progress indicators for background sync operations:
 * - Toast notifications for sync status
 * - Status bar indicators
 * - Estimated time remaining
 * - Item-level progress tracking
 */

import React, { useEffect, useState, useCallback } from 'react';
import { backgroundSyncManager, BackgroundSyncProgress, SyncMetrics } from '@/lib/sync/BackgroundSyncManager';
import { connectivityDetector, ConnectivityStatus } from '@/lib/sync/ConnectivityDetector';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Wifi, 
  WifiOff, 
  Battery, 
  BatteryLow, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Pause,
  Play,
  X
} from 'lucide-react';

export interface SyncProgressIndicatorProps {
  variant?: 'compact' | 'detailed' | 'minimal';
  showConnectivityStatus?: boolean;
  showBatteryStatus?: boolean;
  showEstimatedTime?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number; // seconds
  className?: string;
}

interface SyncIndicatorState {
  connectivity: ConnectivityStatus | null;
  progress: BackgroundSyncProgress | null;
  syncStatus: ReturnType<typeof backgroundSyncManager.getStatus>;
  isVisible: boolean;
  lastToastId: string | number | null;
}

export function SyncProgressIndicator({
  variant = 'compact',
  showConnectivityStatus = true,
  showBatteryStatus = false,
  showEstimatedTime = true,
  autoHide = true,
  autoHideDelay = 5,
  className = '',
}: SyncProgressIndicatorProps) {
  const [state, setState] = useState<SyncIndicatorState>({
    connectivity: null,
    progress: null,
    syncStatus: backgroundSyncManager.getStatus(),
    isVisible: false,
    lastToastId: null,
  });

  // Update connectivity status
  const updateConnectivity = useCallback((status: ConnectivityStatus) => {
    setState(prev => ({
      ...prev,
      connectivity: status,
    }));
  }, []);

  // Update sync progress
  const updateProgress = useCallback((progress: BackgroundSyncProgress) => {
    setState(prev => ({
      ...prev,
      progress,
      isVisible: true,
    }));

    // Show toast notification for sync start
    if (progress.completedItems === 0 && progress.totalItems > 0) {
      const toastId = toast.info(`Syncing ${progress.totalItems} items in background`, {
        duration: 3000,
        action: {
          label: 'View',
          onClick: () => setState(prev => ({ ...prev, isVisible: true })),
        },
      });
      
      setState(prev => ({ ...prev, lastToastId: toastId }));
    }
  }, []);

  // Handle sync completion
  const handleSyncComplete = useCallback((metrics: SyncMetrics) => {
    const { itemsSucceeded, itemsFailed, itemsProcessed } = metrics;
    
    if (itemsFailed === 0) {
      toast.success(`Successfully synced ${itemsSucceeded} items`, {
        duration: 2000,
      });
    } else {
      toast.warning(`Synced ${itemsSucceeded} items, ${itemsFailed} failed`, {
        duration: 4000,
        action: {
          label: 'Details',
          onClick: () => setState(prev => ({ ...prev, isVisible: true })),
        },
      });
    }

    // Auto-hide after completion
    if (autoHide) {
      setTimeout(() => {
        setState(prev => ({ ...prev, isVisible: false }));
      }, autoHideDelay * 1000);
    }
  }, [autoHide, autoHideDelay]);

  // Handle sync errors
  const handleSyncError = useCallback((error: string) => {
    toast.error(`Background sync failed: ${error}`, {
      duration: 5000,
      action: {
        label: 'Retry',
        onClick: () => backgroundSyncManager.triggerImmediateSync('manual_retry'),
      },
    });
  }, []);

  // Initialize subscriptions
  useEffect(() => {
    const unsubscribeConnectivity = connectivityDetector.onConnectivityChange(updateConnectivity);
    const unsubscribeSync = backgroundSyncManager.subscribe({
      onProgress: updateProgress,
      onComplete: handleSyncComplete,
      onError: handleSyncError,
    });

    // Update sync status periodically
    const statusInterval = setInterval(() => {
      setState(prev => ({
        ...prev,
        syncStatus: backgroundSyncManager.getStatus(),
      }));
    }, 1000);

    return () => {
      unsubscribeConnectivity();
      unsubscribeSync();
      clearInterval(statusInterval);
    };
  }, [updateConnectivity, updateProgress, handleSyncComplete, handleSyncError]);

  // Handle manual sync trigger
  const handleManualSync = useCallback(() => {
    backgroundSyncManager.triggerImmediateSync('manual_trigger');
  }, []);

  // Handle pause/resume
  const handlePauseResume = useCallback(() => {
    if (state.syncStatus.isPaused) {
      backgroundSyncManager.resume();
    } else {
      backgroundSyncManager.pause();
    }
  }, [state.syncStatus.isPaused]);

  // Handle hide
  const handleHide = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: false }));
  }, []);

  // Format time remaining
  const formatTimeRemaining = useCallback((seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }, []);

  // Get connectivity icon
  const getConnectivityIcon = useCallback(() => {
    if (!state.connectivity) return <WifiOff className="w-4 h-4" />;
    
    if (!state.connectivity.isOnline) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }

    switch (state.connectivity.connectionQuality) {
      case 'excellent':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'good':
        return <Wifi className="w-4 h-4 text-blue-500" />;
      case 'poor':
        return <Wifi className="w-4 h-4 text-yellow-500" />;
      default:
        return <Wifi className="w-4 h-4" />;
    }
  }, [state.connectivity]);

  // Get battery icon
  const getBatteryIcon = useCallback(() => {
    if (!state.connectivity?.batteryLevel) return null;
    
    const { batteryLevel, isCharging } = state.connectivity;
    
    if (batteryLevel < 20) {
      return <BatteryLow className="w-4 h-4 text-red-500" />;
    }
    
    return (
      <div className="flex items-center gap-1">
        <Battery className="w-4 h-4" />
        {isCharging && <span className="text-xs text-green-500">⚡</span>}
      </div>
    );
  }, [state.connectivity]);

  // Calculate progress percentage
  const getProgressPercentage = useCallback(() => {
    if (!state.progress || state.progress.totalItems === 0) return 0;
    return Math.round((state.progress.completedItems / state.progress.totalItems) * 100);
  }, [state.progress]);

  // Render minimal variant
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showConnectivityStatus && getConnectivityIcon()}
        {state.progress && state.progress.totalItems > 0 && (
          <Badge variant="secondary" className="text-xs">
            {state.progress.completedItems}/{state.progress.totalItems}
          </Badge>
        )}
      </div>
    );
  }

  // Don't render if not visible and no active sync
  if (!state.isVisible && !state.progress) {
    return null;
  }

  // Render compact variant
  if (variant === 'compact') {
    return (
      <Card className={`w-80 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Background Sync</span>
            </div>
            
            <div className="flex items-center gap-2">
              {showConnectivityStatus && getConnectivityIcon()}
              {showBatteryStatus && getBatteryIcon()}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleHide}
                className="w-6 h-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          {state.progress ? (
            <div className="space-y-2">
              <Progress value={getProgressPercentage()} className="h-2" />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {state.progress.completedItems} of {state.progress.totalItems} items
                </span>
                
                {showEstimatedTime && state.progress.currentOperation?.estimatedTimeRemaining && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeRemaining(state.progress.currentOperation.estimatedTimeRemaining)}
                  </span>
                )}
              </div>
              
              {state.progress.currentOperation && (
                <div className="text-xs text-muted-foreground">
                  Syncing {state.progress.currentOperation.type.toLowerCase()}...
                </div>
              )}
              
              {state.progress.failedItems > 0 && (
                <div className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="w-3 h-3" />
                  {state.progress.failedItems} items failed
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {state.syncStatus.isPaused ? 'Paused' : 'Ready to sync'}
              </span>
              
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePauseResume}
                  className="h-6 px-2"
                >
                  {state.syncStatus.isPaused ? (
                    <Play className="w-3 h-3" />
                  ) : (
                    <Pause className="w-3 h-3" />
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleManualSync}
                  disabled={!state.syncStatus.canSync || state.syncStatus.isRunning}
                  className="h-6 px-2"
                >
                  <Upload className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Render detailed variant
  return (
    <Card className={`w-96 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Background Sync</h3>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleHide}
            className="w-8 h-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Connectivity Status */}
        {showConnectivityStatus && state.connectivity && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {getConnectivityIcon()}
              <span className="text-sm">
                {state.connectivity.isOnline ? 'Online' : 'Offline'}
                {state.connectivity.connectionType !== 'unknown' && (
                  <span className="text-muted-foreground">
                    {' '}({state.connectivity.connectionType})
                  </span>
                )}
              </span>
            </div>
            
            <Badge variant={state.connectivity.isOnline ? 'default' : 'destructive'}>
              {state.connectivity.connectionQuality}
            </Badge>
          </div>
        )}
        
        {/* Battery Status */}
        {showBatteryStatus && state.connectivity?.batteryLevel && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {getBatteryIcon()}
              <span className="text-sm">Battery</span>
            </div>
            
            <Badge variant={state.connectivity.batteryLevel < 20 ? 'destructive' : 'default'}>
              {state.connectivity.batteryLevel}%
              {state.connectivity.isCharging && ' ⚡'}
            </Badge>
          </div>
        )}
        
        {/* Sync Progress */}
        {state.progress ? (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground">
                  {getProgressPercentage()}%
                </span>
              </div>
              
              <Progress value={getProgressPercentage()} className="h-3" />
              
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>
                  {state.progress.completedItems} completed, {state.progress.failedItems} failed
                </span>
                <span>
                  {state.progress.totalItems} total
                </span>
              </div>
            </div>
            
            {state.progress.currentOperation && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Syncing {state.progress.currentOperation.type.toLowerCase()}
                  </span>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  ID: {state.progress.currentOperation.entityId}
                </div>
                
                {showEstimatedTime && state.progress.currentOperation.estimatedTimeRemaining && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatTimeRemaining(state.progress.currentOperation.estimatedTimeRemaining)} remaining
                  </div>
                )}
              </div>
            )}
            
            {state.progress.averageSyncDuration > 0 && (
              <div className="text-xs text-muted-foreground">
                Average sync time: {formatTimeRemaining(state.progress.averageSyncDuration)}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Status</span>
              <Badge variant={state.syncStatus.isPaused ? 'secondary' : 'default'}>
                {state.syncStatus.isPaused ? 'Paused' : 'Active'}
              </Badge>
            </div>
            
            {state.syncStatus.nextScheduledSync && (
              <div className="flex items-center justify-between text-sm">
                <span>Next sync</span>
                <span className="text-muted-foreground">
                  {state.syncStatus.nextScheduledSync.toLocaleTimeString()}
                </span>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePauseResume}
                className="flex-1"
              >
                {state.syncStatus.isPaused ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              
              <Button
                size="sm"
                onClick={handleManualSync}
                disabled={!state.syncStatus.canSync || state.syncStatus.isRunning}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Sync Now
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SyncProgressIndicator;