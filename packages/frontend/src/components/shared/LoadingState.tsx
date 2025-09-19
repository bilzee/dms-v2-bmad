'use client';

import React from 'react';
import { Loader2, WifiOff, AlertCircle, RefreshCw, Database } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface LoadingStateProps {
  isLoading?: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  isEmptyMessage?: string;
  retry?: () => void;
  skeleton?: React.ReactNode;
  children?: React.ReactNode;
  type?: 'card' | 'list' | 'table' | 'page';
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  progress?: number;
  offlineMode?: boolean;
  isRefreshing?: boolean;
  lastUpdated?: Date;
}

export function LoadingState({
  isLoading = false,
  error = null,
  isEmpty = false,
  isEmptyMessage = 'No data available',
  retry,
  skeleton,
  children,
  type = 'card',
  size = 'md',
  showProgress = false,
  progress = 0,
  offlineMode = false,
  isRefreshing = false,
  lastUpdated,
}: LoadingStateProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'p-4';
      case 'lg':
        return 'p-8';
      default:
        return 'p-6';
    }
  };

  const getLoadingContent = () => {
    if (skeleton) {
      return skeleton;
    }

    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Loading data...</p>
          {showProgress && progress > 0 && (
            <div className="mt-2">
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{Math.round(progress)}% complete</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const getErrorContent = () => {
    const getErrorIcon = () => {
      if (offlineMode) return <WifiOff className="h-8 w-8 text-orange-500" />;
      if (error?.message.includes('database')) return <Database className="h-8 w-8 text-red-500" />;
      return <AlertCircle className="h-8 w-8 text-red-500" />;
    };

    const getErrorMessage = () => {
      if (offlineMode) return 'Offline mode - showing cached data';
      if (error?.message.includes('network')) return 'Network error - please check your connection';
      if (error?.message.includes('database')) return 'Database error - please try again later';
      return error?.message || 'An error occurred';
    };

    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        {getErrorIcon()}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            {getErrorMessage()}
          </p>
          {retry && (
            <Button onClick={retry} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  };

  const getEmptyContent = () => (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {isEmptyMessage}
        </p>
      </div>
    </div>
  );

  const getRefreshIndicator = () => {
    if (!isRefreshing && !lastUpdated) return null;

    return (
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {isRefreshing && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Refreshing...</span>
            </>
          )}
        </div>
        {lastUpdated && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (error && !offlineMode) {
      return getErrorContent();
    }

    if (isLoading) {
      return getLoadingContent();
    }

    if (isEmpty && !offlineMode) {
      return getEmptyContent();
    }

    return children;
  };

  // For page-level loading states
  if (type === 'page') {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${getSizeClasses()}`}>
        <div className="w-full max-w-md">
          {renderContent()}
        </div>
      </div>
    );
  }

  // For list-level loading states
  if (type === 'list') {
    return (
      <div className={`space-y-4 ${getSizeClasses()}`}>
        {getRefreshIndicator()}
        {renderContent()}
      </div>
    );
  }

  // For table-level loading states
  if (type === 'table') {
    return (
      <div className={`text-center py-8 ${getSizeClasses()}`}>
        {renderContent()}
      </div>
    );
  }

  // Default card-level loading state
  return (
    <Card className={getSizeClasses()}>
      <CardContent>
        {getRefreshIndicator()}
        {renderContent()}
        
        {offlineMode && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-orange-600">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline Mode
              </Badge>
              <span className="text-xs text-muted-foreground">
                Using cached data
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Skeleton components for common patterns
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
          <div className="h-4 bg-muted rounded w-5/6 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="h-4 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 border rounded">
          <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Data quality indicators
export function DataQualityIndicator({
  isStale = false,
  isOffline = false,
  hasPendingChanges = false,
  lastSync,
}: {
  isStale?: boolean;
  isOffline?: boolean;
  hasPendingChanges?: boolean;
  lastSync?: Date;
}) {
  return (
    <div className="flex items-center space-x-2">
      {isOffline && (
        <Badge variant="secondary" className="text-orange-600">
          <WifiOff className="h-3 w-3 mr-1" />
          Offline
        </Badge>
      )}
      
      {isStale && (
        <Badge variant="secondary" className="text-yellow-600">
          <AlertCircle className="h-3 w-3 mr-1" />
          Stale Data
        </Badge>
      )}
      
      {hasPendingChanges && (
        <Badge variant="secondary" className="text-blue-600">
          <Database className="h-3 w-3 mr-1" />
          Pending Sync
        </Badge>
      )}
      
      {lastSync && (
        <span className="text-xs text-muted-foreground">
          Sync: {new Date(lastSync).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}