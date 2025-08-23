'use client';

import React, { useState } from 'react';
import { VerificationStatus, SyncStatus, type RapidAssessment } from '@dms/shared';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@dms/shared';
import { FeedbackViewer } from './FeedbackViewer';

interface AssessmentStatusCardProps {
  assessment: RapidAssessment;
  showPriorityIndicator?: boolean;
  onViewDetails?: () => void;
  onResubmit?: () => void;
  className?: string;
}

type PriorityLevel = 'urgent' | 'moderate' | 'normal';

export const AssessmentStatusCard: React.FC<AssessmentStatusCardProps> = ({
  assessment,
  showPriorityIndicator = true,
  onViewDetails,
  onResubmit,
  className = '',
}) => {
  const [showFeedback, setShowFeedback] = useState(false);

  // Determine priority level based on status and age
  const getPriorityLevel = (): PriorityLevel => {
    if (assessment.verificationStatus === VerificationStatus.REJECTED) {
      return 'urgent';
    }
    
    if (assessment.verificationStatus === VerificationStatus.PENDING) {
      const daysSinceSubmission = (Date.now() - new Date(assessment.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceSubmission > 7) {
        return 'urgent';
      }
      if (daysSinceSubmission > 3) {
        return 'moderate';
      }
    }
    
    return 'normal';
  };

  const getPriorityIndicator = (priority: PriorityLevel) => {
    const baseClass = 'w-3 h-3 rounded-full flex-shrink-0';
    switch (priority) {
      case 'urgent':
        return `${baseClass} bg-red-500`;
      case 'moderate':
        return `${baseClass} bg-yellow-500`;
      case 'normal':
        return `${baseClass} bg-gray-300`;
    }
  };

  const getVerificationStatusBadge = (status: VerificationStatus) => {
    const baseClasses = 'px-2 py-1 text-xs font-semibold rounded-full flex items-center space-x-1';
    
    switch (status) {
      case VerificationStatus.PENDING:
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
            <span>Pending</span>
          </span>
        );
      case VerificationStatus.VERIFIED:
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            <span>✓</span>
            <span>Verified</span>
          </span>
        );
      case VerificationStatus.AUTO_VERIFIED:
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            <span>✓</span>
            <span>Auto-Verified</span>
          </span>
        );
      case VerificationStatus.REJECTED:
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            <span>⚠</span>
            <span>Rejected</span>
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            <span>Unknown</span>
          </span>
        );
    }
  };

  const getSyncStatusBadge = (status: SyncStatus) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    
    switch (status) {
      case SyncStatus.SYNCED:
        return `${baseClasses} bg-green-100 text-green-800`;
      case SyncStatus.PENDING:
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case SyncStatus.SYNCING:
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case SyncStatus.FAILED:
        return `${baseClasses} bg-red-100 text-red-800`;
      case SyncStatus.CONFLICT:
        return `${baseClasses} bg-purple-100 text-purple-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getAssessmentIcon = (type: string) => {
    switch (type) {
      case 'HEALTH':
        return '🏥';
      case 'WASH':
        return '💧';
      case 'SHELTER':
        return '🏠';
      case 'FOOD':
        return '🍽️';
      case 'SECURITY':
        return '🛡️';
      case 'POPULATION':
        return '👥';
      case 'PRELIMINARY':
        return '🚨';
      default:
        return '📋';
    }
  };

  const priority = getPriorityLevel();
  const hasActions = assessment.verificationStatus === VerificationStatus.REJECTED || onViewDetails;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all ${className}`}>
      <div className="p-6 space-y-4">
        {/* Header with priority indicator */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {showPriorityIndicator && (
              <div className={getPriorityIndicator(priority)} />
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{getAssessmentIcon(assessment.type)}</span>
                <h3 className="text-lg font-medium text-gray-900">
                  {assessment.type} Assessment
                </h3>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                by {assessment.assessorName}
              </p>
            </div>
          </div>
        </div>

        {/* Assessment details */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Assessment Date:</span>
              <span className="font-medium">{new Date(assessment.date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Submitted:</span>
              <span className="font-medium">{formatDateTime(new Date(assessment.createdAt))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Updated:</span>
              <span className="font-medium">{formatDateTime(new Date(assessment.updatedAt))}</span>
            </div>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          {getVerificationStatusBadge(assessment.verificationStatus)}
          <span className={getSyncStatusBadge(assessment.syncStatus)}>
            {assessment.syncStatus}
          </span>
          {assessment.mediaAttachments && assessment.mediaAttachments.length > 0 && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
              📎 {assessment.mediaAttachments.length} files
            </span>
          )}
        </div>

        {/* Feedback section for rejected assessments */}
        {assessment.verificationStatus === VerificationStatus.REJECTED && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-900 mb-1">
                  Assessment Rejected
                </h4>
                <p className="text-sm text-red-700">
                  This assessment requires attention. Click &ldquo;View Feedback&rdquo; to see coordinator comments.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFeedback(true)}
                className="ml-2 text-red-700 border-red-200 hover:bg-red-100"
              >
                View Feedback
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {hasActions && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewDetails}
                className="flex-1"
              >
                View Details
              </Button>
            )}
            {assessment.verificationStatus === VerificationStatus.REJECTED && onResubmit && (
              <Button
                size="sm"
                onClick={onResubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Resubmit
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Feedback modal */}
      {showFeedback && assessment.verificationStatus === VerificationStatus.REJECTED && (
        <FeedbackViewer
          assessmentId={assessment.id}
          onClose={() => setShowFeedback(false)}
          onMarkAsRead={(feedbackId) => {
            // Handle marking feedback as read
            console.log('Mark feedback as read:', feedbackId);
          }}
        />
      )}
    </div>
  );
};