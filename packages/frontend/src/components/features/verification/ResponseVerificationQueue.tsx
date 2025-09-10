'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Filter, Search, RefreshCw, Eye, CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { 
  useVerificationStore, 
  useResponseQueueData, 
  useResponseQueueFilters, 
  useResponseQueueSelection 
} from '@/stores/verification.store';
import { 
  StatusBadge,
  NotificationCounter,
  PriorityIndicator
} from './VerificationStatusIndicators';
import ResponseApproval from './ResponseApproval';
import ResponseRejection from './ResponseRejection';
import BatchResponseApprovalRejection from './BatchResponseApprovalRejection';
import FeedbackNotification from './FeedbackNotification';
import { VerificationStamp } from './VerificationStamp';
import { ResponseType, VerificationStatus, ResponseStatus } from '@dms/shared';
import { format } from 'date-fns';

interface ResponseVerificationQueueProps {
  className?: string;
  onPreviewResponse?: (responseId: string) => void;
  onBatchAction?: (action: 'APPROVE' | 'REJECT', responseIds: string[]) => void;
}

// Response Type Indicator Component
const ResponseTypeIndicator: React.FC<{ type: ResponseType }> = ({ type }) => {
  const getTypeConfig = (type: ResponseType) => {
    switch (type) {
      case ResponseType.HEALTH:
        return { color: 'bg-red-100 text-red-800 border-red-200', icon: '🏥', label: 'Health' };
      case ResponseType.WASH:
        return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '💧', label: 'WASH' };
      case ResponseType.SHELTER:
        return { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '🏠', label: 'Shelter' };
      case ResponseType.FOOD:
        return { color: 'bg-green-100 text-green-800 border-green-200', icon: '🍽️', label: 'Food' };
      case ResponseType.SECURITY:
        return { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '🛡️', label: 'Security' };
      case ResponseType.POPULATION:
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '👥', label: 'Population' };
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: '❓', label: 'Unknown' };
    }
  };

  const config = getTypeConfig(type);
  
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', config.color)}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  );
};

