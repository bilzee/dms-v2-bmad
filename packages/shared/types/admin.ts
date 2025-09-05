// shared/types/admin.ts

import { ApiResponse } from './api';
import { User, UserRole } from './entities';

// User Management Types
export interface CreateUserRequest {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  roleIds: string[];
  isActive?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  phone?: string;
  organization?: string;
  roleIds?: string[];
  isActive?: boolean;
}

export interface UserListFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
  organization?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastSync';
  sortOrder?: 'asc' | 'desc';
}

export interface UserListResponse extends ApiResponse<{
  users: AdminUser[];
  totalCount: number;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
  stats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    recentUsers: number;
    usersByRole: Record<string, number>;
  };
}> {}

export interface AdminUser extends User {
  roles: UserRole[];
  activeRole: UserRole;
  lastLogin?: Date;
  accountStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_ACTIVATION';
  createdBy?: string;
  createdByName?: string;
}

// Bulk Import Types
export interface BulkImportData {
  id: string;
  fileName: string;
  fileSize: number;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  errors: BulkImportError[];
  importedBy: string;
  importedByName: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BulkImportError {
  row: number;
  field: string;
  value: string;
  error: string;
}

export interface BulkImportRequest {
  file: File;
  validateOnly?: boolean;
}

export interface BulkImportResponse extends ApiResponse<{
  importId: string;
  status: 'PROCESSING' | 'VALIDATION_COMPLETE' | 'FAILED';
  preview?: {
    validRows: number;
    invalidRows: number;
    sampleUsers: CreateUserRequest[];
    errors: BulkImportError[];
  };
}> {}

export interface BulkImportStatusResponse extends ApiResponse<{
  import: BulkImportData;
  progress: {
    percentage: number;
    estimatedTimeRemaining?: number; // seconds
    currentOperation?: string;
  };
}> {}

// User Activity & Audit Types
export interface UserActivity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  timestamp: Date;
}

export interface UserActivityFilters {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface UserActivityResponse extends ApiResponse<{
  activities: UserActivity[];
  totalCount: number;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}> {}

// Admin Statistics Types
export interface AdminStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    newThisMonth: number;
    byRole: Record<string, number>;
    byOrganization: Record<string, number>;
  };
  activity: {
    logins: {
      today: number;
      thisWeek: number;
      thisMonth: number;
    };
    actions: {
      assessments: number;
      responses: number;
      verifications: number;
    };
  };
  system: {
    totalDataPoints: number;
    syncStatus: 'HEALTHY' | 'WARNING' | 'ERROR';
    lastBackup: Date;
    storageUsed: number; // bytes
  };
}

// Permission Management Types
export interface PermissionUpdate {
  userId: string;
  roleIds: string[];
  reason?: string;
}

export interface RolePermission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  isActive: boolean;
}

export interface AdminRole extends UserRole {
  permissions: RolePermission[];
  userCount: number;
  description?: string;
}

// User Status Management Types
export interface UserStatusUpdate {
  userId: string;
  isActive: boolean;
  reason?: string;
}

export interface BatchUserStatusUpdate {
  userIds: string[];
  isActive: boolean;
  reason?: string;
}

// Password Management Types
export interface PasswordResetRequest {
  userId: string;
  sendEmail?: boolean;
  temporaryPassword?: string;
}

export interface PasswordResetResponse extends ApiResponse<{
  userId: string;
  temporaryPassword: string;
  emailSent: boolean;
  resetToken: string;
  expiresAt: Date;
}> {}

// Search and Filter Types
export interface UserSearchFilters {
  query: string;
  roleFilter?: string[];
  organizationFilter?: string[];
  statusFilter?: ('ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_ACTIVATION')[];
  dateRangeFilter?: {
    field: 'createdAt' | 'lastLogin' | 'lastSync';
    start: Date;
    end: Date;
  };
}

export interface UserSearchResponse extends ApiResponse<{
  users: AdminUser[];
  totalMatches: number;
  searchStats: {
    totalScanned: number;
    matchRate: number;
    searchTime: number; // milliseconds
  };
  suggestions: string[];
}> {}