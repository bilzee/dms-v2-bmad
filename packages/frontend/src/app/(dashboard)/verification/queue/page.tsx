'use client';

import React from 'react';
import { AssessmentVerificationQueue } from '@/components/features/verification/AssessmentVerificationQueue';
import { AssessmentPreview } from '@/components/features/verification/AssessmentPreview';
import { BatchVerification } from '@/components/features/verification/BatchVerification';
import { useQueueSelection, useVerificationStore } from '@/stores/verification.store';
import { toast } from '@/components/ui/use-toast';

export default function VerificationQueuePage() {
  const [batchAction, setBatchAction] = React.useState<'APPROVE' | 'REJECT' | null>(null);
  const [showBatchDialog, setShowBatchDialog] = React.useState(false);
  
  const { selectedAssessmentIds, clearSelection } = useQueueSelection();
  const { queue, verifyAssessment, batchVerify } = useVerificationStore();

  const handlePreviewAssessment = (assessmentId: string) => {
    // Preview functionality is handled by the store and AssessmentPreview component
    console.log('Opening preview for assessment:', assessmentId);
  };

  const handleBatchAction = (action: 'APPROVE' | 'REJECT', assessmentIds: string[]) => {
    setBatchAction(action);
    setShowBatchDialog(true);
  };

  const handleSingleVerification = async (assessmentId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await verifyAssessment(assessmentId, action);
      
      toast({
        title: 'Assessment Verified',
        description: `Assessment has been ${action.toLowerCase()}d successfully.`,
        variant: action === 'APPROVE' ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: 'Failed to verify assessment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleFeedbackRequest = (assessmentId: string) => {
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

  // Get selected assessments for batch operations
  const selectedAssessments = selectedAssessmentIds.map(id => {
    const queueItem = queue.find(item => item.assessment.id === id);
    if (!queueItem) return null;
    
    return {
      id: queueItem.assessment.id,
      type: queueItem.assessment.type,
      assessorName: queueItem.assessorName,
      affectedEntityName: queueItem.affectedEntity.name,
      date: queueItem.assessment.date,
    };
  }).filter(Boolean) as Array<{
    id: string;
    type: string;
    assessorName: string;
    affectedEntityName: string;
    date: Date;
  }>;

  return (
    <div className="container mx-auto p-6">
      {/* Main Queue Component */}
      <AssessmentVerificationQueue
        onPreviewAssessment={handlePreviewAssessment}
        onBatchAction={handleBatchAction}
        className="mb-6"
      />

      {/* Assessment Preview Modal */}
      <AssessmentPreview
        onVerify={handleSingleVerification}
        onRequestFeedback={handleFeedbackRequest}
      />

      {/* Batch Verification Dialog */}
      {showBatchDialog && batchAction && (
        <BatchVerification
          isOpen={showBatchDialog}
          onClose={closeBatchDialog}
          action={batchAction}
          selectedAssessments={selectedAssessments}
        />
      )}
    </div>
  );
}