// Response Status Display Component
const ResponseStatusDisplay: React.FC<{
  verificationStatus: VerificationStatus;
  responseType: ResponseType;
  deliveryStatus: ResponseStatus;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  requiresAttention: boolean;
  feedbackCount: number;
  lastFeedbackAt?: Date;
  compact?: boolean;
}> = ({
  verificationStatus,
  responseType,
  deliveryStatus,
  priority,
  requiresAttention,
  feedbackCount,
  lastFeedbackAt,
  compact = false
}) => {
  return (
    <div className={cn('flex items-center gap-2', compact && 'flex-col items-start gap-1')}>
      <StatusBadge status={verificationStatus} />
      
      {!compact && (
        <>
          <Badge variant="outline" className="text-xs">
            {deliveryStatus}
          </Badge>
          
          {requiresAttention && (
            <Badge variant="destructive" className="text-xs">
              Attention Required
            </Badge>
          )}
          
          {feedbackCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {feedbackCount} feedback{feedbackCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </>
      )}
    </div>
  );
};

export const ResponseVerificationQueue: React.FC<ResponseVerificationQueueProps> = ({
  className,
  onPreviewResponse,
  onBatchAction,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);

  const { responseQueue, responseQueueStats, pagination, isLoading, error } = useResponseQueueData();
  const { filters, sortBy, sortOrder, setFilters, setSorting } = useResponseQueueFilters();
  const { selectedResponseIds, toggleResponseSelection, selectAllVisible, clearResponseSelection, getSelectedCount } = useResponseQueueSelection();
  const { fetchResponseQueue, setResponsePage, openResponsePreview } = useVerificationStore();

  // Initialize queue data on mount
  React.useEffect(() => {
    fetchResponseQueue();
  }, [fetchResponseQueue]);

  // Handle search with debounce
  const debouncedSearch = React.useMemo(
    () => debounce((term: string) => {
      // In a real implementation, this would filter by responder name, entity name, etc.
      console.log('Searching for:', term);
    }, 300),
    []
  );

  React.useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const handleSort = (column: 'priority' | 'date' | 'type' | 'responder') => {
    const newOrder = sortBy === column && sortOrder === 'desc' ? 'asc' : 'desc';
    setSorting(column, newOrder);
  };

  const handleSelectAll = () => {
    if (selectedResponseIds.length === responseQueue.length) {
      clearResponseSelection();
    } else {
      selectAllVisible();
    }
  };

  const handlePreview = (responseId: string) => {
    const response = responseQueue.find(item => item.response.id === responseId)?.response;
    if (response) {
      openResponsePreview(response);
      onPreviewResponse?.(responseId);
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return '↕️';
    return sortOrder === 'desc' ? '↓' : '↑';
  };

  if (error) {
    return (
      <Card className={cn('border-destructive', className)}>
        <CardContent className="flex items-center gap-2 p-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">Failed to load response verification queue: {error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchResponseQueue()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Queue Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Response Verification Queue</h2>
          <div className="flex items-center gap-2">
            <NotificationCounter count={responseQueueStats.totalPending} type="pending" />
            <NotificationCounter count={responseQueueStats.requiresAttention} type="attention" />
            <NotificationCounter count={responseQueueStats.highPriority} type="high-priority" />
          </div>
        </div>
        <Button variant="outline" onClick={() => fetchResponseQueue()} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by responder, location, or response details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Response Type</label>
                <Select
                  value={filters.responseTypes?.[0] || 'all'}
                  onValueChange={(value) => {
                    if (value === 'all') {
                      setFilters({ responseTypes: undefined });
                    } else {
                      setFilters({ responseTypes: [value as ResponseType] });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.values(ResponseType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Verification Status</label>
                <Select
                  value={filters.verificationStatus?.[0] || 'all'}
                  onValueChange={(value) => {
                    if (value === 'all') {
                      setFilters({ verificationStatus: undefined });
                    } else {
                      setFilters({ verificationStatus: [value as VerificationStatus] });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.values(VerificationStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Delivery Status</label>
                <Select
                  value={filters.deliveryStatus?.[0] || 'all'}
                  onValueChange={(value) => {
                    if (value === 'all') {
                      setFilters({ deliveryStatus: undefined });
                    } else {
                      setFilters({ deliveryStatus: [value as ResponseStatus] });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.values(ResponseStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={() => setFilters({})}>
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Actions */}
      {getSelectedCount() > 0 && (
        <BatchResponseApprovalRejection
          selectedResponseIds={selectedResponseIds}
          onBatchComplete={() => {
            // Refresh queue after batch operation
            fetchResponseQueue();
          }}
          onClearSelection={clearResponseSelection}
        />
      )}

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Verification Queue ({pagination.totalCount} responses)</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs"
              >
                {selectedResponseIds.length === responseQueue.length ? (
                  <>
                    <Square className="h-3 w-3 mr-1" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-3 w-3 mr-1" />
                    Select All
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : responseQueue.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No responses in verification queue</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 w-12">
                      <Checkbox
                        checked={selectedResponseIds.length === responseQueue.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th
                      className="text-left p-4 cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleSort('priority')}
                    >
                      <div className="flex items-center gap-1">
                        Priority {getSortIcon('priority')}
                      </div>
                    </th>
                    <th
                      className="text-left p-4 cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center gap-1">
                        Type {getSortIcon('type')}
                      </div>
                    </th>
                    <th
                      className="text-left p-4 cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-1">
                        Date {getSortIcon('date')}
                      </div>
                    </th>
                    <th
                      className="text-left p-4 cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleSort('responder')}
                    >
                      <div className="flex items-center gap-1">
                        Responder {getSortIcon('responder')}
                      </div>
                    </th>
                    <th className="text-left p-4">Location</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {responseQueue.map((item) => (
                    <tr
                      key={item.response.id}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4">
                        <Checkbox
                          checked={selectedResponseIds.includes(item.response.id)}
                          onCheckedChange={() => toggleResponseSelection(item.response.id)}
                        />
                      </td>
                      <td className="p-4">
                        <PriorityIndicator priority={item.priority} />
                      </td>
                      <td className="p-4">
                        <ResponseTypeIndicator type={item.response.responseType} />
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          {format(new Date(item.response.plannedDate), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(item.response.plannedDate), 'HH:mm')}
                        </div>
                        {item.response.deliveredDate && (
                          <div className="text-xs text-green-600">
                            Delivered: {format(new Date(item.response.deliveredDate), 'MMM dd')}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium">{item.responderName}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium">{item.affectedEntity.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.affectedEntity.lga}, {item.affectedEntity.ward}
                        </div>
                      </td>
                      <td className="p-4">
                        <ResponseStatusDisplay
                          verificationStatus={item.response.verificationStatus}
                          responseType={item.response.responseType}
                          deliveryStatus={item.response.status}
                          priority={item.priority}
                          requiresAttention={item.requiresAttention}
                          feedbackCount={item.feedbackCount}
                          lastFeedbackAt={item.lastFeedbackAt}
                          compact
                        />
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Response Actions for PENDING responses */}
                          {item.response.verificationStatus === 'PENDING' && (
                            <>
                              <ResponseApproval
                                response={item.response}
                                onApprovalComplete={(responseId) => {
                                  fetchResponseQueue();
                                  clearResponseSelection();
                                }}
                              />
                              <ResponseRejection
                                response={item.response}
                                onRejectionComplete={(responseId) => {
                                  fetchResponseQueue();
                                  clearResponseSelection();
                                }}
                              />
                            </>
                          )}

                          {/* Verification Stamp for VERIFIED responses */}
                          {item.response.verificationStatus === 'VERIFIED' && (
                            <VerificationStamp 
                              responseId={item.response.id}
                              verificationId={`verification-${item.response.id}`}
                              verifiedAt={new Date()}
                              verifiedBy={'System'}
                              verificationNotes={'Verified'}
                            />
                          )}
                          
                          {/* Feedback Notifications */}
                          <FeedbackNotification 
                            feedback={[]} // This would be populated from API call
                            assessmentId={item.response.id}
                          />
                          
                          {/* Preview Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(item.response.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{' '}
            {pagination.totalCount} responses
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => setResponsePage(pagination.page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setResponsePage(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}