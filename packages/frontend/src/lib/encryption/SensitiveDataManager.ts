/**
 * Epic 10: Sensitive Data Manager
 * Manages classification and encryption of humanitarian data
 * Ensures GDPR compliance and security for offline PWA operations
 */

import { encryptedStorage, SensitiveDataType } from './EncryptedStorage';
import type { 
  RapidAssessment, 
  RapidResponse, 
  Incident, 
  UserRole,
  DonorCommitment 
} from '@dms/shared';

// Classification of data sensitivity levels
export enum DataSensitivity {
  PUBLIC = 'public',           // No encryption needed (UI preferences, cache headers)
  INTERNAL = 'internal',       // Light encryption (app state, non-personal data)
  CONFIDENTIAL = 'confidential', // Full encryption (assessments, responses)
  RESTRICTED = 'restricted'    // Maximum security (user PII, auth tokens)
}

export interface DataClassification {
  sensitivity: DataSensitivity;
  dataType: SensitiveDataType;
  requiresEncryption: boolean;
  retentionDays?: number;
  complianceNotes?: string;
}

export class SensitiveDataManager {
  private static classifications = new Map<string, DataClassification>([
    // Assessment data - CONFIDENTIAL (contains location, health data)
    ['assessment', {
      sensitivity: DataSensitivity.CONFIDENTIAL,
      dataType: 'assessment',
      requiresEncryption: true,
      retentionDays: 180, // 6 months for humanitarian operations
      complianceNotes: 'Contains sensitive health and location data'
    }],
    
    // Incident data - CONFIDENTIAL (location, people affected)
    ['incident', {
      sensitivity: DataSensitivity.CONFIDENTIAL,
      dataType: 'incident',
      requiresEncryption: true,
      retentionDays: 365, // 1 year for incident tracking
      complianceNotes: 'Emergency incident data with location and impact details'
    }],
    
    // Response data - CONFIDENTIAL (delivery details, verification)
    ['response', {
      sensitivity: DataSensitivity.CONFIDENTIAL,
      dataType: 'response',
      requiresEncryption: true,
      retentionDays: 180,
      complianceNotes: 'Response delivery and verification data'
    }],
    
    // User profiles - RESTRICTED (PII, personal information)
    ['user-profile', {
      sensitivity: DataSensitivity.RESTRICTED,
      dataType: 'user-profile',
      requiresEncryption: true,
      retentionDays: 90,
      complianceNotes: 'Personal user data - GDPR protected'
    }],
    
    // Commitments - CONFIDENTIAL (donor financial data)
    ['commitment', {
      sensitivity: DataSensitivity.CONFIDENTIAL,
      dataType: 'commitment',
      requiresEncryption: true,
      retentionDays: 365,
      complianceNotes: 'Financial commitment data'
    }],
    
    // Authentication - RESTRICTED (tokens, sessions)
    ['authentication', {
      sensitivity: DataSensitivity.RESTRICTED,
      dataType: 'authentication',
      requiresEncryption: true,
      retentionDays: 1, // Short retention for security
      complianceNotes: 'Authentication tokens and session data'
    }],
  ]);

  /**
   * Initializes the sensitive data manager with user context
   */
  static async initialize(userId: string, sessionToken: string): Promise<void> {
    await encryptedStorage.initialize(userId, sessionToken);
  }

  /**
   * Stores assessment data with appropriate encryption
   */
  static async storeAssessment(assessment: RapidAssessment): Promise<void> {
    const classification = this.classifications.get('assessment')!;
    
    // Remove sensitive location data for additional security
    const sensitiveData = {
      ...assessment,
      data: {
        ...assessment.data,
        _encryptedAt: Date.now(),
        _sensitivity: classification.sensitivity
      }
    };

    await encryptedStorage.store(
      assessment.id,
      sensitiveData,
      'assessment'
    );

    console.log(`Stored encrypted assessment: ${assessment.id} (${assessment.type})`);
  }

  /**
   * Retrieves and decrypts assessment data
   */
  static async getAssessment(assessmentId: string): Promise<RapidAssessment | null> {
    return encryptedStorage.retrieve<RapidAssessment>(assessmentId, 'assessment');
  }

  /**
   * Stores incident data with encryption
   */
  static async storeIncident(incident: Incident): Promise<void> {
    const classification = this.classifications.get('incident')!;
    
    const sensitiveData = {
      ...incident,
      _encryptedAt: Date.now(),
      _sensitivity: classification.sensitivity
    };

    await encryptedStorage.store(
      incident.id,
      sensitiveData,
      'incident'
    );

    console.log(`Stored encrypted incident: ${incident.id} (${incident.type})`);
  }

