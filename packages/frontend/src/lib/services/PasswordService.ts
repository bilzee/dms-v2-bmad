import { randomBytes, createHash } from 'crypto'

export class PasswordService {
  /**
   * Generate cryptographically secure password
   */
  static generateSecurePassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    const bytes = randomBytes(length)
    let password = ''
    
    for (let i = 0; i < length; i++) {
      password += charset[bytes[i] % charset.length]
    }
    
    return password
  }

  /**
   * Generate reset token for password links
   */
  static generateResetToken(): string {
    return randomBytes(32).toString('hex')
  }

  /**
   * Hash password for secure storage (if needed)
   */
  static hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex')
  }

  /**
   * Generate temporary password with expiry
   */
  static generateTemporaryCredentials() {
    return {
      password: this.generateSecurePassword(12),
      resetToken: this.generateResetToken(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }
  }

  /**
   * Validate password strength (optional utility)
   */
  static validatePasswordStrength(password: string): {
    isStrong: boolean;
    score: number;
    suggestions: string[];
  } {
    let score = 0;
    const suggestions: string[] = [];

    // Check length
    if (password.length >= 8) score += 20;
    else suggestions.push('Use at least 8 characters');

    // Check for lowercase
    if (/[a-z]/.test(password)) score += 20;
    else suggestions.push('Include lowercase letters');

    // Check for uppercase
    if (/[A-Z]/.test(password)) score += 20;
    else suggestions.push('Include uppercase letters');

    // Check for numbers
    if (/\d/.test(password)) score += 20;
    else suggestions.push('Include numbers');

    // Check for special characters
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 20;
    else suggestions.push('Include special characters');

    return {
      isStrong: score >= 80,
      score,
      suggestions
    };
  }
}