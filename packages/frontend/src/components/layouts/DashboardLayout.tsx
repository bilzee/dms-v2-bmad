'use client'

import { ReactNode, useState, useEffect } from 'react';
import { useRoleInterface } from '@/hooks/useRoleInterface';
import { PermissionGuard, WidgetGuard, LoadingGuard, ErrorGuard, QuickActionGuard } from '@/components/shared/PermissionGuard';
import { RoleSpecificDashboard } from '@/components/layouts/RoleBasedNavigation';

interface DashboardLayoutProps {
  children?: ReactNode;
  customWidgets?: ReactNode[];
  showDefaultDashboard?: boolean;
  className?: string;
}

interface DashboardWidgetProps {
  widget: {
    id: string;
    type: 'chart' | 'table' | 'metric' | 'list' | 'map' | 'activity';
    title: string;
    dataSource: string;
    refreshable: boolean;
    minimizable: boolean;
    requiredPermissions: string[];
    priority?: number;
  };
  children?: ReactNode;
}

interface MetricWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  refreshable?: boolean;
  onRefresh?: () => void;
}

function DashboardWidget({ widget, children }: DashboardWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!widget.dataSource) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(widget.dataSource);
      if (!response.ok) {
        throw new Error(`Failed to fetch data for ${widget.title}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [widget.dataSource]);

  const handleRefresh = () => {
    if (widget.refreshable) {
      fetchData();
    }
  };

  const getVariantStyles = (value: any) => {
    if (typeof value !== 'number') return 'text-gray-900';
    
    switch (widget.type) {
      case 'metric':
        if (widget.id.includes('emergency') || widget.id.includes('incident') || widget.id.includes('conflict')) {
          return value > 0 ? 'text-red-600' : 'text-green-600';
        }
        if (widget.id.includes('queue') || widget.id.includes('pending')) {
          return value > 5 ? 'text-orange-600' : 'text-blue-600';
        }
        return 'text-blue-600';
      default:
        return 'text-gray-900';
    }
  };

  return (
    <WidgetGuard widgetId={widget.id}>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">{widget.title}</h3>
          <div className="flex items-center space-x-2">
            {widget.refreshable && (
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            {widget.minimizable && (
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMinimized ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  )}
                </svg>
              </button>
            )}
          </div>
        </div>

        {!isMinimized && (
          <LoadingGuard isLoading={isLoading}>
            <ErrorGuard error={error} showRetry onRetry={handleRefresh}>
              {children || (
                widget.type === 'metric' && data ? (
                  <div>
                    <p className={`text-2xl font-bold ${getVariantStyles(data.value || data)}`}>
                      {typeof data === 'object' ? data.value : data}
                    </p>
                    {data.subtitle && (
                      <p className="text-sm text-gray-500">{data.subtitle}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500">No data available</div>
                )
              )}
            </ErrorGuard>
          </LoadingGuard>
        )}
      </div>
    </WidgetGuard>
  );
}

function MetricWidget({ title, value, subtitle, variant = 'default', refreshable, onRefresh }: MetricWidgetProps) {
  const getValueStyles = () => {
    switch (variant) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-orange-600';
      case 'danger': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {refreshable && onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>
      <p className={`text-2xl font-bold ${getValueStyles()}`}>{value}</p>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

export function DashboardLayout({ 
  children, 
  customWidgets = [], 
  showDefaultDashboard = true,
  className = "" 
}: DashboardLayoutProps) {
  const { currentInterface, getWidgetsByPriority, isLoading, error, refreshInterface } = useRoleInterface();

  if (!currentInterface) {
    return (
      <div className="p-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
          <h3 className="font-semibold text-gray-900 mb-2">Loading Dashboard...</h3>
          <p className="text-gray-500">Setting up your role-specific interface.</p>
        </div>
      </div>
    );
  }

  const widgets = getWidgetsByPriority();
  const layout = currentInterface.dashboard.layout;

  const getLayoutClasses = () => {
    switch (layout) {
      case 'single-column':
        return 'grid grid-cols-1 gap-6';
      case 'two-column':
        return 'grid grid-cols-1 md:grid-cols-2 gap-6';
      case 'three-column':
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
      case 'grid':
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6';
      default:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <ErrorGuard error={error} showRetry onRetry={refreshInterface}>
        <LoadingGuard isLoading={isLoading}>
          {/* Role-specific dashboard widgets */}
          {showDefaultDashboard && widgets.length > 0 && (
            <div className={getLayoutClasses()}>
              {widgets.map((widget) => (
                <DashboardWidget key={widget.id} widget={widget} />
              ))}
            </div>
          )}

          {/* Legacy role-specific dashboard for backward compatibility */}
          {showDefaultDashboard && widgets.length === 0 && (
            <RoleSpecificDashboard />
          )}

          {/* Custom widgets */}
          {customWidgets.length > 0 && (
            <div className={getLayoutClasses()}>
              {customWidgets.map((widget, index) => (
                <div key={index}>{widget}</div>
              ))}
            </div>
          )}

          {/* Custom children content */}
          {children && (
            <div className="mt-6">
              {children}
            </div>
          )}
        </LoadingGuard>
      </ErrorGuard>
    </div>
  );
}

interface RoleQuickActionsProps {
  className?: string;
}

export function RoleQuickActions({ className = "" }: RoleQuickActionsProps) {
  const { getVisibleNavigation } = useRoleInterface();
  const navigation = getVisibleNavigation();

  if (!navigation.quickActions || navigation.quickActions.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {navigation.quickActions.map((action) => (
        <QuickActionGuard key={action.id} actionId={action.id}>
          <button
            onClick={() => window.location.href = action.action}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <span className="mr-2" aria-hidden="true">{action.icon}</span>
            {action.label}
          </button>
        </QuickActionGuard>
      ))}
    </div>
  );
}

export { MetricWidget };