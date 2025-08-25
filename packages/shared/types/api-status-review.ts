// Story 2.5: Response Status Review API Types

import { RapidResponse, VerificationStatus, ResponseType, Feedback, ResubmissionLog, ResponseData, MediaAttachment } from './entities';

// Base API Response Format
export interface ApiResponse<T> {
  data: T;
  message: string;
  status: 'success' | 'error';
  timestamp: Date;
}

// Status Review Request/Response Types
export interface StatusReviewRequest {
  verificationStatus?: VerificationStatus[];
  dateRange?: { start: Date; end: Date };
  responseType?: ResponseType[];
  requiresAttention?: boolean;
}

export interface StatusReviewResponse extends ApiResponse<{
  responses: RapidResponse[];
  feedbackSummary: {
    totalFeedback: number;
    unreadFeedback: number;
    urgentFeedback: number;
    pendingResubmissions: number;
  };
  verificationStats: {
    pending: number;
    verified: number;
    rejected: number;
    requiresAttention: number;
  };
}> {}

// Feedback Request/Response Types  
export interface FeedbackResponse extends ApiResponse<{
  feedback: Feedback[];
  resubmissionHistory: ResubmissionLog[];
}> {}

// Resubmission Request/Response Types
export interface ResubmissionRequest {
  changesDescription: string;
  correctedData: ResponseData;
  updatedEvidence?: MediaAttachment[];
  addressedFeedbackIds: string[];
}

export interface ResubmissionResponse extends ApiResponse<{
  response: RapidResponse;
  resubmissionLog: ResubmissionLog;
  triggeredWorkflows: string[];
}> {}