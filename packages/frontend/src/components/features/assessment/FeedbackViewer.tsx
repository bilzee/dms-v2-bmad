'use client';

import React, { useState, useEffect } from 'react';
import { type CoordinatorFeedback } from '@dms/shared';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@dms/shared';
import { useOfflineStore } from '@/stores/offline.store';

interface FeedbackViewerProps {
  assessmentId: string;
  onClose: () => void;
  onMarkAsRead: (feedbackId: string) => void;
  className?: string;
}

export const FeedbackViewer: React.FC<FeedbackViewerProps> = ({
  assessmentId,
  onClose,
  onMarkAsRead,
  className = '',
}) => {
  const [feedbackList, setFeedbackList] = useState<CoordinatorFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOnline } = useOfflineStore();

  // Load feedback data
  useEffect(() => {
    loadFeedback();
  }, [assessmentId]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock feedback data for now - replace with actual API call
      // const response = await fetch(`/api/v1/assessments/${assessmentId}/feedback`);
      // const data = await response.json();
      
      // Mock data for demonstration
      const mockFeedback: CoordinatorFeedback[] = [
        {
          id: 'feedback-1',
          assessmentId,
          coordinatorId: 'coord-123',
          coordinatorName: 'Sarah Johnson',
          reason: 'DATA_QUALITY',
          comments: 'The population count seems inconsistent with the household count. Please verify the numbers and ensure they align with standard ratios.',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          isRead: false,
        },
        {
          id: 'feedback-2',
          assessmentId,
          coordinatorId: 'coord-456',
          coordinatorName: 'Michael Chen',
          reason: 'MISSING_INFO',
          comments: 'GPS coordinates are missing for this assessment. Please ensure location data is captured for accurate mapping.',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          isRead: false,
        },
      ];

      setFeedbackList(mockFeedback);
    } catch (err) {
      console.error('Failed to load feedback:', err);
      setError(isOnline 
        ? 'Failed to load feedback. Please try again.' 
        : 'Feedback temporarily unavailable. Check connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (feedbackId: string) => {
    try {
      // Update local state immediately
      setFeedbackList(prev => 
        prev.map(feedback => 
          feedback.id === feedbackId 
            ? { ...feedback, isRead: true }
            : feedback
        )
      );

      // Call parent callback
      onMarkAsRead(feedbackId);

      // In a real implementation, this would make an API call
      // await fetch(`/api/v1/assessments/${assessmentId}/feedback/${feedbackId}/read`, {
      //   method: 'PUT'
      // });
    } catch (err) {
      console.error('Failed to mark feedback as read:', err);
      // Revert local state change on error
      setFeedbackList(prev => 
        prev.map(feedback => 
          feedback.id === feedbackId 
            ? { ...feedback, isRead: false }
            : feedback
        )
      );
    }
  };

  const getFeedbackReasonLabel = (reason: CoordinatorFeedback['reason']) => {
    switch (reason) {
      case 'DATA_QUALITY':
        return { label: 'Data Quality Issue', color: 'bg-orange-100 text-orange-800' };
      case 'MISSING_INFO':
        return { label: 'Missing Information', color: 'bg-blue-100 text-blue-800' };
      case 'VALIDATION_ERROR':
        return { label: 'Validation Error', color: 'bg-red-100 text-red-800' };
      case 'OTHER':
        return { label: 'Other', color: 'bg-gray-100 text-gray-800' };
      default:
        return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getFeedbackReasonIcon = (reason: CoordinatorFeedback['reason']) => {
    switch (reason) {
      case 'DATA_QUALITY':
        return '📊';
      case 'MISSING_INFO':
        return '❓';
      case 'VALIDATION_ERROR':
        return '⚠️';
      case 'OTHER':
        return '💬';
      default:
        return '💬';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">
                Coordinator Feedback
              </h2>
              {!isOnline && (
                <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                  Offline
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {loading && (
              <div className="space-y-4">
                {[...Array(2)].map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-red-500">⚠️</span>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadFeedback}
                  className="mt-2 text-red-700 border-red-200 hover:bg-red-100"
                >
                  Retry
                </Button>
              </div>
            )}

            {!loading && !error && feedbackList.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">💬</div>
                <p className="text-gray-500">No feedback available for this assessment.</p>
              </div>
            )}

            {!loading && !error && feedbackList.length > 0 && (
              <div className="space-y-4">
                {feedbackList
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((feedback) => {
                    const reasonInfo = getFeedbackReasonLabel(feedback.reason);
                    return (
                      <div
                        key={feedback.id}
                        className={`p-4 border rounded-lg transition-all ${
                          feedback.isRead 
                            ? 'bg-gray-50 border-gray-200' 
                            : 'bg-white border-blue-200 shadow-sm'
                        }`}
                      >
                        {/* Feedback header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{getFeedbackReasonIcon(feedback.reason)}</span>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-medium text-gray-900">
                                  {feedback.coordinatorName}
                                </h3>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${reasonInfo.color}`}>
                                  {reasonInfo.label}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500">
                                {formatDateTime(new Date(feedback.createdAt))}
                              </p>
                            </div>
                          </div>
                          {!feedback.isRead && (
                            <div className="flex items-center space-x-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkAsRead(feedback.id)}
                                className="text-blue-700 border-blue-200 hover:bg-blue-50"
                              >
                                Mark as Read
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Feedback content */}
                        <div className="prose prose-sm max-w-none">
                          <p className="text-gray-700 leading-relaxed">
                            {feedback.comments}
                          </p>
                        </div>

                        {/* Read status */}
                        {feedback.isRead && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <span className="text-xs text-gray-500">✓ Read</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              {feedbackList.length > 0 && (
                <>
                  {feedbackList.filter(f => !f.isRead).length} unread feedback items
                </>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {feedbackList.some(f => !f.isRead) && (
                <Button
                  onClick={() => {
                    feedbackList
                      .filter(f => !f.isRead)
                      .forEach(f => handleMarkAsRead(f.id));
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Mark All as Read
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};