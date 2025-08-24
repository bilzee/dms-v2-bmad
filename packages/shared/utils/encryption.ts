// Encryption utilities for sensitive data
// Uses Web Crypto API for client-side encryption

import { auditLog } from './auditLog';

/**
 * Generates a random encryption key using Web Crypto API
 */
async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Gets or creates an encryption key from environment or generates a new one
 * In production, this should use a proper key management system
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  // For development, we'll generate a key each time
  // In production, this should be retrieved from secure key storage
  const key = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;
  
  if (key) {
    // Import key from environment (base64 encoded)
    const keyBuffer = Uint8Array.from(atob(key), c => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    );
  } else {
    // Generate a new key for development
    return await generateKey();
  }
}

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param data The data to encrypt (as string)
 * @returns Promise<string> Base64 encoded encrypted data with IV
 */
export async function encryptSensitiveData(data: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encodedData
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Return as base64 string
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypts sensitive data using AES-256-GCM
 * @param encryptedData Base64 encoded encrypted data with IV
 * @returns Promise<string> Decrypted data
 */
export async function decryptSensitiveData(encryptedData: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12); // First 12 bytes are IV
    const encrypted = combined.slice(12); // Rest is encrypted data

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
}

/**
 * Encrypts GPS coordinates specifically
 * @param coordinates Object with latitude and longitude
 * @param userId User ID for audit logging
 * @param responseId Response ID for audit logging
 * @returns Promise<string> Encrypted GPS coordinates
 */
export async function encryptGPSCoordinates(
  coordinates: { latitude: number; longitude: number }, 
  userId?: string,
  responseId?: string
): Promise<string> {
  const encrypted = await encryptSensitiveData(JSON.stringify(coordinates));
  
  // Log the encryption operation for audit trail
  if (userId) {
    await auditLog.sensitiveDataProcessed('ENCRYPT', 'GPS_COORDINATES', userId, responseId);
  }
  
  return encrypted;
}

/**
 * Decrypts GPS coordinates specifically
 * @param encryptedCoordinates Encrypted GPS coordinates string
 * @returns Promise<{latitude: number, longitude: number}> Decrypted coordinates
 */
export async function decryptGPSCoordinates(encryptedCoordinates: string): Promise<{ latitude: number; longitude: number }> {
  const decrypted = await decryptSensitiveData(encryptedCoordinates);
  return JSON.parse(decrypted);
}

/**
 * Encrypts beneficiary demographic data
 * @param demographics Demographic breakdown object
 * @param userId User ID for audit logging
 * @param responseId Response ID for audit logging
 * @returns Promise<string> Encrypted demographic data
 */
export async function encryptDemographicData(
  demographics: any, 
  userId?: string, 
  responseId?: string
): Promise<string> {
  const encrypted = await encryptSensitiveData(JSON.stringify(demographics));
  
  // Log the encryption operation for audit trail
  if (userId) {
    await auditLog.sensitiveDataProcessed('ENCRYPT', 'DEMOGRAPHIC_DATA', userId, responseId);
  }
  
  return encrypted;
}

/**
 * Decrypts beneficiary demographic data
 * @param encryptedDemographics Encrypted demographic data string
 * @returns Promise<any> Decrypted demographic breakdown
 */
export async function decryptDemographicData(encryptedDemographics: string): Promise<any> {
  const decrypted = await decryptSensitiveData(encryptedDemographics);
  return JSON.parse(decrypted);
}