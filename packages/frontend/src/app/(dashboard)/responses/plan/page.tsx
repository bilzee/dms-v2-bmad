'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ResponseType } from '@dms/shared';
import { ResponsePlanningForm } from '@/components/features/response/ResponsePlanningForm';
import { ResponsePlanningErrorBoundary } from '@/components/features/response/ResponsePlanningErrorBoundary';
import { useResponseStore } from '@/stores/response.store';
import { useOffline } from '@/hooks/useOffline';
import { useOfflineStore } from '@/stores/offline.store';
import { Button } from '@/components/ui/button';

export default function ResponsePlanningPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get initial values from URL parameters
  const initialResponseType = (searchParams?.get('type') as ResponseType) || ResponseType.HEALTH;
  const initialEntityId = searchParams?.get('entityId') || undefined;
  const initialAssessmentId = searchParams?.get('assessmentId') || undefined;

  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [createdPlanId, setCreatedPlanId] = useState<string | null>(null);

  const { error, clearError, loadPlanningData } = useResponseStore();

  // Load planning data on mount
  useEffect(() => {
    loadPlanningData();
  }, [loadPlanningData]);

  // Handle successful plan creation
  const handlePlanSaved = (plan: any) => {
    setIsCreatingPlan(false);
    setCreatedPlanId(plan.id);
    
    // Show success message and redirect after delay
    setTimeout(() => {
      router.push(`/responses?created=${plan.id}`);
    }, 2000);
  };

  // Handle cancellation
  const handleCancel = () => {
    router.back();
  };

  if (createdPlanId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✅</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Response Plan Created!
          </h2>
          <p className="text-gray-600 mb-6">
            Your response plan has been successfully created and added to the sync queue.
          </p>
          <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            Redirecting to responses list...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Response Plan</h1>
          <p className="text-gray-600 mt-2">
            Plan and coordinate response delivery while en route to affected entities
          </p>
        </div>

        {/* Global Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-red-500 text-lg">⚠️</span>
                <div>
                  <h3 className="font-medium text-red-800">Error</h3>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="text-red-600 hover:text-red-800"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Planning Progress Indicator */}
        <div className="mb-8 bg-white rounded-lg border p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <span className="font-medium text-gray-900">Plan Response</span>
            </div>
            <div className="flex-1 h-px bg-gray-200"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <span className="text-gray-500">Execute & Deliver</span>
            </div>
            <div className="flex-1 h-px bg-gray-200"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <span className="text-gray-500">Verify & Report</span>
            </div>
          </div>
        </div>

        {/* Offline Status Indicator */}
        <div className="mb-6">
          <OfflineStatusBanner />
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6">
            <ResponsePlanningErrorBoundary>
              <ResponsePlanningForm
                initialResponseType={initialResponseType}
                initialEntityId={initialEntityId}
                initialAssessmentId={initialAssessmentId}
                onSave={handlePlanSaved}
                onCancel={handleCancel}
              />
            </ResponsePlanningErrorBoundary>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <span className="text-blue-500 text-xl flex-shrink-0">💡</span>
            <div>
              <h3 className="font-medium text-blue-900 mb-2">Planning Tips</h3>
              <div className="text-blue-800 text-sm space-y-1">
                <p>• Select an affected entity first to enable GPS-based travel time estimation</p>
                <p>• Link related assessments to get context-aware item recommendations</p>
                <p>• Use item templates for quick planning based on response type</p>
                <p>• Your plan will be auto-saved every 10 seconds to prevent data loss</p>
                <p>• Plans created offline will sync automatically when connectivity is restored</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Offline Status Banner Component - FIXED
function OfflineStatusBanner() {
  const { isOffline } = useOffline();
  const queue = useOfflineStore(state => state.queue);

  if (!isOffline) {
    return (
      <div data-testid="offline-banner" className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>Online - Changes will be synced in real-time</span>
      </div>
    );
  }

  return (
    <div data-testid="offline-banner" className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
      <span>Offline - Changes saved locally ({queue.length} items will sync when connected)</span>
    </div>
  );
}