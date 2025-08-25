'use client';

import React from 'react';
import { ResponseVerificationQueue } from '@/components/features/verification/ResponseVerificationQueue';
import { BatchResponseApprovalRejection } from '@/components/features/verification/BatchResponseApprovalRejection';
import { useResponseQueueSelection, useVerificationStore } from '@/stores/verification.store';
import { toast } from '@/hooks/use-toast';

export default function ResponseVerificationQueuePage() {
  const [batchAction, setBatchAction] = React.useState<'APPROVE' | 'REJECT' | null>(null);
  const [showBatchDialog, setShowBatchDialog] = React.useState(false);
  
  const { selectedResponseIds, clearResponseSelection } = useResponseQueueSelection();
  const { responseQueue, verifyResponse, batchVerifyResponses } = useVerificationStore();

  const handlePreviewResponse = (responseId: string) => {
    // Preview functionality is handled by the store and ResponsePreview component
    console.log('Opening preview for response:', responseId);
  };

  const handleBatchAction = (action: 'APPROVE' | 'REJECT', responseIds: string[]) => {
    setBatchAction(action);
    setShowBatchDialog(true);
  };

  const handleSingleVerification = async (responseId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await verifyResponse(responseId, action);
      
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

  const closeBatchDialog = () => {
    setShowBatchDialog(false);
    setBatchAction(null);
  };

  // Get selected responses for batch operations
  const selectedResponses = selectedResponseIds.map(id => {
    const queueItem = responseQueue.find(item => item.response.id === id);
    if (!queueItem) return null;
    
    return {
      id: queueItem.response.id,
      responseType: queueItem.response.responseType,
      responderName: queueItem.responderName,
      affectedEntityName: queueItem.affectedEntity.name,
      plannedDate: queueItem.response.plannedDate,
    };
  }).filter(Boolean) as Array<{
    id: string;
    responseType: string;
    responderName: string;
    affectedEntityName: string;
    plannedDate: Date;
  }>;

  return (
    <div className="container mx-auto p-6">
      {/* Main Queue Component */}
      <ResponseVerificationQueue
        onPreviewResponse={handlePreviewResponse}
        onBatchAction={handleBatchAction}
        className="mb-6"
      />

      {/* Batch Verification Dialog */}
      {showBatchDialog && batchAction && (
        <BatchResponseApprovalRejection
          isOpen={showBatchDialog}
          onClose={closeBatchDialog}
          action={batchAction}
          selectedResponses={selectedResponses}
        />
      )}
    </div>
  );
}