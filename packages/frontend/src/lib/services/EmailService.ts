import nodemailer from 'nodemailer'

interface WelcomeEmailData {
  name: string
  email: string
  temporaryPassword: string
  resetToken: string
  organizationName?: string
}

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false
    }
  })

  /**
   * Send welcome email with temporary credentials
   */
  static async sendWelcomeEmail(userData: WelcomeEmailData): Promise<void> {
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${userData.resetToken}`
    
    const mailOptions = {
      from: {
        name: 'DMS Admin',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
      },
      to: userData.email,
      subject: 'Welcome to DMS - Account Created',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2>Welcome to the Disaster Management System</h2>
          
          <p>Hello ${userData.name},</p>
          
          <p>Your account has been created successfully. Here are your login credentials:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Email:</strong> ${userData.email}</p>
            <p><strong>Temporary Password:</strong> <code>${userData.temporaryPassword}</code></p>
          </div>
          
          <p><strong>⚠️ Important Security Notice:</strong></p>
          <ul>
            <li>This temporary password expires in 24 hours</li>
            <li>You must change your password on first login</li>
            <li>Keep these credentials secure</li>
          </ul>
          
          <p>
            <a href="${resetUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
              Set Permanent Password
            </a>
          </p>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            If you did not expect this email, please contact your system administrator immediately.
          </p>
        </div>
      `
    }

    try {
      await this.transporter.sendMail(mailOptions)
      console.log(`Welcome email sent successfully to ${userData.email}`)
    } catch (error) {
      console.error('Failed to send welcome email:', error)
      throw new Error('Failed to send welcome email')
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(userData: { name: string; email: string; resetToken: string }): Promise<void> {
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${userData.resetToken}`
    
    const mailOptions = {
      from: {
        name: 'DMS Admin',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
      },
      to: userData.email,
      subject: 'DMS - Password Reset Request',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2>Password Reset Request</h2>
          
          <p>Hello ${userData.name},</p>
          
          <p>A password reset was requested for your DMS account. If you did not request this, please ignore this email.</p>
          
          <p>To reset your password, click the button below:</p>
          
          <p>
            <a href="${resetUrl}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
              Reset Password
            </a>
          </p>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          
          <p><strong>This link will expire in 24 hours.</strong></p>
          
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            If you did not request this password reset, please contact your system administrator immediately.
          </p>
        </div>
      `
    }

    try {
      await this.transporter.sendMail(mailOptions)
      console.log(`Password reset email sent successfully to ${userData.email}`)
    } catch (error) {
      console.error('Failed to send password reset email:', error)
      throw new Error('Failed to send password reset email')
    }
  }

  /**
   * Send bulk import notification email
   */
  static async sendBulkImportNotification(adminEmail: string, results: { successful: number; failed: number; importId: string }): Promise<void> {
    const mailOptions = {
      from: {
        name: 'DMS System',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
      },
      to: adminEmail,
      subject: 'DMS - Bulk User Import Completed',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2>Bulk User Import Results</h2>
          
          <p>Your bulk user import has been completed.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3>Import Summary</h3>
            <p><strong>Import ID:</strong> ${results.importId}</p>
            <p><strong>Successfully Created:</strong> ${results.successful} users</p>
            <p><strong>Failed:</strong> ${results.failed} users</p>
            <p><strong>Total Processed:</strong> ${results.successful + results.failed} users</p>
          </div>
          
          ${results.successful > 0 ? `
          <p style="color: #28a745;">
            ✅ ${results.successful} users were successfully created and have been sent welcome emails with temporary credentials.
          </p>
          ` : ''}
          
          ${results.failed > 0 ? `
          <p style="color: #dc3545;">
            ❌ ${results.failed} users could not be created. Please check the import logs for details.
          </p>
          ` : ''}
          
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated notification from the DMS system.
          </p>
        </div>
      `
    }

    try {
      await this.transporter.sendMail(mailOptions)
      console.log(`Bulk import notification sent successfully to ${adminEmail}`)
    } catch (error) {
      console.error('Failed to send bulk import notification:', error)
      // Don't throw error for notification failures
    }
  }

  /**
   * Test email configuration
   */
  static async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('SMTP connection test failed:', error)
      return false
    }
  }
}