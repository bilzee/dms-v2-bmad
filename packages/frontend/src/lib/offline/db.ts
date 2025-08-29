import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import type { RapidAssessment, OfflineQueueItem, MediaAttachment, AffectedEntity } from '@dms/shared';
import type { ConflictDetailed, ConflictAuditEntry } from '@/lib/sync/SyncEngine';

// Define the database schema
export interface AssessmentRecord extends RapidAssessment {
  // Additional fields for offline storage
  encryptedData?: string;
  isDraft?: boolean;
  lastModified: Date;
}

export interface QueueRecord extends OfflineQueueItem {
  // Additional fields for queue management
  lastModified: Date;
}

export interface MediaRecord extends MediaAttachment {
  // Additional fields for media storage
  assessmentId?: string;
  isUploaded: boolean;
  lastModified: Date;
}

export interface DraftAssessment {
  id: string;
  type: string;
  data: any;
  lastSaved: Date;
  formData: any;
}

export interface EntityRecord extends AffectedEntity {
  // Additional fields for offline storage
  encryptedData?: string;
  isDraft?: boolean;
  lastModified: Date;
}

export interface DraftEntity {
  id: string;
  type: 'CAMP' | 'COMMUNITY';
  data: any;
  lastSaved: Date;
  formData: any;
}

// Conflict Management Records
export interface ConflictRecord extends Omit<ConflictDetailed, 'detectedAt' | 'resolvedAt' | 'auditTrail'> {
  // Convert Date objects to timestamps for IndexedDB storage
  detectedAt: number;
  resolvedAt?: number;
  lastModified: Date;
}

export interface ConflictAuditRecord extends Omit<ConflictAuditEntry, 'timestamp'> {
  id: string; // Unique ID for audit entry
  conflictId: string; // Reference to parent conflict
  timestamp: number; // Convert Date to timestamp
  lastModified: Date;
}

export interface ConflictQueueCache {
  id: string;
  cacheKey: string; // Hash of filter parameters
  conflictIds: string[]; // Array of conflict IDs
  totalCount: number;
  cacheTime: Date;
  expiresAt: Date;
}

export interface ConflictResolutionCache {
  id: string;
  conflictId: string;
  resolutionData: any;
  cacheTime: Date;
  expiresAt: Date;
}

class OfflineDatabase extends Dexie {
  assessments!: Table<AssessmentRecord>;
  entities!: Table<EntityRecord>;
  queue!: Table<QueueRecord>;
  media!: Table<MediaRecord>;
  drafts!: Table<DraftAssessment>;
  entityDrafts!: Table<DraftEntity>;
  
  // Conflict Management Tables
  conflicts!: Table<ConflictRecord>;
  conflictAudit!: Table<ConflictAuditRecord>;
  conflictQueueCache!: Table<ConflictQueueCache>;
  conflictResolutionCache!: Table<ConflictResolutionCache>;

