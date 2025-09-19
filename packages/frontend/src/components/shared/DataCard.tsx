'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState, DataQualityIndicator } from './LoadingState';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw, 
  MoreHorizontal,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

export interface DataCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    type: 'up' | 'down' | 'neutral';
    label?: string;
  };
  status?: 'success' | 'warning' | 'error' | 'info' | 'loading';
  isLoading?: boolean;
  error?: Error | null;
  lastUpdated?: Date;
  isStale?: boolean;
  isOffline?: boolean;
  hasPendingChanges?: boolean;
  onRefresh?: () => void;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'stat' | 'metric';
}

export function DataCard({
  title,
  value,
  subtitle,
  trend,
  status = 'info',
  isLoading = false,
  error = null,
  lastUpdated,
  isStale = false,
  isOffline = false,
  hasPendingChanges = false,
  onRefresh,
  actions,
  icon,
  footer,
  className = '',
  variant = 'default',
}: DataCardProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'loading':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      case 'loading':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendIcon = () => {
    switch (trend?.type) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (trend?.type) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  if (variant === 'stat') {
    return (
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className="flex items-center space-x-2">
                <p className="text-2xl font-bold">{formatValue(value)}</p>
                {getStatusIcon()}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
              {trend && (
                <div className="flex items-center space-x-1">
                  {getTrendIcon()}
                  <span className={`text-sm ${getTrendColor()}`}>
                    {Math.abs(trend.value)}%{trend.label && ` ${trend.label}`}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-end space-y-2">
              {icon}
              
              <DataQualityIndicator
                isStale={isStale}
                isOffline={isOffline}
                hasPendingChanges={hasPendingChanges}
                lastSync={lastUpdated}
              />
              
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </div>
          
          {footer && (
            <div className="mt-4 pt-4 border-t">
              {footer}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            
            <DataQualityIndicator
              isStale={isStale}
              isOffline={isOffline}
              hasPendingChanges={hasPendingChanges}
              lastSync={lastUpdated}
            />
            
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
            
            {actions && (
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <LoadingState
          isLoading={isLoading}
          error={error}
          type="card"
          size="sm"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <p className="text-3xl font-bold">{formatValue(value)}</p>
                <Badge variant="outline" className={getStatusColor()}>
                  {status}
                </Badge>
              </div>
              
              {subtitle && (
                <p className="text-muted-foreground">{subtitle}</p>
              )}
              
              {trend && (
                <div className="flex items-center space-x-2">
                  {getTrendIcon()}
                  <span className={`text-sm ${getTrendColor()}`}>
                    {trend.value > 0 ? '+' : ''}{trend.value}%{trend.label && ` ${trend.label}`}
                  </span>
                </div>
              )}
            </div>
            
            {footer && (
              <div className="pt-4 border-t">
                {footer}
              </div>
            )}
          </div>
        </LoadingState>
      </CardContent>
    </Card>
  );
}

// Metric card for displaying key performance indicators
export interface MetricCardProps {
  title: string;
  metrics: Array<{
    label: string;
    value: string | number;
    trend?: {
      value: number;
      type: 'up' | 'down' | 'neutral';
    };
  }>;
  isLoading?: boolean;
  error?: Error | null;
  lastUpdated?: Date;
  onRefresh?: () => void;
}

export function MetricCard({
  title,
  metrics,
  isLoading = false,
  error = null,
  lastUpdated,
  onRefresh,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <LoadingState
          isLoading={isLoading}
          error={error}
          type="card"
          size="sm"
        >
          <div className="grid grid-cols-2 gap-4">
            {metrics.map((metric, index) => (
              <div key={index} className="space-y-1">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <div className="flex items-center space-x-2">
                  <p className="text-lg font-semibold">{metric.value}</p>
                  {metric.trend && (
                    <div className="flex items-center space-x-1">
                      {metric.trend.type === 'up' && (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      )}
                      {metric.trend.type === 'down' && (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      {metric.trend.type === 'neutral' && (
                        <Minus className="h-3 w-3 text-gray-500" />
                      )}
                      <span className={`text-xs ${
                        metric.trend.type === 'up' ? 'text-green-600' :
                        metric.trend.type === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {metric.trend.value > 0 ? '+' : ''}{metric.trend.value}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {lastUpdated && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Last updated: {format(lastUpdated, 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          )}
        </LoadingState>
      </CardContent>
    </Card>
  );
}