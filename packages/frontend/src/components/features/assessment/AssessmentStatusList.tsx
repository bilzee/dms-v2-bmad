'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { VerificationStatus, type RapidAssessment, type CoordinatorFeedback } from '@dms/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AssessmentStatusCard } from './AssessmentStatusCard';
import { useOfflineStore } from '@/stores/offline.store';

interface AssessmentStatusListProps {
  assessments?: RapidAssessment[];
  onRefresh?: () => void;
  className?: string;
}

type StatusFilter = 'ALL' | VerificationStatus;

interface StatusCounts {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  autoVerified: number;
}

export const AssessmentStatusList: React.FC<AssessmentStatusListProps> = ({
  assessments = [],
  onRefresh,
  className = '',
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const { isOnline } = useOfflineStore();

  // Calculate status counts
  const statusCounts = useMemo<StatusCounts>(() => {
    return assessments.reduce((counts, assessment) => {
      counts.total++;
      switch (assessment.verificationStatus) {
        case VerificationStatus.PENDING:
          counts.pending++;
          break;
        case VerificationStatus.VERIFIED:
          counts.verified++;
          break;
        case VerificationStatus.REJECTED:
          counts.rejected++;
          break;
        case VerificationStatus.AUTO_VERIFIED:
          counts.autoVerified++;
          break;
      }
      return counts;
    }, {
      total: 0,
      pending: 0,
      verified: 0,
      rejected: 0,
      autoVerified: 0,
    } as StatusCounts);
  }, [assessments]);

  // Filter and search assessments
  const filteredAssessments = useMemo(() => {
    let filtered = assessments;

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(assessment => assessment.verificationStatus === statusFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(assessment =>
        assessment.type.toLowerCase().includes(searchLower) ||
        assessment.assessorName.toLowerCase().includes(searchLower) ||
        assessment.id.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [assessments, statusFilter, searchTerm]);

  // Sort assessments by priority (REJECTED > PENDING > others) and date
  const sortedAssessments = useMemo(() => {
    return [...filteredAssessments].sort((a, b) => {
      // Priority order: REJECTED (highest), PENDING, others
      const priorityOrder = {
        [VerificationStatus.REJECTED]: 3,
        [VerificationStatus.PENDING]: 2,
        [VerificationStatus.VERIFIED]: 1,
        [VerificationStatus.AUTO_VERIFIED]: 1,
      };

      const aPriority = priorityOrder[a.verificationStatus] || 0;
      const bPriority = priorityOrder[b.verificationStatus] || 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Descending priority
      }

      // Same priority, sort by date (newest first)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [filteredAssessments]);

  const handleRefresh = async () => {
    if (!isOnline || loading) return;
    
    setLoading(true);
    try {
      await onRefresh?.();
    } catch (error) {
      console.error('Failed to refresh assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: StatusFilter) => {
    const baseClasses = 'px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border';
    const isActive = statusFilter === status;

    if (isActive) {
      switch (status) {
        case VerificationStatus.PENDING:
          return `${baseClasses} bg-blue-100 text-blue-800 border-blue-200`;
        case VerificationStatus.VERIFIED:
        case VerificationStatus.AUTO_VERIFIED:
          return `${baseClasses} bg-green-100 text-green-800 border-green-200`;
        case VerificationStatus.REJECTED:
          return `${baseClasses} bg-red-100 text-red-800 border-red-200`;
        case 'ALL':
          return `${baseClasses} bg-gray-100 text-gray-800 border-gray-200`;
        default:
          return `${baseClasses} bg-gray-100 text-gray-800 border-gray-200`;
      }
    }

    return `${baseClasses} bg-white text-gray-600 border-gray-200 hover:bg-gray-50`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">Assessment Status Review</h2>
          {!isOnline && (
            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
              Offline
            </span>
          )}
        </div>
        <Button
          onClick={handleRefresh}
          disabled={!isOnline || loading}
          variant="outline"
          size="sm"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Search and filters */}
      <div className="space-y-4">
        {/* Search input */}
        <div className="max-w-md">
          <Input
            type="text"
            placeholder="Search assessments by type, assessor, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Status filter buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={getStatusBadgeClass('ALL')}
          >
            All ({statusCounts.total})
          </button>
          <button
            onClick={() => setStatusFilter(VerificationStatus.PENDING)}
            className={getStatusBadgeClass(VerificationStatus.PENDING)}
          >
            <span className="w-2 h-2 bg-blue-500 rounded-full inline-block mr-2 animate-pulse"></span>
            Pending ({statusCounts.pending})
          </button>
          <button
            onClick={() => setStatusFilter(VerificationStatus.VERIFIED)}
            className={getStatusBadgeClass(VerificationStatus.VERIFIED)}
          >
            ✓ Verified ({statusCounts.verified + statusCounts.autoVerified})
          </button>
          <button
            onClick={() => setStatusFilter(VerificationStatus.REJECTED)}
            className={getStatusBadgeClass(VerificationStatus.REJECTED)}
          >
            <span className="w-2 h-2 bg-red-500 rounded-full inline-block mr-2"></span>
            Rejected ({statusCounts.rejected})
          </button>
        </div>
      </div>

      {/* Results summary */}
      <div className="text-sm text-gray-600">
        Showing {sortedAssessments.length} of {statusCounts.total} assessments
        {searchTerm && ` matching "${searchTerm}"`}
      </div>

      {/* Assessment cards grid */}
      {sortedAssessments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedAssessments.map((assessment) => (
            <AssessmentStatusCard
              key={assessment.id}
              assessment={assessment}
              showPriorityIndicator={true}
              onViewDetails={() => {
                // Handle view details - could open modal or navigate
                console.log('View details for assessment:', assessment.id);
              }}
              onResubmit={assessment.verificationStatus === VerificationStatus.REJECTED ? () => {
                // Handle resubmit for rejected assessments
                console.log('Resubmit assessment:', assessment.id);
              } : undefined}
            />
          ))}
        </div>
      ) : (
        // Empty state
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {assessments.length === 0 ? 'No assessments found' : 'No matching assessments'}
          </h3>
          <p className="text-gray-500 mb-6">
            {assessments.length === 0 
              ? 'Your submitted assessments will appear here once you create them.'
              : `Try adjusting your search criteria or filters.`
            }
          </p>
          {assessments.length === 0 && (
            <Button variant="outline" onClick={() => {
              // Navigate to create assessment
              console.log('Navigate to create assessment');
            }}>
              Create Assessment
            </Button>
          )}
        </div>
      )}

      {/* Loading skeleton for refresh */}
      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="animate-pulse bg-gray-200 h-48 rounded-lg"></div>
          ))}
        </div>
      )}
    </div>
  );
};