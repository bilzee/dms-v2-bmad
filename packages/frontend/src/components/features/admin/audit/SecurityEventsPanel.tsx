// components/features/admin/audit/SecurityEventsPanel.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  Shield, 
  Eye, 
  CheckCircle,
  Clock,
  XCircle,
  ChevronLeft, 
  ChevronRight,
  FileText,
  User,
  Calendar
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
// Mock types for security events (shared types not available)
interface SecurityEvent {
  id: string;
  type: string;
  eventType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedAt: string;
  investigationStatus: 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  description: string;
  source: string;
  affectedResource: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  investigatorNotes?: string;
  metadata?: Record<string, any>;
}

interface SecurityEventResponse {
  success: boolean;
  message?: string;
  data: {
    events: SecurityEvent[];
    totalCount: number;
    pagination: {
      page: number;
      pageSize: number;
      totalPages: number;
    };
  };
}

interface SecurityEventsPanelProps {
  events?: SecurityEvent[];
  showFilters?: boolean;
  showPagination?: boolean;
  maxHeight?: string;
  className?: string;
}

interface FilterState {
  search: string;
  severity: string;
  investigationStatus: string;
  eventType: string;
  dateRange: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

export function SecurityEventsPanel({
  events: providedEvents,
  showFilters = false,
  showPagination = false,
  maxHeight,
  className
}: SecurityEventsPanelProps) {
  const { toast } = useToast();
  
  // State management
  const [events, setEvents] = useState<SecurityEvent[]>(providedEvents || []);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    severity: '',
    investigationStatus: '',
    eventType: '',
    dateRange: '24h',
    sortBy: 'detectedAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 50,
    total: 0
  });

  // Load security events
  const loadEvents = useCallback(async () => {
    if (providedEvents) return;

    try {
      setIsLoading(true);

      const searchParams = new URLSearchParams();
      
      if (filters.search) searchParams.set('search', filters.search);
      if (filters.severity) searchParams.set('severity', filters.severity);
      if (filters.investigationStatus) searchParams.set('investigationStatus', filters.investigationStatus);
      if (filters.eventType) searchParams.set('eventType', filters.eventType);
      if (filters.dateRange) searchParams.set('timeRange', filters.dateRange);
      if (filters.sortBy) searchParams.set('sortBy', filters.sortBy);
      if (filters.sortOrder) searchParams.set('sortOrder', filters.sortOrder);
      
      if (showPagination) {
        searchParams.set('page', pagination.page.toString());
        searchParams.set('limit', pagination.limit.toString());
      }

      const response = await fetch(`/api/v1/admin/audit/security-events?${searchParams}`);
      const data: SecurityEventResponse = await response.json();

      if (data.success) {
        setEvents(data.data.events);
        setPagination(prev => ({
          ...prev,
          total: data.data.totalCount
        }));
      } else {
        throw new Error(data.message || 'Failed to load security events');
      }
    } catch (error) {
      console.error('Failed to load security events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load security events',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, providedEvents, showPagination, toast]);

  // Load events on mount and filter changes
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (showPagination) {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Update investigation status
  const handleStatusUpdate = async (eventId: string, status: string, notes?: string) => {
    try {
      const response = await fetch(`/api/v1/admin/audit/security-events/${eventId}/investigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          investigationStatus: status,
          investigatorNotes: notes
        })
      });

      if (response.ok) {
        toast({
          title: 'Status Updated',
          description: 'Security event investigation status updated successfully'
        });
        
        // Refresh events
        loadEvents();
        
        // Close dialog if open
        setSelectedEvent(null);
        setInvestigationNotes('');
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update investigation status',
        variant: 'destructive'
      });
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  // Get severity badge
  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return { variant: 'destructive' as const, icon: <AlertTriangle className="h-3 w-3" /> };
      case 'high':
        return { variant: 'destructive' as const, icon: <AlertTriangle className="h-3 w-3" /> };
      case 'medium':
        return { variant: 'secondary' as const, icon: <Shield className="h-3 w-3" /> };
      case 'low':
        return { variant: 'outline' as const, icon: <Shield className="h-3 w-3" /> };
      default:
        return { variant: 'default' as const, icon: <Shield className="h-3 w-3" /> };
    }
  };

  // Get investigation status badge
  const getInvestigationStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved':
        return { variant: 'default' as const, icon: <CheckCircle className="h-3 w-3 text-green-500" />, color: 'text-green-600' };
      case 'investigating':
        return { variant: 'secondary' as const, icon: <Clock className="h-3 w-3 text-yellow-500" />, color: 'text-yellow-600' };
      case 'dismissed':
        return { variant: 'outline' as const, icon: <XCircle className="h-3 w-3 text-gray-500" />, color: 'text-gray-600' };
      default:
        return { variant: 'destructive' as const, icon: <AlertTriangle className="h-3 w-3" />, color: 'text-red-600' };
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
              Security Event Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Severity */}
              <Select value={filters.severity} onValueChange={(value) => handleFilterChange('severity', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Severities</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Investigation Status */}
              <Select value={filters.investigationStatus} onValueChange={(value) => handleFilterChange('investigationStatus', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="DISMISSED">Dismissed</SelectItem>
                </SelectContent>
              </Select>

              {/* Event Type */}
              <Select value={filters.eventType} onValueChange={(value) => handleFilterChange('eventType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="FAILED_LOGIN">Failed Login</SelectItem>
                  <SelectItem value="SUSPICIOUS_ACTIVITY">Suspicious Activity</SelectItem>
                  <SelectItem value="DATA_BREACH">Data Breach</SelectItem>
                  <SelectItem value="UNAUTHORIZED_ACCESS">Unauthorized Access</SelectItem>
                  <SelectItem value="MALICIOUS_REQUEST">Malicious Request</SelectItem>
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events Table */}
      <div 
        className="border rounded-lg"
        style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>User</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Detected</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mr-2"></div>
                    Loading security events...
                  </div>
                </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No security events found
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => {
                const timestamp = formatTimestamp(event.detectedAt);
                const severityBadge = getSeverityBadge(event.severity);
                const statusBadge = getInvestigationStatusBadge(event.investigationStatus);
                
                return (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Badge variant={severityBadge.variant} className="flex items-center gap-1 w-fit">
                        {severityBadge.icon}
                        {event.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{event.eventType}</span>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={event.description}>
                        {event.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {event.userId || 'Anonymous'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{event.ipAddress}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadge.variant} className="flex items-center gap-1 w-fit">
                        {statusBadge.icon}
                        {event.investigationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{timestamp.date}</div>
                        <div className="text-muted-foreground">{timestamp.time}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedEvent(event);
                                setInvestigationNotes(event.investigatorNotes || '');
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                Security Event Details
                              </DialogTitle>
                            </DialogHeader>
                            {selectedEvent && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">Event Type</label>
                                    <p className="text-sm text-muted-foreground">{selectedEvent.eventType}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Severity</label>
                                    <div className="mt-1">
                                      <Badge variant={getSeverityBadge(selectedEvent.severity).variant}>
                                        {selectedEvent.severity}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">User</label>
                                    <p className="text-sm text-muted-foreground">{selectedEvent.userId || 'Anonymous'}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">IP Address</label>
                                    <p className="text-sm text-muted-foreground font-mono">{selectedEvent.ipAddress}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">User Agent</label>
                                    <p className="text-sm text-muted-foreground truncate" title={selectedEvent.userAgent || ''}>
                                      {selectedEvent.userAgent || 'Unknown'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Detected At</label>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(selectedEvent.detectedAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-sm font-medium">Description</label>
                                  <p className="text-sm text-muted-foreground mt-1">{selectedEvent.description}</p>
                                </div>

                                {selectedEvent.details && (
                                  <div>
                                    <label className="text-sm font-medium">Details</label>
                                    <pre className="text-sm text-muted-foreground mt-1 bg-gray-50 p-2 rounded overflow-auto max-h-32">
                                      {JSON.stringify(selectedEvent.details, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                <div>
                                  <label className="text-sm font-medium">Investigation Notes</label>
                                  <Textarea
                                    value={investigationNotes}
                                    onChange={(e) => setInvestigationNotes(e.target.value)}
                                    placeholder="Add investigation notes..."
                                    className="mt-1"
                                  />
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate(selectedEvent.id, 'INVESTIGATING', investigationNotes)}
                                  >
                                    Mark as Investigating
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStatusUpdate(selectedEvent.id, 'RESOLVED', investigationNotes)}
                                  >
                                    Mark as Resolved
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleStatusUpdate(selectedEvent.id, 'DISMISSED', investigationNotes)}
                                  >
                                    Dismiss
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        {event.investigationStatus === 'PENDING' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(event.id, 'INVESTIGATING')}
                          >
                            Investigate
                          </Button>
                        )}
                      </div>
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
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} events
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