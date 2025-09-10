/**
 * Epic 10: Offline Data Encryption Service
 * Encrypts sensitive humanitarian data for offline PWA storage
 * Uses Web Crypto API with AES-GCM for maximum security
 */

export interface EncryptedData {
  data: string;        // Base64 encoded encrypted data
  iv: string;          // Base64 encoded initialization vector
  salt: string;        // Base64 encoded salt for key derivation
  timestamp: number;   // Encryption timestamp for key rotation
}

export interface EncryptionOptions {
  keyDerivationIterations?: number;
  keyLength?: number;
  algorithm?: 'AES-GCM';
}

export class OfflineEncryption {
  private static readonly DEFAULT_OPTIONS: Required<EncryptionOptions> = {
    keyDerivationIterations: 100000, // OWASP recommended minimum
    keyLength: 256, // AES-256
    algorithm: 'AES-GCM'
  };

  private keyCache = new Map<string, CryptoKey>();
  private keyRotationInterval = 24 * 60 * 60 * 1000; // 24 hours

  constructor(private options: EncryptionOptions = {}) {
    this.options = { ...OfflineEncryption.DEFAULT_OPTIONS, ...options };
  }

  /**
   * Derives encryption key from user credentials using PBKDF2
   */
  private async deriveKey(
    password: string,
    salt: Uint8Array,
    iterations: number = this.options.keyDerivationIterations!
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256',
      },
      passwordKey,
      {
        name: 'AES-GCM',
        length: this.options.keyLength!,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generates cryptographically secure random bytes
   */
  private generateRandomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  /**
   * Creates a cache key for derived encryption keys
   */
  private createCacheKey(userId: string, salt: string): string {
    return `${userId}-${salt}`;
  }

  /**
   * Encrypts sensitive data for offline storage
   */
  async encrypt(
    data: string,
    userId: string,
    userKey: string // Derived from user session/password
  ): Promise<EncryptedData> {
    try {
      // Generate random salt and IV
      const salt = this.generateRandomBytes(32); // 256 bits
      const iv = this.generateRandomBytes(12);   // 96 bits for AES-GCM

      // Check cache or derive new key
      const cacheKey = this.createCacheKey(userId, btoa(String.fromCharCode(...salt)));
      let encryptionKey = this.keyCache.get(cacheKey);
      
      if (!encryptionKey) {
        encryptionKey = await this.deriveKey(userKey, salt);
        this.keyCache.set(cacheKey, encryptionKey);
        
        // Set cache cleanup after key rotation interval
        setTimeout(() => {
          this.keyCache.delete(cacheKey);
        }, this.keyRotationInterval);
      }

      // Encrypt the data
      const encoder = new TextEncoder();
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
          additionalData: encoder.encode(userId), // Bind to specific user
        },
        encryptionKey,
        encoder.encode(data)
      );

      return {
        data: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
        iv: btoa(String.fromCharCode(...iv)),
        salt: btoa(String.fromCharCode(...salt)),
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  /**
   * Decrypts offline stored data
   */
  async decrypt(
    encryptedData: EncryptedData,
    userId: string,
    userKey: string
  ): Promise<string> {
    try {
      // Convert base64 back to bytes
      const data = Uint8Array.from(atob(encryptedData.data), c => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
      const salt = Uint8Array.from(atob(encryptedData.salt), c => c.charCodeAt(0));

      // Check for key rotation (older than 24 hours)
      if (Date.now() - encryptedData.timestamp > this.keyRotationInterval) {
        console.warn('Decrypting data with expired key - consider re-encryption');
      }

      // Check cache or derive key
      const cacheKey = this.createCacheKey(userId, encryptedData.salt);
      let decryptionKey = this.keyCache.get(cacheKey);
      
      if (!decryptionKey) {
        decryptionKey = await this.deriveKey(userKey, salt);
        this.keyCache.set(cacheKey, decryptionKey);
      }

      // Decrypt the data
      const encoder = new TextEncoder();
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
          additionalData: encoder.encode(userId), // Verify user binding
        },
        decryptionKey,
        data
      );

      return new TextDecoder().decode(decryptedBuffer);

    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt offline data - may be corrupted or wrong key');
    }
  }

  /**
   * Checks if data needs re-encryption (key rotation)
   */
  needsReencryption(encryptedData: EncryptedData): boolean {
    return Date.now() - encryptedData.timestamp > this.keyRotationInterval;
  }

  /**
   * Clears all cached keys (logout/security cleanup)
   */
  clearKeyCache(): void {
    this.keyCache.clear();
  }

  /**
   * Validates that Web Crypto API is available
   */
  static isSupported(): boolean {
    return (
      typeof crypto !== 'undefined' &&
      typeof crypto.subtle !== 'undefined' &&
      typeof crypto.getRandomValues !== 'undefined'
    );
  }

  /**
   * Generates a secure user key from session data
   */
  static generateUserKey(userId: string, sessionToken: string, timestamp: number): string {
    // Combine user data to create deterministic but secure key
    return `${userId}:${sessionToken}:${Math.floor(timestamp / (24 * 60 * 60 * 1000))}`;
  }
}

export default OfflineEncryption;