  constructor() {
    super('DMSOfflineDB');
    
    // Update version to 4 for conflict management tables
    this.version(4).stores({
      assessments: 'id, type, date, affectedEntityId, assessorId, syncStatus, verificationStatus, offlineId, lastModified',
      entities: 'id, type, name, lga, ward, latitude, longitude, isDraft, lastModified',
      queue: 'id, type, action, entityId, priority, createdAt, lastAttempt, retryCount, lastModified',
      media: 'id, assessmentId, mimeType, size, isUploaded, lastModified',
      drafts: 'id, type, lastSaved',
      entityDrafts: 'id, type, lastSaved',
      
      // Conflict Management Tables
      conflicts: 'id, entityId, entityType, conflictType, severity, status, detectedAt, resolvedAt, detectedBy, resolvedBy, lastModified',
      conflictAudit: 'id, conflictId, timestamp, action, performedBy, lastModified',
      conflictQueueCache: 'id, cacheKey, cacheTime, expiresAt',
      conflictResolutionCache: 'id, conflictId, cacheTime, expiresAt',
    });

    // Add hooks for automatic timestamp updates
    this.assessments.hook('creating', (primKey, obj, trans) => {
      (obj as AssessmentRecord).lastModified = new Date();
    });

    this.assessments.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as Partial<AssessmentRecord>).lastModified = new Date();
    });

    this.queue.hook('creating', (primKey, obj, trans) => {
      (obj as QueueRecord).lastModified = new Date();
    });

    this.queue.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as Partial<QueueRecord>).lastModified = new Date();
    });

    this.media.hook('creating', (primKey, obj, trans) => {
      (obj as MediaRecord).lastModified = new Date();
    });

    this.media.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as Partial<MediaRecord>).lastModified = new Date();
    });

    this.entities.hook('creating', (primKey, obj, trans) => {
      (obj as EntityRecord).lastModified = new Date();
    });

    this.entities.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as Partial<EntityRecord>).lastModified = new Date();
    });

    // Conflict management hooks
    this.conflicts.hook('creating', (primKey, obj, trans) => {
      (obj as ConflictRecord).lastModified = new Date();
    });

    this.conflicts.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as Partial<ConflictRecord>).lastModified = new Date();
    });

    this.conflictAudit.hook('creating', (primKey, obj, trans) => {
      (obj as ConflictAuditRecord).lastModified = new Date();
    });

    this.conflictAudit.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as Partial<ConflictAuditRecord>).lastModified = new Date();
    });
  }

  // Assessment operations
  async saveAssessment(assessment: RapidAssessment, isDraft = false): Promise<string> {
    const id = assessment.id || uuidv4();
    const record: AssessmentRecord = {
      ...assessment,
      id,
      isDraft,
      lastModified: new Date(),
    };

    // Encrypt sensitive data if needed
    if (this.shouldEncryptData(assessment)) {
      record.encryptedData = await this.encryptData(assessment.data);
    }

    await this.assessments.put(record);
    return id;
  }

  async getAssessments(filters?: {
    type?: string;
    syncStatus?: string;
    isDraft?: boolean;
  }): Promise<AssessmentRecord[]> {
    let query = this.assessments.orderBy('lastModified').reverse();

    if (filters) {
      if (filters.type) {
        query = query.filter(a => a.type === filters.type);
      }
      if (filters.syncStatus) {
        query = query.filter(a => a.syncStatus === filters.syncStatus);
      }
      if (filters.isDraft !== undefined) {
        query = query.filter(a => a.isDraft === filters.isDraft);
      }
    }

    return await query.toArray();
  }

  async getAssessment(id: string): Promise<AssessmentRecord | undefined> {
    const assessment = await this.assessments.get(id);
    
    // Decrypt sensitive data if needed
    if (assessment && assessment.encryptedData) {
      const decryptedData = await this.decryptData(assessment.encryptedData);
      return { ...assessment, data: decryptedData };
    }
    
    return assessment;
  }

  async updateAssessmentSyncStatus(id: string, syncStatus: string): Promise<void> {
    const assessment = await this.assessments.get(id);
    if (assessment) {
      await this.assessments.put({
        ...assessment,
        syncStatus: syncStatus as any,
        lastModified: new Date(),
      });
    }
  }

  async deleteAssessment(id: string): Promise<void> {
    await this.assessments.delete(id);
  }

  // Entity operations
  async saveEntity(entity: AffectedEntity, isDraft = false): Promise<string> {
    const id = entity.id || uuidv4();
    const record: EntityRecord = {
      ...entity,
      id,
      isDraft,
      lastModified: new Date(),
    };

    // Encrypt sensitive data (for entities with personal information)
    if (this.shouldEncryptEntityData(entity)) {
      record.encryptedData = await this.encryptData(entity);
    }

    await this.entities.put(record);
    return id;
  }

  async getEntities(filters?: {
    type?: 'CAMP' | 'COMMUNITY';
    lga?: string;
    ward?: string;
    isDraft?: boolean;
  }): Promise<EntityRecord[]> {
    let query = this.entities.orderBy('lastModified').reverse();

    if (filters) {
      if (filters.type) {
        query = query.filter(e => e.type === filters.type);
      }
      if (filters.lga) {
        query = query.filter(e => e.lga === filters.lga);
      }
      if (filters.ward) {
        query = query.filter(e => e.ward === filters.ward);
      }
      if (filters.isDraft !== undefined) {
        query = query.filter(e => e.isDraft === filters.isDraft);
      }
    }

    return await query.toArray();
  }

  async getEntityById(id: string): Promise<EntityRecord | undefined> {
    const entity = await this.entities.get(id);
    
    // Decrypt sensitive data if needed
    if (entity && entity.encryptedData) {
      const decryptedData = await this.decryptData(entity.encryptedData);
      return { ...entity, ...decryptedData };
    }
    
    return entity;
  }

  async searchEntities(searchTerm: string): Promise<EntityRecord[]> {
    return await this.entities
      .filter(entity => 
        entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.lga.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.ward.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .toArray();
  }

  async deleteEntity(id: string): Promise<void> {
    await this.entities.delete(id);
  }

  // Queue operations
  async addToQueue(item: Omit<OfflineQueueItem, 'id'>): Promise<string> {
    const id = uuidv4();
    const record: QueueRecord = {
      id,
      ...item,
      lastModified: new Date(),
    };
    await this.queue.put(record);
    return id;
  }

  async getQueueItems(priority?: 'HIGH' | 'NORMAL' | 'LOW'): Promise<QueueRecord[]> {
    let query = this.queue.orderBy('priority').reverse();
    
    if (priority) {
      query = query.filter(item => item.priority === priority);
    }

    return await query.toArray();
  }

  async updateQueueItem(id: string, updates: Partial<QueueRecord>): Promise<number> {
    return await this.queue.update(id, {
      ...updates,
      lastModified: new Date(),
    });
  }

  async removeFromQueue(id: string): Promise<void> {
    await this.queue.delete(id);
  }

  async clearQueue(): Promise<void> {
    await this.queue.clear();
  }

  // Media operations
  async saveMediaAttachment(media: MediaAttachment, assessmentId?: string): Promise<string> {
    const id = media.id || uuidv4();
    const record: MediaRecord = {
      ...media,
      id,
      assessmentId,
      isUploaded: !!media.url, // If has URL, assume uploaded
      lastModified: new Date(),
    };

    await this.media.put(record);
    return id;
  }

  async getMediaByAssessment(assessmentId: string): Promise<MediaRecord[]> {
    return await this.media
      .where('assessmentId')
      .equals(assessmentId)
      .reverse()
      .toArray();
  }

  async getUnuploadedMedia(): Promise<MediaRecord[]> {
    return await this.media
      .where('isUploaded')
      .equals(0) // Use 0 for false in IndexedDB
      .reverse()
      .toArray();
  }

  async updateMediaUploadStatus(id: string, url: string, thumbnailUrl?: string): Promise<number> {
    return await this.media.update(id, {
      url,
      thumbnailUrl,
      isUploaded: true,
      lastModified: new Date(),
    });
  }

  async deleteMedia(id: string): Promise<void> {
    await this.media.delete(id);
  }

  async compressMedia(file: File, maxSize: number = 1024 * 1024): Promise<Blob> {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        const maxDimension = 1920; // Max width or height
        let { width, height } = img;

        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Start with high quality and reduce until under maxSize
        let quality = 0.9;
        const checkSize = () => {
          canvas.toBlob((blob) => {
            if (blob && (blob.size <= maxSize || quality <= 0.3)) {
              resolve(blob);
            } else {
              quality -= 0.1;
              checkSize();
            }
          }, file.type, quality);
        };
        
        checkSize();
      };

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  async generateThumbnail(file: File, size: number = 150): Promise<Blob> {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = size;
        canvas.height = size;

        // Calculate crop dimensions for square thumbnail
        const { width, height } = img;
        const minDimension = Math.min(width, height);
        const x = (width - minDimension) / 2;
        const y = (height - minDimension) / 2;

        ctx?.drawImage(
          img, 
          x, y, minDimension, minDimension, // Source
          0, 0, size, size // Destination
        );

        canvas.toBlob((blob) => {
          resolve(blob || file);
        }, file.type, 0.8);
      };

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  // Draft operations
  async saveDraft(draft: Omit<DraftAssessment, 'lastSaved'>): Promise<string> {
    const id = draft.id || uuidv4();
    await this.drafts.put({
      ...draft,
      id,
      lastSaved: new Date(),
    });
    return id;
  }

  async getDraft(id: string): Promise<DraftAssessment | undefined> {
    return await this.drafts.get(id);
  }

  async getDraftsByType(type: string): Promise<DraftAssessment[]> {
    return await this.drafts.where('type').equals(type).toArray();
  }

  async deleteDraft(id: string): Promise<void> {
    await this.drafts.delete(id);
  }

  // Entity draft operations
  async saveEntityDraft(draft: Omit<DraftEntity, 'lastSaved'>): Promise<string> {
    const id = draft.id || uuidv4();
    await this.entityDrafts.put({
      ...draft,
      id,
      lastSaved: new Date(),
    });
    return id;
  }

  async getEntityDraft(id: string): Promise<DraftEntity | undefined> {
    return await this.entityDrafts.get(id);
  }

  async getEntityDraftsByType(type: 'CAMP' | 'COMMUNITY'): Promise<DraftEntity[]> {
    return await this.entityDrafts.where('type').equals(type).toArray();
  }

  async deleteEntityDraft(id: string): Promise<void> {
    await this.entityDrafts.delete(id);
  }

  // Utility methods
  private shouldEncryptData(assessment: RapidAssessment): boolean {
    // Encrypt assessments with sensitive personal data
    return assessment.type === 'POPULATION' || assessment.type === 'HEALTH' || assessment.type === 'PRELIMINARY';
  }

  private shouldEncryptEntityData(entity: AffectedEntity): boolean {
    // Encrypt entity data containing personal information (coordinators, contacts)
    return true; // Always encrypt entity data as it contains personal contact information
  }

  private async encryptData(data: any): Promise<string> {
    try {
      const dataString = JSON.stringify(data);
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(dataString);

      // Generate a random key for AES-256-GCM encryption
      const key = await this.getOrCreateEncryptionKey();
      
      // Generate a random IV for each encryption
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt the data
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        encodedData
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);

      // Return as base64 string
      return btoa(String.fromCharCode.apply(null, Array.from(combined)));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  private async decryptData(encryptedData: string): Promise<any> {
    try {
      // Decode from base64
      const combined = new Uint8Array(
        atob(encryptedData)
          .split('')
          .map(char => char.charCodeAt(0))
      );

      // Extract IV (first 12 bytes) and encrypted data
      const iv = combined.slice(0, 12);
      const encryptedBuffer = combined.slice(12);

      // Get encryption key
      const key = await this.getOrCreateEncryptionKey();

      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        encryptedBuffer
      );

      // Convert back to string and parse JSON
      const decoder = new TextDecoder();
      const dataString = decoder.decode(decryptedBuffer);
      return JSON.parse(dataString);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  private async getOrCreateEncryptionKey(): Promise<CryptoKey> {
    const keyName = 'dms-offline-encryption-key';
    
    // Try to get existing key from localStorage
    const existingKeyData = localStorage.getItem(keyName);
    
    if (existingKeyData) {
      try {
        const keyData = JSON.parse(existingKeyData);
        return await crypto.subtle.importKey(
          'jwk',
          keyData,
          { name: 'AES-GCM' },
          false,
          ['encrypt', 'decrypt']
        );
      } catch (error) {
        console.warn('Failed to import existing key, generating new one');
      }
    }

    // Generate new key
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );

    // Export and store key
    const exportedKey = await crypto.subtle.exportKey('jwk', key);
    localStorage.setItem(keyName, JSON.stringify(exportedKey));

    return key;
  }

  // Conflict Management Operations

  /**
   * Save conflict to offline storage
   */
  async saveConflict(conflict: ConflictDetailed): Promise<string> {
    const record: ConflictRecord = {
      ...conflict,
      detectedAt: conflict.detectedAt.getTime(),
      resolvedAt: conflict.resolvedAt?.getTime(),
      lastModified: new Date(),
    };

    await this.conflicts.put(record);

    // Save audit trail entries
    for (const entry of conflict.auditTrail) {
      await this.saveConflictAuditEntry(conflict.id, entry);
    }

    return conflict.id;
  }

  /**
   * Get conflict by ID with audit trail
   */
  async getConflict(conflictId: string): Promise<ConflictDetailed | undefined> {
    const record = await this.conflicts.get(conflictId);
    if (!record) return undefined;

    // Get audit trail
    const auditEntries = await this.conflictAudit
      .where('conflictId')
      .equals(conflictId)
      .toArray();

    // Convert back to ConflictDetailed format
    const conflict: ConflictDetailed = {
      ...record,
      detectedAt: new Date(record.detectedAt),
      resolvedAt: record.resolvedAt ? new Date(record.resolvedAt) : undefined,
      auditTrail: auditEntries
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((entry: any) => ({
          timestamp: new Date(entry.timestamp),
          action: entry.action,
          performedBy: entry.performedBy,
          details: entry.details
        }))
    };

    return conflict;
  }

  /**
   * Get pending conflicts with filtering and sorting
   */
  async getPendingConflicts(filters?: {
    entityType?: string;
    severity?: string;
    conflictType?: string;
  }): Promise<ConflictDetailed[]> {
    let query = this.conflicts.where('status').equals('PENDING');

    if (filters) {
      if (filters.entityType) {
        query = query.and(conflict => conflict.entityType === filters.entityType);
      }
      if (filters.severity) {
        query = query.and(conflict => conflict.severity === filters.severity);
      }
      if (filters.conflictType) {
        query = query.and(conflict => conflict.conflictType === filters.conflictType);
      }
    }

    const records = await query.toArray();
    
    // Sort by detectedAt in memory (newest first)
    records.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

    // Convert to ConflictDetailed format with audit trails
    const conflicts: ConflictDetailed[] = [];
    for (const record of records) {
      const conflict = await this.getConflict(record.id);
      if (conflict) conflicts.push(conflict);
    }

    return conflicts;
  }

  /**
   * Get conflicts for specific entity
   */
  async getConflictsForEntity(entityId: string): Promise<ConflictDetailed[]> {
    const records = await this.conflicts
      .where('entityId')
      .equals(entityId)
      .toArray();
    
    // Sort by detectedAt in memory (newest first)
    records.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

    const conflicts: ConflictDetailed[] = [];
    for (const record of records) {
      const conflict = await this.getConflict(record.id);
      if (conflict) conflicts.push(conflict);
    }

    return conflicts;
  }

  /**
   * Update conflict status and resolution details
   */
  async updateConflictResolution(
    conflictId: string,
    resolutionStrategy: string,
    resolvedBy: string,
    justification: string
  ): Promise<void> {
    const now = Date.now();
    
    await this.conflicts.update(conflictId, {
      status: 'RESOLVED',
      resolutionStrategy: resolutionStrategy as any,
      resolvedBy,
      resolvedAt: now,
      resolutionJustification: justification,
      lastModified: new Date()
    });

    // Add resolution audit entry
    await this.saveConflictAuditEntry(conflictId, {
      timestamp: new Date(),
      action: 'CONFLICT_RESOLVED',
      performedBy: resolvedBy,
      details: {
        strategy: resolutionStrategy,
        justification
      }
    });
  }

  /**
   * Save conflict audit entry
   */
  async saveConflictAuditEntry(conflictId: string, entry: ConflictAuditEntry): Promise<string> {
    const id = uuidv4();
    const record: ConflictAuditRecord = {
      id,
      conflictId,
      timestamp: entry.timestamp.getTime(),
      action: entry.action,
      performedBy: entry.performedBy,
      details: entry.details,
      lastModified: new Date()
    };

    await this.conflictAudit.put(record);
    return id;
  }

  /**
   * Get conflict statistics
   */
  async getConflictStats(): Promise<{
    totalConflicts: number;
    pendingConflicts: number;
    resolvedConflicts: number;
    criticalConflicts: number;
    conflictsByType: Record<string, number>;
    conflictsBySeverity: Record<string, number>;
  }> {
    const allConflicts = await this.conflicts.toArray();
    
    const stats = {
      totalConflicts: allConflicts.length,
      pendingConflicts: allConflicts.filter(c => c.status === 'PENDING').length,
      resolvedConflicts: allConflicts.filter(c => c.status === 'RESOLVED').length,
      criticalConflicts: allConflicts.filter(c => c.severity === 'CRITICAL').length,
      conflictsByType: allConflicts.reduce((acc, c) => {
        acc[c.conflictType] = (acc[c.conflictType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      conflictsBySeverity: allConflicts.reduce((acc, c) => {
        acc[c.severity] = (acc[c.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return stats;
  }

  /**
   * Cache conflict queue for performance
   */
  async cacheConflictQueue(
    cacheKey: string,
    conflictIds: string[],
    totalCount: number,
    ttlMinutes: number = 10
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    const cache: ConflictQueueCache = {
      id: uuidv4(),
      cacheKey,
      conflictIds,
      totalCount,
      cacheTime: now,
      expiresAt
    };

    await this.conflictQueueCache.put(cache);

    // Clean up expired cache entries
    await this.conflictQueueCache
      .where('expiresAt')
      .below(now)
      .delete();
  }

  /**
   * Get cached conflict queue
   */
  async getCachedConflictQueue(cacheKey: string): Promise<ConflictQueueCache | null> {
    const cache = await this.conflictQueueCache
      .where('cacheKey')
      .equals(cacheKey)
      .and(c => c.expiresAt > new Date())
      .first();

    return cache || null;
  }

  /**
   * Cache conflict resolution data
   */
  async cacheConflictResolution(
    conflictId: string,
    resolutionData: any,
    ttlMinutes: number = 30
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    const cache: ConflictResolutionCache = {
      id: uuidv4(),
      conflictId,
      resolutionData,
      cacheTime: now,
      expiresAt
    };

    await this.conflictResolutionCache.put(cache);

    // Clean up expired cache entries
    await this.conflictResolutionCache
      .where('expiresAt')
      .below(now)
      .delete();
  }

  /**
   * Get cached conflict resolution
   */
  async getCachedConflictResolution(conflictId: string): Promise<ConflictResolutionCache | null> {
    const cache = await this.conflictResolutionCache
      .where('conflictId')
      .equals(conflictId)
      .and(c => c.expiresAt > new Date())
      .first();

    return cache || null;
  }

  /**
   * Clear old resolved conflicts
   */
  async clearOldConflicts(daysOld: number = 30): Promise<number> {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    // Get conflicts to delete
    const conflictsToDelete = await this.conflicts
      .where('resolvedAt')
      .below(cutoffTime)
      .and(c => c.status === 'RESOLVED')
      .toArray();

    let deletedCount = 0;

    // Delete conflicts and their audit trails
    for (const conflict of conflictsToDelete) {
      // Delete audit trail entries
      await this.conflictAudit.where('conflictId').equals(conflict.id).delete();
      
      // Delete conflict
      await this.conflicts.delete(conflict.id);
      deletedCount++;
    }

    return deletedCount;
  }

  // Cleanup old data
  async cleanup(olderThan: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)): Promise<void> {
    // Remove assessments older than 30 days that are synced
    await this.assessments
      .where('lastModified')
      .below(olderThan)
      .and(assessment => assessment.syncStatus === 'SYNCED')
      .delete();

    // Remove entities older than 30 days that are not drafts (entities typically persist longer)
    const veryOld = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days for entities
    await this.entities
      .where('lastModified')
      .below(veryOld)
      .and(entity => !entity.isDraft)
      .delete();

    // Remove old queue items
    await this.queue
      .where('lastModified')
      .below(olderThan)
      .delete();

    // Remove old media files that are uploaded
    await this.media
      .where('lastModified')
      .below(olderThan)
      .and(media => media.isUploaded)
      .delete();

    // Remove old drafts
    await this.drafts
      .where('lastSaved')
      .below(olderThan)
      .delete();

    // Remove old entity drafts
    await this.entityDrafts
      .where('lastSaved')
      .below(olderThan)
      .delete();

    // Clean up old resolved conflicts (90 days)
    const conflictCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await this.clearOldConflicts(90);

    // Clean up expired cache entries
    const now = new Date();
    await this.conflictQueueCache
      .where('expiresAt')
      .below(now)
      .delete();

    await this.conflictResolutionCache
      .where('expiresAt')
      .below(now)
      .delete();
  }
}

// Create and export the database instance
export const db = new OfflineDatabase();

// Export the OfflineDatabase class for testing
export { OfflineDatabase };