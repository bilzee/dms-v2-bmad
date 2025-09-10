'use client';

import React from 'react';
import { ResponseVerificationQueue } from '@/components/features/verification/ResponseVerificationQueue';
import { BatchResponseApprovalRejection } from '@/components/features/verification/BatchResponseApprovalRejection';
import { useResponseQueueSelection, useVerificationStore } from '@/stores/verification.store';
import { toast } from '@/hooks/use-toast';

export default function ResponseVerificationQueuePage() {
  
  const { selectedResponseIds, clearResponseSelection } = useResponseQueueSelection();
  const { responseQueue, approveResponse, rejectResponse, batchApproveResponses, batchRejectResponses } = useVerificationStore();

  const handlePreviewResponse = (responseId: string) => {
    // Preview functionality is handled by the store and ResponsePreview component
    console.log('Opening preview for response:', responseId);
  };

  const handleBatchAction = (action: 'APPROVE' | 'REJECT', responseIds: string[]) => {
    // Batch actions are now handled by the BatchResponseApprovalRejection component
    console.log('Batch action requested:', action, responseIds);
  };

  const handleSingleVerification = async (responseId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      if (action === 'APPROVE') {
        await approveResponse(responseId, {});
      } else {
        await rejectResponse(responseId, {});
      }
      
      toast({
        title: 'Response Verified',
        description: `Response has been ${action.toLowerCase()}d successfully.`,
        variant: action === 'APPROVE' ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: 'Failed to verify response. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleFeedbackRequest = (responseId: string) => {
    // In a real implementation, this would open a feedback dialog
    // For now, we'll show a toast
    toast({
      title: 'Feedback Requested',
      description: 'Feedback request functionality would be implemented here.',
    });
  };

  const handleBatchComplete = () => {
    // Called when batch operations complete successfully
    clearResponseSelection();
  };

  return (
    <div className="container mx-auto p-6">
      {/* Main Queue Component */}
      <ResponseVerificationQueue
        onPreviewResponse={handlePreviewResponse}
        onBatchAction={handleBatchAction}
        className="mb-6"
      />

      {/* Batch Operations Component - shows when responses are selected */}
      {selectedResponseIds.length > 0 && (
        <BatchResponseApprovalRejection
          selectedResponseIds={selectedResponseIds}
          onBatchComplete={handleBatchComplete}
          onClearSelection={clearResponseSelection}
          className="mt-6"
        />
      )}
    </div>
  );
}