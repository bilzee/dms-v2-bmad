/**
 * Epic 10: Encrypted Storage Wrapper
 * Provides encrypted offline storage for sensitive humanitarian data
 * Integrates with Dexie IndexedDB and service worker caching
 */

import Dexie, { Table } from 'dexie';
import OfflineEncryption, { EncryptedData } from './OfflineEncryption';

// Define what data types are considered sensitive and need encryption
export type SensitiveDataType = 
  | 'assessment'           // Health, WASH, Food security assessments
  | 'incident'            // Incident reports with location data
  | 'response'            // Response verification data
  | 'user-profile'        // User personal information
  | 'commitment'          // Donor commitment data
  | 'authentication';     // Auth tokens and sessions

export interface EncryptedStorageItem {
  id: string;
  dataType: SensitiveDataType;
  encryptedData: EncryptedData;
  userId: string;
  metadata: {
    originalSize: number;
    encryptedAt: number;
    lastAccessed: number;
  };
}

export interface StorageMetrics {
  totalItems: number;
  encryptedSize: number;
  byDataType: Record<SensitiveDataType, number>;
  oldItems: number; // Items needing re-encryption
}

class EncryptedStorageDB extends Dexie {
  encryptedItems!: Table<EncryptedStorageItem>;

  constructor() {
    super('EncryptedStorage');
    
    this.version(1).stores({
      encryptedItems: '++id, dataType, userId, metadata.encryptedAt, metadata.lastAccessed'
    });

    // Add indexes for better query performance
    this.version(2).stores({
      encryptedItems: '++id, dataType, userId, [dataType+userId], metadata.encryptedAt, metadata.lastAccessed'
    });
  }
}

export class EncryptedStorage {
  private db: EncryptedStorageDB;
  private encryption: OfflineEncryption;
  private currentUserId: string | null = null;
  private userKey: string | null = null;

  constructor() {
    this.db = new EncryptedStorageDB();
    this.encryption = new OfflineEncryption({
      keyDerivationIterations: 100000, // OWASP standard
      keyLength: 256, // AES-256
    });
  }

  /**
   * Initializes encryption for a specific user session
   */
  async initialize(userId: string, sessionToken: string): Promise<void> {
    if (!OfflineEncryption.isSupported()) {
      throw new Error('Web Crypto API not supported - encryption unavailable');
    }

    this.currentUserId = userId;
    this.userKey = OfflineEncryption.generateUserKey(
      userId,
      sessionToken,
      Date.now()
    );

    // Perform background cleanup of old encrypted data
    this.scheduleCleanup();
  }

  /**
   * Stores sensitive data with encryption
   */
  async store<T>(
    id: string,
    data: T,
    dataType: SensitiveDataType
  ): Promise<void> {
    if (!this.currentUserId || !this.userKey) {
      throw new Error('EncryptedStorage not initialized');
    }

    try {
      const serializedData = JSON.stringify(data);
      const encryptedData = await this.encryption.encrypt(
        serializedData,
        this.currentUserId,
        this.userKey
      );

      const item: EncryptedStorageItem = {
        id,
        dataType,
        encryptedData,
        userId: this.currentUserId,
        metadata: {
          originalSize: serializedData.length,
          encryptedAt: Date.now(),
          lastAccessed: Date.now(),
        },
      };

      await this.db.encryptedItems.put(item);

    } catch (error) {
      console.error(`Failed to store encrypted ${dataType}:`, error);
      throw new Error(`Failed to store encrypted ${dataType} data`);
    }
  }

  /**
   * Retrieves and decrypts stored data
   */
  async retrieve<T>(id: string, dataType: SensitiveDataType): Promise<T | null> {
    if (!this.currentUserId || !this.userKey) {
      throw new Error('EncryptedStorage not initialized');
    }

    try {
      const item = await this.db.encryptedItems
        .where({ id, dataType, userId: this.currentUserId })
        .first();

      if (!item) {
        return null;
      }

      // Update last accessed time
      await this.db.encryptedItems.update(item.id, {
        'metadata.lastAccessed': Date.now()
      });

      // Decrypt and deserialize
      const decryptedData = await this.encryption.decrypt(
        item.encryptedData,
        this.currentUserId,
        this.userKey
      );

      // Check if re-encryption is needed
      if (this.encryption.needsReencryption(item.encryptedData)) {
        this.scheduleReencryption(id, dataType, decryptedData);
      }

      return JSON.parse(decryptedData) as T;

    } catch (error) {
      console.error(`Failed to retrieve encrypted ${dataType}:`, error);
      return null; // Graceful degradation - don't block app
    }
  }

