import { useState, useEffect, useCallback } from 'react';
import { 
  AssessmentVerificationQueueItem, 
  ResponseVerificationQueueItem,
  RapidAssessment,
  RapidResponse,
  VerificationStatus
} from '@dms/shared';
import { useVerificationStore } from '@/stores/verification.store';

interface QueueMetrics {
  totalPending: number;
  averageProcessingTime: number;
  queueVelocity: number;
  bottleneckThreshold: number;
  isBottleneck: boolean;
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
}

interface UseQueueManagementReturn {
  // Assessment Queue
  assessmentQueue: AssessmentVerificationQueueItem[];
  assessmentMetrics: QueueMetrics;
  
  // Response Queue
  responseQueue: ResponseVerificationQueueItem[];
  responseMetrics: QueueMetrics;
  
  // Combined metrics
  combinedMetrics: {
    totalPending: number;
    totalVelocity: number;
    hasBottleneck: boolean;
  };
  
  // Actions
  refreshQueues: () => Promise<void>;
  verifyAssessment: (id: string) => Promise<void>;
  rejectAssessment: (id: string, notes: string) => Promise<void>;
  verifyResponse: (id: string) => Promise<void>;
  rejectResponse: (id: string, notes: string) => Promise<void>;
  
  // Quick view
  previewItem: RapidAssessment | RapidResponse | null;
  previewType: 'assessment' | 'response' | null;
  openPreview: (item: RapidAssessment | RapidResponse, type: 'assessment' | 'response') => void;
  closePreview: () => void;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

export const useQueueManagement = (): UseQueueManagementReturn => {
  const {
    queue: assessmentQueue,
    responseQueue,
    isLoading,
    error,
    fetchQueue,
    fetchResponseQueue,
  } = useVerificationStore();

  const [previewItem, setPreviewItem] = useState<RapidAssessment | RapidResponse | null>(null);
  const [previewType, setPreviewType] = useState<'assessment' | 'response' | null>(null);
  const [assessmentMetrics, setAssessmentMetrics] = useState<QueueMetrics>({
    totalPending: 0,
    averageProcessingTime: 45,
    queueVelocity: 12,
    bottleneckThreshold: 60,
    isBottleneck: false,
    trendDirection: 'STABLE'
  });
  const [responseMetrics, setResponseMetrics] = useState<QueueMetrics>({
    totalPending: 0,
    averageProcessingTime: 75,
    queueVelocity: 8,
    bottleneckThreshold: 60,
    isBottleneck: true,
    trendDirection: 'UP'
  });

  // Calculate metrics based on queue data
  const calculateMetrics = useCallback(() => {
    const safeAssessmentQueue = assessmentQueue || [];
    const safeResponseQueue = responseQueue || [];
    
    const assessmentPending = safeAssessmentQueue.filter(
      item => item.assessment.verificationStatus === VerificationStatus.PENDING
    ).length;
    
    const responsePending = safeResponseQueue.filter(
      item => item.response.verificationStatus === VerificationStatus.PENDING
    ).length;

    setAssessmentMetrics(prev => ({
      ...prev,
      totalPending: assessmentPending,
      isBottleneck: prev.averageProcessingTime > prev.bottleneckThreshold
    }));

    setResponseMetrics(prev => ({
      ...prev,
      totalPending: responsePending,
      isBottleneck: prev.averageProcessingTime > prev.bottleneckThreshold
    }));
  }, [assessmentQueue, responseQueue]);

  // Disabled automatic polling to prevent excessive API calls
  // TODO: Re-enable with proper dependency management or manual refresh
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     fetchQueue();
  //     fetchResponseQueue();
  //     calculateMetrics();
  //   }, 25000);
  //   return () => clearInterval(interval);
  // }, []);

  // Calculate metrics when queue data changes
  useEffect(() => {
    calculateMetrics();
  }, [calculateMetrics]);

  // Actions
  const refreshQueues = useCallback(async () => {
    await Promise.all([fetchQueue(), fetchResponseQueue()]);
    calculateMetrics();
  }, []); // Removed dependencies to prevent infinite loop

  const verifyAssessment = useCallback(async (id: string) => {
    try {
      // API call to verify assessment
      const response = await fetch(`/api/v1/assessments/${id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to verify assessment');
      
      await refreshQueues();
    } catch (error) {
      console.error('Error verifying assessment:', error);
      throw error;
    }
  }, [refreshQueues]);

  const rejectAssessment = useCallback(async (id: string, notes: string) => {
    try {
      const response = await fetch(`/api/v1/assessments/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      
      if (!response.ok) throw new Error('Failed to reject assessment');
      
      await refreshQueues();
    } catch (error) {
      console.error('Error rejecting assessment:', error);
      throw error;
    }
  }, [refreshQueues]);

  const verifyResponse = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/v1/responses/${id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to verify response');
      
      await refreshQueues();
    } catch (error) {
      console.error('Error verifying response:', error);
      throw error;
    }
  }, [refreshQueues]);

  const rejectResponse = useCallback(async (id: string, notes: string) => {
    try {
      const response = await fetch(`/api/v1/responses/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      
      if (!response.ok) throw new Error('Failed to reject response');
      
      await refreshQueues();
    } catch (error) {
      console.error('Error rejecting response:', error);
      throw error;
    }
  }, [refreshQueues]);

  // Quick view actions
  const openPreview = useCallback((item: RapidAssessment | RapidResponse, type: 'assessment' | 'response') => {
    setPreviewItem(item);
    setPreviewType(type);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewItem(null);
    setPreviewType(null);
  }, []);

  // Combined metrics
  const combinedMetrics = {
    totalPending: assessmentMetrics.totalPending + responseMetrics.totalPending,
    totalVelocity: assessmentMetrics.queueVelocity + responseMetrics.queueVelocity,
    hasBottleneck: assessmentMetrics.isBottleneck || responseMetrics.isBottleneck,
  };

  return {
    // Queue data
    assessmentQueue: assessmentQueue || [],
    assessmentMetrics,
    responseQueue: responseQueue || [],
    responseMetrics,
    combinedMetrics,
    
    // Actions
    refreshQueues,
    verifyAssessment,
    rejectAssessment,
    verifyResponse,
    rejectResponse,
    
    // Quick view
    previewItem,
    previewType,
    openPreview,
    closePreview,
    
    // Loading states
    isLoading,
    error,
  };
};