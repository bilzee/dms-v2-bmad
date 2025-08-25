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
import { useVerificationStore, useQueueData, useQueueFilters, useQueueSelection } from '@/stores/verification.store';
import { 
  AssessmentStatusDisplay, 
  NotificationCounter,
  PriorityIndicator,
  StatusBadge,
  AssessmentTypeIndicator 
} from './VerificationStatusIndicators';
import { AssessmentType, VerificationStatus } from '@dms/shared';
import { format } from 'date-fns';

interface AssessmentVerificationQueueProps {
  className?: string;
  onPreviewAssessment?: (assessmentId: string) => void;
  onBatchAction?: (action: 'APPROVE' | 'REJECT', assessmentIds: string[]) => void;
}

export const AssessmentVerificationQueue: React.FC<AssessmentVerificationQueueProps> = ({
  className,
  onPreviewAssessment,
  onBatchAction,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);

  const { queue, queueStats, pagination, isLoading, error } = useQueueData();
  const { filters, sortBy, sortOrder, setFilters, setSorting } = useQueueFilters();
  const { selectedAssessmentIds, toggleAssessmentSelection, selectAllVisible, clearSelection, getSelectedCount } = useQueueSelection();
  const { fetchQueue, setPage, openPreview } = useVerificationStore();

  // Initialize queue data on mount
  React.useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Handle search with debounce
  const debouncedSearch = React.useMemo(
    () => debounce((term: string) => {
      // In a real implementation, this would filter by assessor name, entity name, etc.
      console.log('Searching for:', term);
    }, 300),
    []
  );

  React.useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const handleSort = (column: 'priority' | 'date' | 'type' | 'assessor') => {
    const newOrder = sortBy === column && sortOrder === 'desc' ? 'asc' : 'desc';
    setSorting(column, newOrder);
  };

  const handleSelectAll = () => {
    if (selectedAssessmentIds.length === queue.length) {
      clearSelection();
    } else {
      selectAllVisible();
    }
  };

  const handlePreview = (assessmentId: string) => {
    const assessment = queue.find(item => item.assessment.id === assessmentId)?.assessment;
    if (assessment) {
      openPreview(assessment);
      onPreviewAssessment?.(assessmentId);
    }
  };

  const handleBatchApprove = () => {
    onBatchAction?.('APPROVE', selectedAssessmentIds);
  };

  const handleBatchReject = () => {
    onBatchAction?.('REJECT', selectedAssessmentIds);
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
          <p className="text-sm text-destructive">Failed to load verification queue: {error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchQueue()}>
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
          <h2 className="text-2xl font-bold">Assessment Verification Queue</h2>
          <div className="flex items-center gap-2">
            <NotificationCounter count={queueStats.totalPending} type="pending" />
            <NotificationCounter count={queueStats.requiresAttention} type="attention" />
            <NotificationCounter count={queueStats.highPriority} type="high-priority" />
          </div>
        </div>
        <Button variant="outline" onClick={() => fetchQueue()} disabled={isLoading}>
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
                placeholder="Search by assessor, location, or assessment details..."
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
                <label className="text-sm font-medium mb-2 block">Assessment Type</label>
                <Select
                  value={filters.assessmentTypes?.[0] || 'all'}
                  onValueChange={(value) => {
                    if (value === 'all') {
                      setFilters({ assessmentTypes: undefined });
                    } else {
                      setFilters({ assessmentTypes: [value as AssessmentType] });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.values(AssessmentType).map((type) => (
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
                <label className="text-sm font-medium mb-2 block">Priority</label>
                <Select
                  value={filters.priority?.[0] || 'all'}
                  onValueChange={(value) => {
                    if (value === 'all') {
                      setFilters({ priority: undefined });
                    } else {
                      setFilters({ priority: [value as 'HIGH' | 'MEDIUM' | 'LOW'] });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
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
        <Card className="border-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {getSelectedCount()} assessment{getSelectedCount() > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={clearSelection}>
                  Clear Selection
                </Button>
                <Button variant="default" onClick={handleBatchApprove}>
                  Approve Selected
                </Button>
                <Button variant="destructive" onClick={handleBatchReject}>
                  Reject Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Verification Queue ({pagination.totalCount} assessments)</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs"
              >
                {selectedAssessmentIds.length === queue.length ? (
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
          ) : queue.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No assessments in verification queue</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 w-12">
                      <Checkbox
                        checked={selectedAssessmentIds.length === queue.length}
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
                      onClick={() => handleSort('assessor')}
                    >
                      <div className="flex items-center gap-1">
                        Assessor {getSortIcon('assessor')}
                      </div>
                    </th>
                    <th className="text-left p-4">Location</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((item) => (
                    <tr
                      key={item.assessment.id}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4">
                        <Checkbox
                          checked={selectedAssessmentIds.includes(item.assessment.id)}
                          onCheckedChange={() => toggleAssessmentSelection(item.assessment.id)}
                        />
                      </td>
                      <td className="p-4">
                        <PriorityIndicator priority={item.priority} />
                      </td>
                      <td className="p-4">
                        <AssessmentTypeIndicator type={item.assessment.type} />
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          {format(new Date(item.assessment.date), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(item.assessment.date), 'HH:mm')}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium">{item.assessorName}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium">{item.affectedEntity.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.affectedEntity.lga}, {item.affectedEntity.ward}
                        </div>
                      </td>
                      <td className="p-4">
                        <AssessmentStatusDisplay
                          verificationStatus={item.assessment.verificationStatus}
                          assessmentType={item.assessment.type}
                          priority={item.priority}
                          requiresAttention={item.requiresAttention}
                          feedbackCount={item.feedbackCount}
                          lastFeedbackAt={item.lastFeedbackAt}
                          compact
                        />
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(item.assessment.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
            {pagination.totalCount} assessments
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => setPage(pagination.page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage(pagination.page + 1)}
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