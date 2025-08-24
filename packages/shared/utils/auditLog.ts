// Audit logging utilities for sensitive operations
import { type GPSCoordinates } from '../types/entities';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  operation: string;
  userId: string;
  responseId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// In-memory audit log for development
// In production, this should be sent to a secure audit logging service
const auditEntries: AuditLogEntry[] = [];

/**
 * Creates a base audit log entry with common fields
 */
function createAuditEntry(
  operation: string,
  userId: string,
  details: Record<string, any>,
  responseId?: string
): AuditLogEntry {
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    operation,
    userId,
    responseId,
    details,
    // In a real app, these would be extracted from the request
    ipAddress: process.env.NODE_ENV === 'development' ? '127.0.0.1' : undefined,
    userAgent: process.env.NODE_ENV === 'development' ? 'dev-browser' : undefined,
  };
}

/**
 * Logs audit entry to storage
 * In production, this should send to a secure audit service
 */
async function logAuditEntry(entry: AuditLogEntry): Promise<void> {
  try {
    // Store in memory for development
    auditEntries.push(entry);
    
    // In production, send to audit service
    console.log('[AUDIT]', {
      timestamp: entry.timestamp.toISOString(),
      operation: entry.operation,
      userId: entry.userId,
      responseId: entry.responseId,
      details: entry.details
    });
    
    // TODO: In production, implement secure audit storage
    // await sendToAuditService(entry);
    
  } catch (error) {
    console.error('Failed to log audit entry:', error);
    // In production, this should have proper error handling and alerting
  }
}

export const auditLog = {
  /**
   * Logs access to delivery documentation
   */
  deliveryDocumentationAccessed: async (responseId: string, userId: string): Promise<void> => {
    const entry = createAuditEntry(
      'DELIVERY_DOCUMENTATION_ACCESSED',
      userId,
      {
        action: 'VIEW_DELIVERY_DOCUMENTATION',
        resource: 'delivery_documentation',
        sensitivity: 'HIGH'
      },
      responseId
    );
    await logAuditEntry(entry);
  },

  /**
   * Logs viewing of sensitive beneficiary data
   */
  beneficiaryDataViewed: async (responseId: string, userId: string, dataType?: string): Promise<void> => {
    const entry = createAuditEntry(
      'BENEFICIARY_DATA_VIEWED',
      userId,
      {
        action: 'VIEW_BENEFICIARY_DATA',
        resource: 'beneficiary_demographics',
        dataType: dataType || 'demographic_breakdown',
        sensitivity: 'CRITICAL'
      },
      responseId
    );
    await logAuditEntry(entry);
  },

  /**
   * Logs GPS coordinate capture events
   */
  gpsLocationCaptured: async (responseId: string, coordinates: GPSCoordinates, userId: string): Promise<void> => {
    const entry = createAuditEntry(
      'GPS_LOCATION_CAPTURED',
      userId,
      {
        action: 'CAPTURE_GPS_COORDINATES',
        resource: 'gps_coordinates',
        accuracy: coordinates.accuracy || 'unknown',
        captureMethod: coordinates.captureMethod || 'GPS',
        sensitivity: 'HIGH',
        // Don't log actual coordinates for privacy
        hasCoordinates: true
      },
      responseId
    );
    await logAuditEntry(entry);
  },

  /**
   * Logs delivery photo capture/upload events
   */
  deliveryPhotoUploaded: async (responseId: string, userId: string, photoCount: number): Promise<void> => {
    const entry = createAuditEntry(
      'DELIVERY_PHOTO_UPLOADED',
      userId,
      {
        action: 'UPLOAD_DELIVERY_PHOTOS',
        resource: 'delivery_evidence',
        photoCount,
        sensitivity: 'MEDIUM'
      },
      responseId
    );
    await logAuditEntry(entry);
  },

  /**
   * Logs delivery completion events
   */
  deliveryCompleted: async (responseId: string, userId: string): Promise<void> => {
    const entry = createAuditEntry(
      'DELIVERY_COMPLETED',
      userId,
      {
        action: 'COMPLETE_DELIVERY',
        resource: 'response_status',
        newStatus: 'DELIVERED',
        sensitivity: 'HIGH'
      },
      responseId
    );
    await logAuditEntry(entry);
  },

  /**
   * Logs encryption/decryption operations on sensitive data
   */
  sensitiveDataProcessed: async (
    operation: 'ENCRYPT' | 'DECRYPT',
    dataType: 'GPS_COORDINATES' | 'DEMOGRAPHIC_DATA',
    userId: string,
    responseId?: string
  ): Promise<void> => {
    const entry = createAuditEntry(
      'SENSITIVE_DATA_PROCESSED',
      userId,
      {
        action: `${operation}_SENSITIVE_DATA`,
        resource: dataType.toLowerCase(),
        operation,
        dataType,
        sensitivity: 'CRITICAL'
      },
      responseId
    );
    await logAuditEntry(entry);
  },

  /**
   * Gets audit trail for a specific response (admin only)
   */
  getResponseAuditTrail: async (responseId: string): Promise<AuditLogEntry[]> => {
    return auditEntries.filter(entry => entry.responseId === responseId);
  },

  /**
   * Gets audit trail for a specific user (admin only)
   */
  getUserAuditTrail: async (userId: string): Promise<AuditLogEntry[]> => {
    return auditEntries.filter(entry => entry.userId === userId);
  },

  /**
   * Gets all audit entries (system admin only)
   */
  getAllAuditEntries: async (): Promise<AuditLogEntry[]> => {
    return [...auditEntries]; // Return copy to prevent modification
  }
};