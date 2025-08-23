import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import type { RapidAssessment, OfflineQueueItem, MediaAttachment, AffectedEntity } from '@dms/shared';

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

class OfflineDatabase extends Dexie {
  assessments!: Table<AssessmentRecord>;
  entities!: Table<EntityRecord>;
  queue!: Table<QueueRecord>;
  media!: Table<MediaRecord>;
  drafts!: Table<DraftAssessment>;
  entityDrafts!: Table<DraftEntity>;

  constructor() {
    super('DMSOfflineDB');
    
    this.version(3).stores({
      assessments: 'id, type, date, affectedEntityId, assessorId, syncStatus, verificationStatus, offlineId, lastModified',
      entities: 'id, type, name, lga, ward, latitude, longitude, isDraft, lastModified',
      queue: 'id, type, action, entityId, priority, createdAt, lastAttempt, retryCount, lastModified',
      media: 'id, assessmentId, mimeType, size, isUploaded, lastModified',
      drafts: 'id, type, lastSaved',
      entityDrafts: 'id, type, lastSaved',
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
  }
}

// Create and export the database instance
export const db = new OfflineDatabase();

// Export the OfflineDatabase class for testing
export { OfflineDatabase };