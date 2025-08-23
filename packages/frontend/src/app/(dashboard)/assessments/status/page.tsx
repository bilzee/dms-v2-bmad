'use client';

import React, { useState, useEffect } from 'react';
import { type RapidAssessment, VerificationStatus } from '@dms/shared';
import { AssessmentStatusList } from '@/components/features/assessment/AssessmentStatusList';
import { ResubmissionDialog } from '@/components/features/assessment/ResubmissionDialog';
import { useOfflineStore } from '@/stores/offline.store';

interface StatusPageState {
  assessments: RapidAssessment[];
  loading: boolean;
  error: string | null;
  showResubmissionDialog: boolean;
  selectedAssessment: RapidAssessment | null;
}

export default function AssessmentStatusPage() {
  const [state, setState] = useState<StatusPageState>({
    assessments: [],
    loading: true,
    error: null,
    showResubmissionDialog: false,
    selectedAssessment: null,
  });

  const { isOnline } = useOfflineStore();

  // Load assessments on component mount and when online status changes
  useEffect(() => {
    loadAssessments();
  }, []);

  useEffect(() => {
    if (isOnline && state.error) {
      loadAssessments(); // Retry loading when back online
    }
  }, [isOnline, state.error]);

  const loadAssessments = async (showLoading = true) => {
    try {
      if (showLoading) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      // In a real implementation, get the current user ID from auth context
      const userId = 'current-user';
      const response = await fetch(`/api/v1/assessments/status?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        assessments: data.data || [],
        loading: false,
        error: null,
      }));
    } catch (error) {
      console.error('Failed to load assessments:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: isOnline 
          ? 'Failed to load assessment status. Please try again.' 
          : 'Assessment status unavailable offline. Connect to internet to sync.',
      }));
    }
  };

  const handleRefresh = async () => {
    await loadAssessments(false); // Don't show loading spinner for refresh
  };

  const handleResubmit = (assessment: RapidAssessment) => {
    setState(prev => ({
      ...prev,
      selectedAssessment: assessment,
      showResubmissionDialog: true,
    }));
  };

  const handleResubmissionSubmit = async (data: {
    assessmentId: string;
    resubmissionNotes: string;
    acknowledgedFeedback: boolean;
  }) => {
    try {
      const response = await fetch(`/api/v1/assessments/${data.assessmentId}/resubmit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resubmissionNotes: data.resubmissionNotes,
          acknowledgedFeedback: data.acknowledgedFeedback,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Resubmission failed');
      }

      const result = await response.json();
      
      // Update the local assessment status
      setState(prev => ({
        ...prev,
        assessments: prev.assessments.map(assessment =>
          assessment.id === data.assessmentId
            ? {
                ...assessment,
                verificationStatus: VerificationStatus.PENDING,
                updatedAt: new Date(),
              }
            : assessment
        ),
        showResubmissionDialog: false,
        selectedAssessment: null,
      }));

      // Show success message
      alert(result.message || 'Assessment resubmitted successfully!');
      
      // Refresh assessments to get latest data
      await loadAssessments(false);
    } catch (error) {
      console.error('Resubmission error:', error);
      throw error; // Re-throw so the dialog can handle it
    }
  };

  const handleCloseResubmissionDialog = () => {
    setState(prev => ({
      ...prev,
      showResubmissionDialog: false,
      selectedAssessment: null,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error state */}
        {state.error && !state.loading && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <span className="text-red-500 text-lg">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error Loading Assessments</p>
                <p className="text-sm text-red-700 mt-1">{state.error}</p>
                {isOnline && (
                  <button
                    onClick={() => loadAssessments()}
                    className="mt-2 px-3 py-1 text-sm bg-red-100 text-red-800 border border-red-200 rounded hover:bg-red-200"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {state.loading && (
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-4">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="h-48 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Assessment status list */}
        {!state.loading && !state.error && (
          <AssessmentStatusList
            assessments={state.assessments}
            onRefresh={handleRefresh}
          />
        )}

        {/* Assessment status list with custom handlers */}
        {!state.loading && !state.error && (
          <div className="mt-8">
            {/* Custom grid with resubmit handler */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* This would be handled in the AssessmentStatusCard via props, but for demo we show the integration */}
            </div>
          </div>
        )}

        {/* Resubmission dialog */}
        {state.showResubmissionDialog && state.selectedAssessment && (
          <ResubmissionDialog
            assessment={state.selectedAssessment}
            onSubmit={handleResubmissionSubmit}
            onCancel={handleCloseResubmissionDialog}
          />
        )}

        {/* Empty state when no assessments and not loading */}
        {!state.loading && !state.error && state.assessments.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No Assessments Yet
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Your submitted assessments will appear here with their verification status. 
              Create your first assessment to get started.
            </p>
            <button
              onClick={() => {
                // Navigate to create assessment page
                window.location.href = '/assessments/new';
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Assessment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}