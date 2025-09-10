// components/features/admin/audit/UserActivityTable.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  User,
  Globe,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
// Mock types for user activity (shared types not available)
interface SystemActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  action: string;
  resource: string;
  eventType: 'USER_ACTION' | 'SYSTEM_EVENT' | 'SECURITY_EVENT' | 'API_ACCESS' | 'DATA_CHANGE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  module: string;
  details: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  statusCode?: number;
  endpoint?: string;
  responseTime?: number;
}

interface AuditActivityResponse {
  success: boolean;
  message?: string;
  data?: {
    activities: SystemActivityLog[];
    totalCount: number;
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

interface UserActivityTableProps {
  activities?: SystemActivityLog[];
  showFilters?: boolean;
  showPagination?: boolean;
  maxHeight?: string;
  className?: string;
}

interface FilterState {
  search: string;
  userId: string;
  eventType: string;
  module: string;
  dateRange: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

export function UserActivityTable({
  activities: providedActivities,
  showFilters = false,
  showPagination = false,
  maxHeight,
  className
}: UserActivityTableProps) {
  const { toast } = useToast();
  
  // State management
  const [activities, setActivities] = useState<SystemActivityLog[]>(providedActivities || []);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    userId: '',
    eventType: '',
    module: '',
    dateRange: '24h',
    sortBy: 'timestamp',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 50,
    total: 0
  });

  // Load activities with filters and pagination
  const loadActivities = useCallback(async () => {
    if (providedActivities) return; // Don't fetch if activities are provided

    try {
      setIsLoading(true);

      const searchParams = new URLSearchParams();
      
      if (filters.search) searchParams.set('search', filters.search);
      if (filters.userId) searchParams.set('userId', filters.userId);
      if (filters.eventType) searchParams.set('eventType', filters.eventType);
      if (filters.module) searchParams.set('module', filters.module);
      if (filters.dateRange) searchParams.set('timeRange', filters.dateRange);
      if (filters.sortBy) searchParams.set('sortBy', filters.sortBy);
      if (filters.sortOrder) searchParams.set('sortOrder', filters.sortOrder);
      
      if (showPagination) {
        searchParams.set('page', pagination.page.toString());
        searchParams.set('limit', pagination.limit.toString());
      }

      const response = await fetch(`/api/v1/admin/audit/activity?${searchParams}`);
      const data: AuditActivityResponse = await response.json();

      if (data.success && data.data) {
        setActivities(data.data.activities);
        setPagination(prev => ({
          ...prev,
          total: data.data?.totalCount || 0
        }));
      } else {
        throw new Error(data.message || 'Failed to load activities');
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user activities',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, providedActivities, showPagination, toast]);

  // Load activities on mount and filter changes
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (showPagination) {
      setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    }
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Format timestamp
  const formatTimestamp = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  // Get event type badge variant
  const getEventTypeBadge = (eventType: string) => {
    switch (eventType) {
      case 'LOGIN':
        return { variant: 'default' as const, icon: <User className="h-3 w-3" /> };
      case 'LOGOUT':
        return { variant: 'secondary' as const, icon: <User className="h-3 w-3" /> };
      case 'API_ACCESS':
        return { variant: 'outline' as const, icon: <Globe className="h-3 w-3" /> };
      case 'DATA_EXPORT':
        return { variant: 'default' as const, icon: <Download className="h-3 w-3" /> };
      case 'ERROR':
        return { variant: 'destructive' as const, icon: <XCircle className="h-3 w-3" /> };
      case 'SECURITY_EVENT':
        return { variant: 'destructive' as const, icon: <AlertCircle className="h-3 w-3" /> };
      default:
        return { variant: 'secondary' as const, icon: <Clock className="h-3 w-3" /> };
    }
  };

  // Get status icon
  const getStatusIcon = (statusCode?: number) => {
    if (!statusCode) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (statusCode >= 200 && statusCode < 300) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (statusCode >= 400) return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  // Export activities
  const handleExport = async () => {
    try {
      const searchParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) searchParams.set(key, value);
      });

      const response = await fetch(`/api/v1/admin/audit/export?type=user_activity&format=CSV&${searchParams}`);
      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Export Started',
          description: 'Your export is being generated. You will be notified when it is ready.',
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to start export. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* User ID */}
              <Input
                placeholder="User ID"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
              />

              {/* Event Type */}
              <Select value={filters.eventType} onValueChange={(value) => handleFilterChange('eventType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                  <SelectItem value="LOGOUT">Logout</SelectItem>
                  <SelectItem value="API_ACCESS">API Access</SelectItem>
                  <SelectItem value="DATA_EXPORT">Data Export</SelectItem>
                  <SelectItem value="ERROR">Error</SelectItem>
                  <SelectItem value="SECURITY_EVENT">Security Event</SelectItem>
                </SelectContent>
              </Select>

              {/* Module */}
              <Select value={filters.module} onValueChange={(value) => handleFilterChange('module', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Modules</SelectItem>
                  <SelectItem value="auth">Authentication</SelectItem>
                  <SelectItem value="incidents">Incidents</SelectItem>
                  <SelectItem value="resources">Resources</SelectItem>
                  <SelectItem value="sync">Sync</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range */}
              <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>

              {/* Export Button */}
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activities Table */}
      <div 
        className="border rounded-lg"
        style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Response Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mr-2"></div>
                    Loading activities...
                  </div>
                </TableCell>
              </TableRow>
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No activities found
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity) => {
                const timestamp = formatTimestamp(activity.timestamp);
                const eventBadge = getEventTypeBadge(activity.eventType);
                
                return (
                  <TableRow key={activity.id}>
                    <TableCell>
                      {getStatusIcon(activity.statusCode)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{activity.userId || 'Anonymous'}</div>
                        {activity.userEmail && (
                          <div className="text-sm text-muted-foreground">{activity.userEmail}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={eventBadge.variant} className="flex items-center gap-1 w-fit">
                        {eventBadge.icon}
                        {activity.eventType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{activity.module || 'system'}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">{activity.endpoint || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">{activity.ipAddress}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{timestamp.date}</div>
                        <div className="text-muted-foreground">{timestamp.time}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {activity.responseTime ? (
                        <span className={`text-sm ${
                          activity.responseTime > 1000 ? 'text-red-500' : 
                          activity.responseTime > 500 ? 'text-yellow-500' : 
                          'text-green-500'
                        }`}>
                          {activity.responseTime}ms
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} activities
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}