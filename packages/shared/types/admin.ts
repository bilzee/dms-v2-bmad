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
  sortBy?: 'timestamp' | 'severity' | 'eventType';
  sortOrder?: 'asc' | 'desc';
}

export interface SystemAlert {
  id?: string;
  type: 'HIGH_ERROR_RATE' | 'SLOW_RESPONSE' | 'HIGH_QUEUE_SIZE' | 'SYNC_FAILURE' | 'PERFORMANCE' | 'SECURITY' | 'SYSTEM' | 'RESOURCE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'WARNING';
  title?: string;
  message: string;
  timestamp: Date;
  source?: string;
  value?: number;
  threshold?: number;
  isAcknowledged?: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  metadata?: Record<string, any>;
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

// Story 9.3: System Audit & Monitoring Types

// Enhanced User Activity Logging - extends existing UserActivity
export interface SystemActivityLog extends UserActivity {
  eventType: 'USER_ACTION' | 'SYSTEM_EVENT' | 'SECURITY_EVENT' | 'API_ACCESS' | 'DATA_CHANGE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  module: string; // e.g., 'assessment', 'response', 'user-management', 'auth'
  method?: string; // HTTP method
  endpoint?: string; // API endpoint
  statusCode?: number; // HTTP status code
  responseTime?: number; // milliseconds
  errorMessage?: string;
  oldData?: any; // For data change events
  newData?: any; // For data change events
  geoLocation?: {
    latitude?: number;
    longitude?: number;
    country?: string;
    region?: string;
  };
  deviceInfo?: {
    deviceType?: string;
    browser?: string;
    os?: string;
  };
}

// Security Events
export interface SecurityEvent {
  id: string;
  eventType: 'AUTH_FAILURE' | 'PERMISSION_VIOLATION' | 'SUSPICIOUS_ACTIVITY' | 'DATA_BREACH_ATTEMPT' | 'ACCOUNT_LOCKOUT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  userName?: string;
  ipAddress: string;
  userAgent?: string;
  description: string;
  details: any;
  actionTaken?: string;
  requiresInvestigation: boolean;
  investigationStatus?: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'FALSE_POSITIVE';
  investigatedBy?: string;
  investigatedAt?: Date;
  resolutionNotes?: string;
  timestamp: Date;
}

// System Performance Monitoring
export interface SystemPerformanceMetrics {
  timestamp: Date;
  // Database metrics
  database: {
    connectionCount: number;
    activeQueries: number;
    avgQueryTime: number; // milliseconds
    slowQueries: number;
    errorRate: number; // percentage
  };
  // API metrics
  api: {
    requestsPerMinute: number;
    avgResponseTime: number; // milliseconds
    errorRate: number; // percentage
    endpointStats: Record<string, {
      requestCount: number;
      avgResponseTime: number;
      errorRate: number;
    }>;
  };
  // Queue metrics (BullMQ)
  queue: {
    activeJobs: number;
    waitingJobs: number;
    completedJobs: number;
    failedJobs: number;
    delayedJobs: number;
    processingRate: number; // jobs per minute
    avgJobDuration: number; // milliseconds
    errorRate: number; // percentage
  };
  // Sync engine metrics
  sync: {
    successRate: number; // percentage
    conflictRate: number; // percentage
    avgSyncTime: number; // milliseconds
    pendingItems: number;
    lastSyncAt: Date;
  };
  // System resources
  system: {
    cpuUsage?: number; // percentage
    memoryUsage?: number; // percentage
    diskUsage?: number; // percentage
    networkLatency?: number; // milliseconds
  };
}

// Audit Query and Filter Types
export interface AuditActivityFilters extends UserActivityFilters {
  eventType?: ('USER_ACTION' | 'SYSTEM_EVENT' | 'SECURITY_EVENT' | 'API_ACCESS' | 'DATA_CHANGE')[];
  severity?: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[];
  module?: string[];
  statusCode?: number[];
  ipAddress?: string;
  hasErrors?: boolean;
  responseTimeMin?: number;
  responseTimeMax?: number;
}

export interface SecurityEventFilters {
  eventType?: ('AUTH_FAILURE' | 'PERMISSION_VIOLATION' | 'SUSPICIOUS_ACTIVITY' | 'DATA_BREACH_ATTEMPT' | 'ACCOUNT_LOCKOUT')[];
  severity?: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[];
  userId?: string;
  ipAddress?: string;
  requiresInvestigation?: boolean;
  investigationStatus?: ('PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'FALSE_POSITIVE')[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity' | 'eventType';
  sortOrder?: 'asc' | 'desc';
}

// Data Export Types
export interface AuditDataExportRequest {
  format: 'CSV' | 'JSON' | 'PDF';
  dateRange: {
    start: Date;
    end: Date;
  };
  dataTypes: ('USER_ACTIVITY' | 'SECURITY_EVENTS' | 'PERFORMANCE_METRICS')[];
  filters?: {
    activity?: AuditActivityFilters;
    security?: SecurityEventFilters;
  };
  includeMetadata?: boolean;
  compressOutput?: boolean;
}

export interface AuditDataExportResponse extends ApiResponse<{
  exportId: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  downloadUrl?: string;
  expiresAt?: Date;
  fileSize?: number;
  recordCount?: number;
  estimatedTimeRemaining?: number; // seconds
}> {}

// API Response Types
export interface AuditActivityResponse extends ApiResponse<{
  activities: SystemActivityLog[];
  totalCount: number;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
  aggregations?: {
    byEventType: Record<string, number>;
    bySeverity: Record<string, number>;
    byModule: Record<string, number>;
    byHour: Record<string, number>;
  };
}> {}

export interface SecurityEventResponse extends ApiResponse<{
  events: SecurityEvent[];
  totalCount: number;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
  stats: {
    totalEvents: number;
    criticalEvents: number;
    pendingInvestigations: number;
    resolvedEvents: number;
    byEventType: Record<string, number>;
  };
}> {}

export interface SystemPerformanceResponse extends ApiResponse<{
  currentMetrics: SystemPerformanceMetrics;
  historicalData?: SystemPerformanceMetrics[];
  alerts?: {
    type: 'HIGH_ERROR_RATE' | 'SLOW_RESPONSE' | 'HIGH_QUEUE_SIZE' | 'SYNC_FAILURE';
    severity: 'WARNING' | 'CRITICAL';
    message: string;
    value: number;
    threshold: number;
    timestamp: Date;
  }[];
  healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}> {}

// Log Aggregation Service Types
export interface LogAggregationSettings {
  retentionPeriodDays: number;
  compressionEnabled: boolean;
  archiveAfterDays: number;
  alertThresholds: {
    errorRatePercentage: number;
    responseTimeMs: number;
    securityEventsPerHour: number;
  };
}

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

// Enhanced Role Assignment Types for Story 9.2
export interface RoleAssignmentRequest {
  userId: string;
  roleIds: string[];
  reason?: string;
  notifyUser?: boolean;
}

export interface BulkRoleAssignmentRequest {
  userIds: string[];
  roleIds: string[];
  reason?: string;
  notifyUsers?: boolean;
}

export interface RoleAssignmentResponse extends ApiResponse<{
  userId: string;
  assignedRoles: AdminRole[];
  removedRoles: AdminRole[];
  activeRole?: AdminRole;
  changeId: string;
}> {}

export interface RoleHistory {
  id: string;
  userId: string;
  roleId: string;
  action: 'ADDED' | 'REMOVED' | 'ACTIVATED' | 'DEACTIVATED' | 'ROLLBACK';
  previousData?: any;
  changedBy: string;
  changedByName: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface RoleHistoryResponse extends ApiResponse<{
  history: RoleHistory[];
  totalCount: number;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}> {}

export interface PermissionMatrix {
  roles: AdminRole[];
  permissions: RolePermission[];
  matrix: Record<string, Record<string, boolean>>; // roleId -> permissionId -> hasPermission
}

export interface PermissionMatrixResponse extends ApiResponse<{
  matrix: PermissionMatrix;
  lastUpdated: Date;
}> {}

export interface RoleRollbackRequest {
  historyId: string;
  reason?: string;
}

export interface MultiRoleUserSession {
  userId: string;
  availableRoles: AdminRole[];
  activeRole: AdminRole;
  canSwitchRoles: boolean;
}