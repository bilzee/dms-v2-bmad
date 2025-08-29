# 5\. API Specification

## LLM Development Notes

API uses RESTful patterns with consistent naming conventions. All endpoints return standardized response formats. Error handling follows RFC 7807 (Problem Details).

## API Design Principles

1. **Consistent URL Patterns**: `/api/v1/{resource}/{id}/{action}`
2. **Standardized Response Format**: All responses include `data`, `meta`, and optional `error`
3. **Offline-Aware Headers**: Include sync metadata in headers
4. **Batch Operations**: Comprehensive bulk operations for coordinator efficiency (Story 3.7)

## Core API Endpoints

```typescript
// API Response Types (shared/types/api.ts)

export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    version: string;
    syncToken?: string;
  };
  error?: ApiError;
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T\\\[]> {
  meta: ApiResponse<T>\\\['meta'] \\\& {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}
```

## RESTful Endpoints

### Verification & Batch Operations (Story 3.7)

```yaml
# Bulk Assessment Operations
POST /api/v1/verification/assessments/batch-approve
POST /api/v1/verification/assessments/batch-reject
POST /api/v1/verification/assessments/batch

# Bulk Response Operations  
POST /api/v1/verification/responses/batch-approve
POST /api/v1/verification/responses/batch-reject

# Individual Verification Operations
GET  /api/v1/verification/assessments/queue
POST /api/v1/verification/assessments/{id}/approve
POST /api/v1/verification/assessments/{id}/reject
POST /api/v1/verification/assessments/{id}/verify

GET  /api/v1/verification/responses/queue
POST /api/v1/verification/responses/{id}/approve
POST /api/v1/verification/responses/{id}/reject
POST /api/v1/verification/responses/{id}/verify
```

### Batch Operation Request/Response Types

```typescript
// Batch Assessment Operations
export interface BatchApprovalRequest {
  assessmentIds: string[];
  coordinatorId: string;
  coordinatorName: string;
  batchNote?: string;
  notifyAssessors: boolean;
}

export interface BatchRejectionRequest {
  assessmentIds: string[];
  coordinatorId: string;
  coordinatorName: string;
  rejectionReason: 'DATA_QUALITY' | 'MISSING_INFO' | 'VALIDATION_ERROR' | 'INSUFFICIENT_EVIDENCE' | 'OTHER';
  rejectionComments: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  notifyAssessors: boolean;
}

export interface BatchApprovalResponse extends ApiResponse<{
  processed: number;
  approved: number;
  failed: number;
  results: Array<{
    assessmentId: string;
    status: 'SUCCESS' | 'FAILED';
    error?: string;
  }>;
  notificationsSent: number;
}> {}

// Batch Response Operations
export interface BatchResponseApprovalRequest {
  responseIds: string[];
  coordinatorId: string;
  coordinatorName: string;
  batchNote?: string;
  notifyResponders: boolean;
}

export interface BatchResponseRejectionRequest {
  responseIds: string[];
  coordinatorId: string;
  coordinatorName: string;
  rejectionReason: 'DATA_QUALITY' | 'MISSING_INFO' | 'VALIDATION_ERROR' | 'INSUFFICIENT_EVIDENCE' | 'OTHER';
  rejectionComments: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  notifyResponders: boolean;
}
```

### Other Core Endpoints

```yaml