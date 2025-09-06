// lib/audit-export.ts

import { AuditDataExportRequest, AuditDataExportResponse } from '@dms/shared/types/admin';
import { auditLogger } from './audit-logger';
import prisma from './prisma';
import { writeFileSync, createReadStream } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Audit Data Export Service
 * Handles exporting audit data to various formats
 */
export class AuditExportService {
  private static instance: AuditExportService;
  private exportDir: string;

  constructor() {
    this.exportDir = join(tmpdir(), 'dms-audit-exports');
    // Ensure export directory exists
    try {
      const fs = require('fs');
      if (!fs.existsSync(this.exportDir)) {
        fs.mkdirSync(this.exportDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create export directory:', error);
    }
  }

  static getInstance(): AuditExportService {
    if (!AuditExportService.instance) {
      AuditExportService.instance = new AuditExportService();
    }
    return AuditExportService.instance;
  }

  /**
   * Create a new audit data export
   */
  async createExport(
    request: AuditDataExportRequest,
    requestedBy: string,
    requestedByName: string
  ): Promise<{ exportId: string; status: 'PROCESSING' }> {
    try {
      // Create export record in database
      const auditExport = await prisma.auditExport.create({
        data: {
          format: request.format,
          dataTypes: request.dataTypes,
          dateRangeStart: request.dateRange.start,
          dateRangeEnd: request.dateRange.end,
          filters: request.filters || {},
          includeMetadata: request.includeMetadata || false,
          compressOutput: request.compressOutput || false,
          requestedBy,
          requestedByName,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
      });

      // Start background processing
      this.processExportAsync(auditExport.id);

      return {
        exportId: auditExport.id,
        status: 'PROCESSING'
      };
    } catch (error) {
      console.error('Failed to create audit export:', error);
      throw error;
    }
  }

  /**
   * Get export status
   */
  async getExportStatus(exportId: string): Promise<AuditDataExportResponse['data'] | null> {
    try {
      const auditExport = await prisma.auditExport.findUnique({
        where: { id: exportId }
      });

      if (!auditExport) {
        return null;
      }

      return {
        exportId: auditExport.id,
        status: auditExport.status as any,
        downloadUrl: auditExport.downloadUrl || undefined,
        expiresAt: auditExport.expiresAt || undefined,
        fileSize: auditExport.fileSize || undefined,
        recordCount: auditExport.recordCount || undefined,
        estimatedTimeRemaining: auditExport.estimatedTime || undefined
      };
    } catch (error) {
      console.error('Failed to get export status:', error);
      return null;
    }
  }

  /**
   * Process export asynchronously
   */
  private async processExportAsync(exportId: string): Promise<void> {
    try {
      const auditExport = await prisma.auditExport.findUnique({
        where: { id: exportId }
      });

      if (!auditExport) {
        throw new Error('Export not found');
      }

      // Gather data based on data types
      const data: any = {};

      if (auditExport.dataTypes.includes('USER_ACTIVITY')) {
        data.userActivities = await this.gatherUserActivities(auditExport);
      }

      if (auditExport.dataTypes.includes('SECURITY_EVENTS')) {
        data.securityEvents = await this.gatherSecurityEvents(auditExport);
      }

      if (auditExport.dataTypes.includes('PERFORMANCE_METRICS')) {
        data.performanceMetrics = await this.gatherPerformanceMetrics(auditExport);
      }

      // Generate file based on format
      const filePath = await this.generateExportFile(auditExport, data);
      
      // Calculate file size
      const fs = require('fs');
      const stats = fs.statSync(filePath);
      
      // Calculate total records
      const totalRecords = Object.values(data).reduce((sum: number, arr: any) => {
        return sum + (Array.isArray(arr) ? arr.length : 0);
      }, 0);

      // Update export record with completion info
      await prisma.auditExport.update({
        where: { id: exportId },
        data: {
          status: 'COMPLETED',
          downloadUrl: `/api/v1/admin/audit/exports/${exportId}/download`,
          fileSize: stats.size,
          recordCount: totalRecords,
          completedAt: new Date()
        }
      });

    } catch (error) {
      console.error('Export processing failed:', error);
      
      // Update export record with error
      await prisma.auditExport.update({
        where: { id: exportId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      });
    }
  }

  /**
   * Gather user activity data
   */
  private async gatherUserActivities(auditExport: any): Promise<any[]> {
    const filters = auditExport.filters?.activity || {};
    
    return await auditLogger.getActivityLogs({
      startDate: auditExport.dateRangeStart,
      endDate: auditExport.dateRangeEnd,
      userId: filters.userId,
      eventType: filters.eventType,
      severity: filters.severity,
      module: filters.module,
      limit: 10000 // Large limit for export
    });
  }

  /**
   * Gather security event data
   */
  private async gatherSecurityEvents(auditExport: any): Promise<any[]> {
    const filters = auditExport.filters?.security || {};
    
    return await auditLogger.getSecurityEvents({
      startDate: auditExport.dateRangeStart,
      endDate: auditExport.dateRangeEnd,
      userId: filters.userId,
      eventType: filters.eventType,
      severity: filters.severity,
      requiresInvestigation: filters.requiresInvestigation,
      limit: 10000 // Large limit for export
    });
  }

  /**
   * Gather performance metrics data
   */
  private async gatherPerformanceMetrics(auditExport: any): Promise<any[]> {
    return await prisma.systemMetrics.findMany({
      where: {
        timestamp: {
          gte: auditExport.dateRangeStart,
          lte: auditExport.dateRangeEnd
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10000 // Large limit for export
    });
  }

  /**
   * Generate export file in specified format
   */
  private async generateExportFile(auditExport: any, data: any): Promise<string> {
    const fileName = `audit-export-${auditExport.id}.${auditExport.format.toLowerCase()}`;
    const filePath = join(this.exportDir, fileName);

    switch (auditExport.format) {
      case 'JSON':
        await this.generateJsonFile(filePath, data, auditExport);
        break;
      case 'CSV':
        await this.generateCsvFile(filePath, data, auditExport);
        break;
      case 'PDF':
        await this.generatePdfFile(filePath, data, auditExport);
        break;
      default:
        throw new Error(`Unsupported export format: ${auditExport.format}`);
    }

    return filePath;
  }

  /**
   * Generate JSON export file
   */
  private async generateJsonFile(filePath: string, data: any, auditExport: any): Promise<void> {
    const exportData = {
      exportInfo: {
        exportId: auditExport.id,
        requestedBy: auditExport.requestedByName,
        requestedAt: auditExport.createdAt,
        dateRange: {
          start: auditExport.dateRangeStart,
          end: auditExport.dateRangeEnd
        },
        dataTypes: auditExport.dataTypes,
        includeMetadata: auditExport.includeMetadata
      },
      data
    };

    if (auditExport.includeMetadata) {
      exportData.metadata = {
        totalRecords: Object.values(data).reduce((sum: number, arr: any) => {
          return sum + (Array.isArray(arr) ? arr.length : 0);
        }, 0),
        generatedAt: new Date(),
        version: '1.0'
      };
    }

    writeFileSync(filePath, JSON.stringify(exportData, null, 2));
  }

  /**
   * Generate CSV export file
   */
  private async generateCsvFile(filePath: string, data: any, auditExport: any): Promise<void> {
    let csvContent = '';

    // Header
    if (auditExport.includeMetadata) {
      csvContent += `# Audit Export Report\n`;
      csvContent += `# Generated: ${new Date().toISOString()}\n`;
      csvContent += `# Date Range: ${auditExport.dateRangeStart} to ${auditExport.dateRangeEnd}\n\n`;
    }

    // User Activities
    if (data.userActivities && data.userActivities.length > 0) {
      csvContent += 'USER ACTIVITIES\n';
      csvContent += 'Timestamp,User ID,User Name,Action,Resource,Event Type,Severity,Module,Status Code,Response Time,IP Address\n';
      
      data.userActivities.forEach((activity: any) => {
        csvContent += `${activity.timestamp},${activity.userId},${activity.userName},${activity.action},${activity.resource},${activity.eventType},${activity.severity},${activity.module},${activity.statusCode || ''},${activity.responseTime || ''},${activity.ipAddress || ''}\n`;
      });
      
      csvContent += '\n';
    }

    // Security Events
    if (data.securityEvents && data.securityEvents.length > 0) {
      csvContent += 'SECURITY EVENTS\n';
      csvContent += 'Timestamp,Event Type,Severity,User ID,IP Address,Description,Requires Investigation,Investigation Status\n';
      
      data.securityEvents.forEach((event: any) => {
        csvContent += `${event.timestamp},${event.eventType},${event.severity},${event.userId || ''},${event.ipAddress},${event.description},${event.requiresInvestigation},${event.investigationStatus || ''}\n`;
      });
      
      csvContent += '\n';
    }

    writeFileSync(filePath, csvContent);
  }

  /**
   * Generate PDF export file (placeholder)
   */
  private async generatePdfFile(filePath: string, data: any, auditExport: any): Promise<void> {
    // PDF generation would require a library like puppeteer or pdfkit
    // For now, generate a text file as placeholder
    const textContent = `AUDIT EXPORT REPORT (PDF Format)
Generated: ${new Date().toISOString()}
Date Range: ${auditExport.dateRangeStart} to ${auditExport.dateRangeEnd}

Note: PDF generation not yet implemented. Data exported in text format.

${JSON.stringify(data, null, 2)}`;

    writeFileSync(filePath.replace('.pdf', '.txt'), textContent);
  }

  /**
   * Get export file stream for download
   */
  getExportFileStream(exportId: string, format: string): NodeJS.ReadableStream | null {
    try {
      const fileName = `audit-export-${exportId}.${format.toLowerCase()}`;
      const filePath = join(this.exportDir, fileName);
      
      // Check if it's a PDF that was saved as TXT
      const actualPath = format === 'PDF' ? filePath.replace('.pdf', '.txt') : filePath;
      
      const fs = require('fs');
      if (fs.existsSync(actualPath)) {
        return createReadStream(actualPath);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get export file stream:', error);
      return null;
    }
  }

  /**
   * Clean up old export files
   */
  async cleanupOldExports(): Promise<void> {
    try {
      // This would be called by a scheduled job
      const expiredExports = await prisma.auditExport.findMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      const fs = require('fs');
      
      for (const exportRecord of expiredExports) {
        // Delete file
        const fileName = `audit-export-${exportRecord.id}.${exportRecord.format.toLowerCase()}`;
        const filePath = join(this.exportDir, fileName);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        
        // Also check for TXT version of PDF files
        if (exportRecord.format === 'PDF') {
          const txtPath = filePath.replace('.pdf', '.txt');
          if (fs.existsSync(txtPath)) {
            fs.unlinkSync(txtPath);
          }
        }
      }

      // Delete expired records from database
      await prisma.auditExport.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      console.log(`Cleaned up ${expiredExports.length} expired export files`);
    } catch (error) {
      console.error('Failed to cleanup old exports:', error);
    }
  }
}

// Export singleton instance
export const auditExportService = AuditExportService.getInstance();