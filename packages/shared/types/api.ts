// API request/response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  code: string;
  details?: any;
}

// Story 3.2: Assessment Approval/Rejection API Response Types

// Assessment Approval Response
export interface AssessmentApprovalResponse extends ApiResponse<{
  assessmentId: string;
  verificationStatus: 'VERIFIED';
  approvedBy: string;
  approvedAt: Date;
  notificationSent: boolean;
}> {}

// Assessment Rejection Response
export interface AssessmentRejectionResponse extends ApiResponse<{
  assessmentId: string;
  verificationStatus: 'REJECTED';
  rejectedBy: string;
  rejectedAt: Date;
  feedbackId: string;
  notificationSent: boolean;
}> {}

// Batch Approval Response
export interface BatchApprovalResponse extends ApiResponse<{
  processed: number;
  approved: number;
  failed: number;
  results: {
    assessmentId: string;
    status: 'SUCCESS' | 'FAILED';
    error?: string;
  }[];
  notificationsSent: number;
}> {}

// Batch Rejection Response
export interface BatchRejectionResponse extends ApiResponse<{
  processed: number;
  rejected: number;
  failed: number;
  results: {
    assessmentId: string;
    status: 'SUCCESS' | 'FAILED';
    error?: string;
  }[];
  feedbackIds: string[];
  notificationsSent: number;
}> {}