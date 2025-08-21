# 5\. API Specification

## LLM Development Notes

API uses RESTful patterns with consistent naming conventions. All endpoints return standardized response formats. Error handling follows RFC 7807 (Problem Details).

## API Design Principles

1. **Consistent URL Patterns**: `/api/v1/{resource}/{id}/{action}`
2. **Standardized Response Format**: All responses include `data`, `meta`, and optional `error`
3. **Offline-Aware Headers**: Include sync metadata in headers
4. **Batch Operations**: Support bulk operations for offline sync

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

```yaml