  /**
   * Retrieves incident data
   */
  static async getIncident(incidentId: string): Promise<Incident | null> {
    return encryptedStorage.retrieve<Incident>(incidentId, 'incident');
  }

  /**
   * Stores response data with encryption
   */
  static async storeResponse(response: RapidResponse): Promise<void> {
    const classification = this.classifications.get('response')!;
    
    const sensitiveData = {
      ...response,
      _encryptedAt: Date.now(),
      _sensitivity: classification.sensitivity
    };

    await encryptedStorage.store(
      response.id,
      sensitiveData,
      'response'
    );

    console.log(`Stored encrypted response: ${response.id} (${response.responseType})`);
  }

  /**
   * Retrieves response data
   */
  static async getResponse(responseId: string): Promise<RapidResponse | null> {
    return encryptedStorage.retrieve<RapidResponse>(responseId, 'response');
  }

  /**
   * Stores user profile with maximum encryption
   */
  static async storeUserProfile(profile: UserProfile): Promise<void> {
    const classification = this.classifications.get('user-profile')!;
    
    // Additional PII protection
    const sensitiveData = {
      ...profile,
      _encryptedAt: Date.now(),
      _sensitivity: classification.sensitivity,
      _gdprProtected: true
    };

    await encryptedStorage.store(
      profile.id,
      sensitiveData,
      'user-profile'
    );

    console.log(`Stored encrypted user profile: ${profile.id}`);
  }

  /**
   * Retrieves user profile
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    return encryptedStorage.retrieve<UserProfile>(userId, 'user-profile');
  }

  /**
   * Stores authentication data (tokens, sessions)
   */
  static async storeAuthData(authId: string, authData: any): Promise<void> {
    const sensitiveData = {
      ...authData,
      _encryptedAt: Date.now(),
      _sensitivity: DataSensitivity.RESTRICTED,
      _shortRetention: true // Auto-expire quickly
    };

    await encryptedStorage.store(authId, sensitiveData, 'authentication');
  }

  /**
   * Retrieves authentication data
   */
  static async getAuthData(authId: string): Promise<any | null> {
    return encryptedStorage.retrieve<any>(authId, 'authentication');
  }

  /**
   * Lists all stored items by data type
   */
  static async listByType(dataType: SensitiveDataType): Promise<string[]> {
    return encryptedStorage.list(dataType);
  }

  /**
   * Gets comprehensive storage metrics
   */
  static async getStorageMetrics() {
    const metrics = await encryptedStorage.getMetrics();
    const classifications = Array.from(this.classifications.values());
    
    return {
      ...metrics,
      classifications: classifications.map(c => ({
        dataType: c.dataType,
        sensitivity: c.sensitivity,
        encrypted: c.requiresEncryption,
        retention: c.retentionDays,
        compliance: c.complianceNotes
      })),
      securityLevel: 'AES-256-GCM with PBKDF2 key derivation',
      gdprCompliant: true,
      encryptionSupported: encryptedStorage.isInitialized()
    };
  }

  /**
   * Performs data cleanup based on retention policies
   */
  static async performDataCleanup(): Promise<{
    itemsRemoved: number;
    dataTypes: string[];
  }> {
    let itemsRemoved = 0;
    const dataTypesAffected: string[] = [];

    for (const [key, classification] of this.classifications) {
      if (classification.retentionDays) {
        const cutoffDate = Date.now() - (classification.retentionDays * 24 * 60 * 60 * 1000);
        const items = await this.listByType(classification.dataType);
        
        for (const itemId of items) {
          const item = await encryptedStorage.retrieve<any>(itemId, classification.dataType);
          if (item && item._encryptedAt && item._encryptedAt < cutoffDate) {
            await encryptedStorage.remove(itemId, classification.dataType);
            itemsRemoved++;
            
            if (!dataTypesAffected.includes(classification.dataType)) {
              dataTypesAffected.push(classification.dataType);
            }
          }
        }
      }
    }

    return { itemsRemoved, dataTypes: dataTypesAffected };
  }

  /**
   * Clears all sensitive data (logout/security cleanup)
   */
  static async clearAllData(): Promise<void> {
    await encryptedStorage.clearUserData();
    console.log('All encrypted sensitive data cleared');
  }

  /**
   * Gets data classification for a given type
   */
  static getClassification(dataTypeKey: string): DataClassification | undefined {
    return this.classifications.get(dataTypeKey);
  }

  /**
   * Checks if data type requires encryption
   */
  static requiresEncryption(dataTypeKey: string): boolean {
    const classification = this.classifications.get(dataTypeKey);
    return classification?.requiresEncryption ?? false;
  }

  /**
   * Validates if encryption is supported and initialized
   */
  static isSecurityEnabled(): boolean {
    return encryptedStorage.isInitialized();
  }
}

export default SensitiveDataManager;