import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { VerificationStatus } from '@dms/shared';

interface UseVerificationActionsReturn {
  // Single item actions
  verifyItem: (id: string, type: 'assessment' | 'response') => Promise<void>;
  rejectItem: (id: string, type: 'assessment' | 'response', notes?: string) => Promise<void>;
  
  // Batch actions
  batchVerify: (ids: string[], type: 'assessment' | 'response') => Promise<void>;
  batchReject: (ids: string[], type: 'assessment' | 'response', notes?: string) => Promise<void>;
  
  // Loading states
  isVerifying: boolean;
  isRejecting: boolean;
  isBatchProcessing: boolean;
  
  // Progress tracking for batch operations
  batchProgress: {
    completed: number;
    total: number;
    failed: string[];
  };
}

export const useVerificationActions = (
  onSuccess?: () => void
): UseVerificationActionsReturn => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({
    completed: 0,
    total: 0,
    failed: [] as string[],
  });

  // Single item verification
  const verifyItem = useCallback(async (id: string, type: 'assessment' | 'response') => {
    setIsVerifying(true);
    
    try {
      const endpoint = type === 'assessment' 
        ? `/api/v1/assessments/${id}/verify`
        : `/api/v1/responses/${id}/verify`;
        
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to verify ${type}`);
      }
      
      toast.success(`${type === 'assessment' ? 'Assessment' : 'Response'} verified successfully`);
      onSuccess?.();
      
    } catch (error) {
      console.error(`Error verifying ${type}:`, error);
      toast.error(`Failed to verify ${type}`);
      throw error;
    } finally {
      setIsVerifying(false);
    }
  }, [onSuccess]);

  // Single item rejection
  const rejectItem = useCallback(async (id: string, type: 'assessment' | 'response', notes?: string) => {
    setIsRejecting(true);
    
    try {
      const endpoint = type === 'assessment'
        ? `/api/v1/assessments/${id}/reject`
        : `/api/v1/responses/${id}/reject`;
        
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes || '' }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to reject ${type}`);
      }
      
      toast.success(`${type === 'assessment' ? 'Assessment' : 'Response'} rejected successfully`);
      onSuccess?.();
      
    } catch (error) {
      console.error(`Error rejecting ${type}:`, error);
      toast.error(`Failed to reject ${type}`);
      throw error;
    } finally {
      setIsRejecting(false);
    }
  }, [onSuccess]);

  // Batch verification with progress tracking
  const batchVerify = useCallback(async (ids: string[], type: 'assessment' | 'response') => {
    setIsBatchProcessing(true);
    setBatchProgress({ completed: 0, total: ids.length, failed: [] });
    
    const failed: string[] = [];
    let completed = 0;
    
    try {
      // Process items in batches of 5 to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (id) => {
            try {
              const endpoint = type === 'assessment'
                ? `/api/v1/assessments/${id}/verify`
                : `/api/v1/responses/${id}/verify`;
                
              const response = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
              });
              
              if (!response.ok) {
                throw new Error(`Failed to verify ${id}`);
              }
              
              completed++;
              setBatchProgress(prev => ({ ...prev, completed }));
              
            } catch (error) {
              failed.push(id);
              setBatchProgress(prev => ({ ...prev, failed }));
            }
          })
        );
        
        // Small delay between batches
        if (i + batchSize < ids.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      const successCount = completed;
      const failCount = failed.length;
      
      if (failCount === 0) {
        toast.success(`Successfully verified ${successCount} ${type}${successCount !== 1 ? 's' : ''}`);
      } else if (successCount > 0) {
        toast.warning(`Verified ${successCount}, failed ${failCount} ${type}${failCount !== 1 ? 's' : ''}`);
      } else {
        toast.error(`Failed to verify all ${type}s`);
      }
      
      onSuccess?.();
      
    } finally {
      setIsBatchProcessing(false);
      setBatchProgress({ completed: 0, total: 0, failed: [] });
    }
  }, [onSuccess]);

  // Batch rejection with progress tracking
  const batchReject = useCallback(async (ids: string[], type: 'assessment' | 'response', notes?: string) => {
    setIsBatchProcessing(true);
    setBatchProgress({ completed: 0, total: ids.length, failed: [] });
    
    const failed: string[] = [];
    let completed = 0;
    
    try {
      // Process items in batches of 5
      const batchSize = 5;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (id) => {
            try {
              const endpoint = type === 'assessment'
                ? `/api/v1/assessments/${id}/reject`
                : `/api/v1/responses/${id}/reject`;
                
              const response = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: notes || 'Batch rejection' }),
              });
              
              if (!response.ok) {
                throw new Error(`Failed to reject ${id}`);
              }
              
              completed++;
              setBatchProgress(prev => ({ ...prev, completed }));
              
            } catch (error) {
              failed.push(id);
              setBatchProgress(prev => ({ ...prev, failed }));
            }
          })
        );
        
        // Small delay between batches
        if (i + batchSize < ids.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      const successCount = completed;
      const failCount = failed.length;
      
      if (failCount === 0) {
        toast.success(`Successfully rejected ${successCount} ${type}${successCount !== 1 ? 's' : ''}`);
      } else if (successCount > 0) {
        toast.warning(`Rejected ${successCount}, failed ${failCount} ${type}${failCount !== 1 ? 's' : ''}`);
      } else {
        toast.error(`Failed to reject all ${type}s`);
      }
      
      onSuccess?.();
      
    } finally {
      setIsBatchProcessing(false);
      setBatchProgress({ completed: 0, total: 0, failed: [] });
    }
  }, [onSuccess]);

  return {
    // Single item actions
    verifyItem,
    rejectItem,
    
    // Batch actions
    batchVerify,
    batchReject,
    
    // Loading states
    isVerifying,
    isRejecting,
    isBatchProcessing,
    
    // Progress tracking
    batchProgress,
  };
};