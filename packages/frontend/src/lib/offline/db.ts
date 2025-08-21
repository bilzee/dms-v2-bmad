import Dexie, { Table } from 'dexie';
import type { RapidAssessment, OfflineQueueItem, MediaAttachment } from '@dms/shared';

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

class OfflineDatabase extends Dexie {
  assessments!: Table<AssessmentRecord>;
  queue!: Table<QueueRecord>;
  media!: Table<MediaRecord>;
  drafts!: Table<DraftAssessment>;

  constructor() {
    super('DMSOfflineDB');
    
    this.version(1).stores({
      assessments: '++id, type, date, affectedEntityId, assessorId, syncStatus, verificationStatus, offlineId, lastModified',
      queue: '++id, type, action, entityId, priority, createdAt, lastAttempt, retryCount, lastModified',
      media: '++id, assessmentId, mimeType, size, isUploaded, lastModified',
      drafts: '++id, type, lastSaved',
    });

    // Add hooks for automatic timestamp updates
    this.assessments.hook('creating', (primKey, obj, trans) => {
      obj.lastModified = new Date();
    });

    this.assessments.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.lastModified = new Date();
    });

    this.queue.hook('creating', (primKey, obj, trans) => {
      obj.lastModified = new Date();
    });

    this.queue.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.lastModified = new Date();
    });

    this.media.hook('creating', (primKey, obj, trans) => {
      obj.lastModified = new Date();
    });

    this.media.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.lastModified = new Date();
    });
  }

  // Assessment operations
  async saveAssessment(assessment: RapidAssessment, isDraft = false): Promise<string> {
    const record: AssessmentRecord = {
      ...assessment,
      isDraft,
      lastModified: new Date(),
    };

    // Encrypt sensitive data if needed
    if (this.shouldEncryptData(assessment)) {
      record.encryptedData = await this.encryptData(assessment.data);
    }

    return await this.assessments.put(record);
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

  // Queue operations
  async addToQueue(item: Omit<QueueRecord, 'id' | 'lastModified'>): Promise<string> {
    return await this.queue.add({
      ...item,
      lastModified: new Date(),
    });
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

  // Draft operations
  async saveDraft(draft: Omit<DraftAssessment, 'lastSaved'>): Promise<string> {
    return await this.drafts.put({
      ...draft,
      lastSaved: new Date(),
    });
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

  // Utility methods
  private shouldEncryptData(assessment: RapidAssessment): boolean {
    // Encrypt assessments with sensitive personal data
    return assessment.type === 'POPULATION' || assessment.type === 'HEALTH';
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

    // Remove old queue items
    await this.queue
      .where('lastModified')
      .below(olderThan)
      .delete();

    // Remove old drafts
    await this.drafts
      .where('lastSaved')
      .below(olderThan)
      .delete();
  }
}

// Create and export the database instance
export const db = new OfflineDatabase();