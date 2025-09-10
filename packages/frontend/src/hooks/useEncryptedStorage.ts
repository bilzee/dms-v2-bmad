/**
 * Epic 10: useEncryptedStorage Hook
 * React hook for managing encrypted offline storage in PWA
 * Provides easy access to secure data storage throughout the app
 */

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import SensitiveDataManager, { DataSensitivity } from '@/lib/encryption/SensitiveDataManager';
import { SensitiveDataType } from '@/lib/encryption/EncryptedStorage';
import type { RapidAssessment, RapidResponse, Incident } from '@dms/shared';

export interface StorageMetrics {
  totalItems: number;
  encryptedSize: number;
  byDataType: Record<SensitiveDataType, number>;
  oldItems: number;
  securityLevel: string;
  gdprCompliant: boolean;
  encryptionSupported: boolean;
}

export interface EncryptedStorageHook {
  // Initialization state
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Storage operations
  storeAssessment: (assessment: RapidAssessment) => Promise<void>;
  getAssessment: (id: string) => Promise<RapidAssessment | null>;
  
  storeIncident: (incident: Incident) => Promise<void>;
  getIncident: (id: string) => Promise<Incident | null>;
  
  storeResponse: (response: RapidResponse) => Promise<void>;
  getResponse: (id: string) => Promise<RapidResponse | null>;

  // Utility functions
  listByType: (dataType: SensitiveDataType) => Promise<string[]>;
  getMetrics: () => Promise<StorageMetrics>;
  performCleanup: () => Promise<{ itemsRemoved: number; dataTypes: string[] }>;
  clearAllData: () => Promise<void>;

  // Security validation
  requiresEncryption: (dataType: string) => boolean;
  getClassification: (dataType: string) => { sensitivity: DataSensitivity; encrypted: boolean } | null;
}

export const useEncryptedStorage = (): EncryptedStorageHook => {
  const { data: session } = useSession();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize encryption when user session is available
  useEffect(() => {
    const initializeEncryption = async () => {
      if (!session?.user?.id) {
        setIsInitialized(false);
        setIsLoading(false);
        setError('User session required for encryption');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Use session data to initialize encryption
        const sessionToken = (session as any).sessionToken || session.user.id;
        await SensitiveDataManager.initialize(session.user.id, sessionToken);
        
        setIsInitialized(true);
        console.log('Encrypted storage initialized for user:', session.user.id);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize encryption';
        setError(errorMessage);
        setIsInitialized(false);
        console.error('Encryption initialization failed:', error);

      } finally {
        setIsLoading(false);
      }
    };

    initializeEncryption();
  }, [session?.user?.id]);

  // Cleanup on session end
  useEffect(() => {
    const handleSessionEnd = async () => {
      if (!session && isInitialized) {
        try {
          await SensitiveDataManager.clearAllData();
          setIsInitialized(false);
          console.log('Encrypted storage cleared on session end');
        } catch (error) {
          console.error('Failed to clear encrypted storage:', error);
        }
      }
    };

    handleSessionEnd();
  }, [session, isInitialized]);

  // Assessment operations
  const storeAssessment = useCallback(async (assessment: RapidAssessment): Promise<void> => {
    if (!isInitialized) {
      throw new Error('Encrypted storage not initialized');
    }
    await SensitiveDataManager.storeAssessment(assessment);
  }, [isInitialized]);

  const getAssessment = useCallback(async (id: string): Promise<RapidAssessment | null> => {
    if (!isInitialized) {
      console.warn('Encrypted storage not initialized - returning null');
      return null;
    }
    return SensitiveDataManager.getAssessment(id);
  }, [isInitialized]);

  // Incident operations
  const storeIncident = useCallback(async (incident: Incident): Promise<void> => {
    if (!isInitialized) {
      throw new Error('Encrypted storage not initialized');
    }
    await SensitiveDataManager.storeIncident(incident);
  }, [isInitialized]);

  const getIncident = useCallback(async (id: string): Promise<Incident | null> => {
    if (!isInitialized) {
      console.warn('Encrypted storage not initialized - returning null');
      return null;
    }
    return SensitiveDataManager.getIncident(id);
  }, [isInitialized]);

  // Response operations
  const storeResponse = useCallback(async (response: RapidResponse): Promise<void> => {
    if (!isInitialized) {
      throw new Error('Encrypted storage not initialized');
    }
    await SensitiveDataManager.storeResponse(response);
  }, [isInitialized]);

  const getResponse = useCallback(async (id: string): Promise<RapidResponse | null> => {
    if (!isInitialized) {
      console.warn('Encrypted storage not initialized - returning null');
      return null;
    }
    return SensitiveDataManager.getResponse(id);
  }, [isInitialized]);

  // Utility operations
  const listByType = useCallback(async (dataType: SensitiveDataType): Promise<string[]> => {
    if (!isInitialized) {
      return [];
    }
    return SensitiveDataManager.listByType(dataType);
  }, [isInitialized]);

  const getMetrics = useCallback(async (): Promise<StorageMetrics> => {
    if (!isInitialized) {
      return {
        totalItems: 0,
        encryptedSize: 0,
        byDataType: {} as Record<SensitiveDataType, number>,
        oldItems: 0,
        securityLevel: 'Not initialized',
        gdprCompliant: false,
        encryptionSupported: false,
      };
    }
    return SensitiveDataManager.getStorageMetrics();
  }, [isInitialized]);

  const performCleanup = useCallback(async () => {
    if (!isInitialized) {
      return { itemsRemoved: 0, dataTypes: [] };
    }
    return SensitiveDataManager.performDataCleanup();
  }, [isInitialized]);

  const clearAllData = useCallback(async (): Promise<void> => {
    await SensitiveDataManager.clearAllData();
    setIsInitialized(false);
  }, []);

  // Security validation functions
  const requiresEncryption = useCallback((dataType: string): boolean => {
    return SensitiveDataManager.requiresEncryption(dataType);
  }, []);

  const getClassification = useCallback((dataType: string) => {
    const classification = SensitiveDataManager.getClassification(dataType);
    return classification ? {
      sensitivity: classification.sensitivity,
      encrypted: classification.requiresEncryption
    } : null;
  }, []);

  return {
    // State
    isInitialized,
    isLoading,
    error,

    // Assessment operations
    storeAssessment,
    getAssessment,

    // Incident operations
    storeIncident,
    getIncident,

    // Response operations
    storeResponse,
    getResponse,

    // Utilities
    listByType,
    getMetrics,
    performCleanup,
    clearAllData,

    // Security
    requiresEncryption,
    getClassification,
  };
};

export default useEncryptedStorage;