  /**
   * Lists all stored items for a specific data type
   */
  async list(dataType: SensitiveDataType): Promise<string[]> {
    if (!this.currentUserId) {
      return [];
    }

    try {
      const items = await this.db.encryptedItems
        .where({ dataType, userId: this.currentUserId })
        .keys();

      return items as string[];

    } catch (error) {
      console.error(`Failed to list encrypted ${dataType} items:`, error);
      return [];
    }
  }

  /**
   * Removes encrypted data
   */
  async remove(id: string, dataType: SensitiveDataType): Promise<void> {
    if (!this.currentUserId) {
      return;
    }

    try {
      await this.db.encryptedItems
        .where({ id, dataType, userId: this.currentUserId })
        .delete();

    } catch (error) {
      console.error(`Failed to remove encrypted ${dataType}:`, error);
      // Don't throw - removal failures shouldn't block functionality
    }
  }

  /**
   * Gets storage metrics for monitoring
   */
  async getMetrics(): Promise<StorageMetrics> {
    if (!this.currentUserId) {
      return {
        totalItems: 0,
        encryptedSize: 0,
        byDataType: {} as Record<SensitiveDataType, number>,
        oldItems: 0,
      };
    }

    try {
      const items = await this.db.encryptedItems
        .where({ userId: this.currentUserId })
        .toArray();

      const metrics: StorageMetrics = {
        totalItems: items.length,
        encryptedSize: 0,
        byDataType: {} as Record<SensitiveDataType, number>,
        oldItems: 0,
      };

      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

      items.forEach(item => {
        metrics.encryptedSize += item.encryptedData.data.length;
        metrics.byDataType[item.dataType] = (metrics.byDataType[item.dataType] || 0) + 1;
        
        if (item.encryptedData.timestamp < oneDayAgo) {
          metrics.oldItems++;
        }
      });

      return metrics;

    } catch (error) {
      console.error('Failed to get storage metrics:', error);
      return {
        totalItems: 0,
        encryptedSize: 0,
        byDataType: {} as Record<SensitiveDataType, number>,
        oldItems: 0,
      };
    }
  }

  /**
   * Clears all encrypted data for current user (logout/cleanup)
   */
  async clearUserData(): Promise<void> {
    if (!this.currentUserId) {
      return;
    }

    try {
      await this.db.encryptedItems
        .where({ userId: this.currentUserId })
        .delete();

      this.encryption.clearKeyCache();

    } catch (error) {
      console.error('Failed to clear user encrypted data:', error);
    } finally {
      this.currentUserId = null;
      this.userKey = null;
    }
  }

  /**
   * Schedules background re-encryption of old data
   */
  private async scheduleReencryption(id: string, dataType: SensitiveDataType, data: string): Promise<void> {
    // Background re-encryption to avoid blocking UI
    setTimeout(async () => {
      try {
        if (this.currentUserId && this.userKey) {
          const encryptedData = await this.encryption.encrypt(
            data,
            this.currentUserId,
            this.userKey
          );

          await this.db.encryptedItems
            .where({ id, dataType, userId: this.currentUserId })
            .modify({ encryptedData });
        }
      } catch (error) {
        console.warn('Background re-encryption failed:', error);
      }
    }, 5000); // 5 second delay
  }

  /**
   * Schedules cleanup of very old encrypted data
   */
  private scheduleCleanup(): void {
    // Weekly cleanup of data older than 30 days
    setTimeout(async () => {
      try {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        
        await this.db.encryptedItems
          .where('metadata.lastAccessed')
          .below(thirtyDaysAgo)
          .delete();

      } catch (error) {
        console.warn('Background cleanup failed:', error);
      }
    }, 60000); // 1 minute delay
  }

  /**
   * Checks if storage is properly initialized
   */
  isInitialized(): boolean {
    return this.currentUserId !== null && this.userKey !== null;
  }
}

// Export singleton instance
export const encryptedStorage = new EncryptedStorage();
export default EncryptedStorage;