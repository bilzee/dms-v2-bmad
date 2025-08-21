# 10\. Backend Architecture Details

## API Middleware Stack

```typescript
// lib/middleware/index.ts
// LLM Note: Middleware composition for all API routes

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimiter } from './rateLimiter';
import { logger } from './logger';
import { errorHandler } from './errorHandler';

export async function withMiddleware(
  request: NextRequest,
  handler: (req: NextRequest, ctx: any) => Promise<NextResponse>
) {
  try {
    // 1. Logging
    logger.info({
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
    });
    
    // 2. Rate limiting
    const rateLimitResult = await rateLimiter.check(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }
    
    // 3. Authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 4. Execute handler
    const response = await handler(request, { session });
    
    // 5. Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    return response;
  } catch (error) {
    return errorHandler(error);
  }
}
```

## Background Job Processing

```typescript
// lib/queue/processor.ts
// LLM Note: Background job processing for sync and verification

import { Worker, Queue } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { autoVerify } from '@/lib/verification';
import { sendNotification } from '@/lib/notifications';
import { uploadToS3 } from '@/lib/storage';

// Define job queues
export const syncQueue = new Queue('sync', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

export const verificationQueue = new Queue('verification', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

export const mediaQueue = new Queue('media', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

// Sync worker
const syncWorker = new Worker(
  'sync',
  async (job) => {
    const { type, data } = job.data;
    
    switch (type) {
      case 'ASSESSMENT':
        return await processSyncAssessment(data);
      case 'RESPONSE':
        return await processSyncResponse(data);
      case 'MEDIA':
        return await processSyncMedia(data);
      default:
        throw new Error(`Unknown sync type: ${type}`);
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    concurrency: 5,
  }
);

// Verification worker
const verificationWorker = new Worker(
  'verification',
  async (job) => {
    const { entityId, entityType } = job.data;
    
    try {
      // Check auto-verification rules
      const rules = await prisma.autoVerificationRule.findMany({
        where: {
          entityType,
          isActive: true,
        },
        orderBy: { priority: 'desc' },
      });
      
      for (const rule of rules) {
        const result = await autoVerify(entityId, rule);
        if (result.verified) {
          // Update entity status
          const model = entityType === 'ASSESSMENT' 
            ? prisma.rapidAssessment 
            : prisma.rapidResponse;
            
          await model.update({
            where: { id: entityId },
            data: {
              verificationStatus: 'AUTO_VERIFIED',
            },
          });
          
          // Create verification record
          await prisma.verification.create({
            data: {
              assessmentId: entityType === 'ASSESSMENT' ? entityId : undefined,
              responseId: entityType === 'RESPONSE' ? entityId : undefined,
              verifierId: 'SYSTEM',
              status: 'AUTO_VERIFIED',
              autoVerified: true,
              ruleId: rule.id,
              notes: `Auto-verified by rule: ${rule.name}`,
              createdAt: new Date(),
            },
          });
          
          // Send notification
          await sendNotification({
            type: 'AUTO_VERIFICATION',
            entityId,
            entityType,
          });
          
          return { autoVerified: true, ruleId: rule.id };
        }
      }
      
      // Add to manual verification queue
      await prisma.verificationQueue.create({
        data: {
          entityId,
          entityType,
          priority: determinePriority(entityType, entityId),
          status: 'PENDING',
          createdAt: new Date(),
        },
      });
      
      return { autoVerified: false, queuedForManualReview: true };
    } catch (error) {
      console.error('Verification failed:', error);
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    concurrency: 10,
  }
);

// Media processing worker
const mediaWorker = new Worker(
  'media',
  async (job) => {
    const { localPath, entityId, entityType, metadata } = job.data;
    
    try {
      // Upload to S3
      const s3Url = await uploadToS3({
        localPath,
        bucket: process.env.S3_BUCKET,
        key: `${entityType}/${entityId}/${Date.now()}_${path.basename(localPath)}`,
      });
      
      // Generate thumbnail if image
      let thumbnailUrl = null;
      if (metadata.mimeType?.startsWith('image/')) {
        thumbnailUrl = await generateThumbnail(localPath, s3Url);
      }
      
      // Update database reference
      await prisma.mediaAttachment.update({
        where: { id: metadata.attachmentId },
        data: {
          url: s3Url,
          thumbnailUrl,
          syncStatus: 'SYNCED',
        },
      });
      
      return { success: true, url: s3Url };
    } catch (error) {
      console.error('Media upload failed:', error);
      
      // Update with failure status
      await prisma.mediaAttachment.update({
        where: { id: metadata.attachmentId },
        data: {
          syncStatus: 'FAILED',
        },
      });
      
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    concurrency: 3, // Limit concurrent uploads
  }
);

// Helper functions
async function processSyncAssessment(data: any) {
  try {
    // 1. Check for existing record by offlineId
    const existing = await prisma.rapidAssessment.findUnique({
      where: { offlineId: data.offlineId },
    });
    
    if (existing) {
      // 2. Detect conflicts
      if (existing.updatedAt > new Date(data.updatedAt)) {
        // Conflict: server version is newer
        await prisma.syncLog.create({
          data: {
            userId: data.assessorId,
            deviceId: data.deviceId,
            syncType: 'INCREMENTAL',
            entityType: 'ASSESSMENT',
            entityId: existing.id,
            offlineId: data.offlineId,
            action: 'UPDATE',
            status: 'CONFLICT',
            conflictData: {
              local: data,
              remote: existing,
            },
            createdAt: new Date(),
          },
        });
        
        return { status: 'CONFLICT', entityId: existing.id };
      }
      
      // 3. Apply changes
      const updated = await prisma.rapidAssessment.update({
        where: { id: existing.id },
        data: {
          ...data,
          syncStatus: 'SYNCED',
          updatedAt: new Date(),
        },
      });
      
      // 4. Log successful sync
      await prisma.syncLog.create({
        data: {
          userId: data.assessorId,
          deviceId: data.deviceId,
          syncType: 'INCREMENTAL',
          entityType: 'ASSESSMENT',
          entityId: updated.id,
          action: 'UPDATE',
          status: 'SYNCED',
          completedAt: new Date(),
        },
      });
      
      return { status: 'SUCCESS', entityId: updated.id };
    } else {
      // Create new record
      const created = await prisma.rapidAssessment.create({
        data: {
          ...data,
          id: undefined, // Let database generate ID
          offlineId: data.offlineId,
          syncStatus: 'SYNCED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      
      // Queue for verification
      await verificationQueue.add('verify-assessment', {
        entityId: created.id,
        entityType: 'ASSESSMENT',
      });
      
      // Queue media attachments for upload
      if (data.mediaAttachments?.length > 0) {
        for (const attachment of data.mediaAttachments) {
          await mediaQueue.add('upload-media', {
            localPath: attachment.localPath,
            entityId: created.id,
            entityType: 'ASSESSMENT',
            metadata: attachment,
          });
        }
      }
      
      // Log successful sync
      await prisma.syncLog.create({
        data: {
          userId: data.assessorId,
          deviceId: data.deviceId,
          syncType: 'INCREMENTAL',
          entityType: 'ASSESSMENT',
          entityId: created.id,
          offlineId: data.offlineId,
          action: 'CREATE',
          status: 'SYNCED',
          completedAt: new Date(),
        },
      });
      
      return { status: 'SUCCESS', entityId: created.id };
    }
  } catch (error) {
    console.error('Sync assessment failed:', error);
    
    // Log failure
    await prisma.syncLog.create({
      data: {
        userId: data.assessorId,
        deviceId: data.deviceId,
        syncType: 'INCREMENTAL',
        entityType: 'ASSESSMENT',
        offlineId: data.offlineId,
        action: data.id ? 'UPDATE' : 'CREATE',
        status: 'FAILED',
        error: error.message,
        createdAt: new Date(),
      },
    });
    
    throw error;
  }
}

async function processSyncResponse(data: any) {
  try {
    // Similar pattern to processSyncAssessment
    const existing = await prisma.rapidResponse.findUnique({
      where: { offlineId: data.offlineId },
    });
    
    if (existing) {
      // Check for conflicts
      if (existing.updatedAt > new Date(data.updatedAt)) {
        await prisma.syncLog.create({
          data: {
            userId: data.responderId,
            deviceId: data.deviceId,
            syncType: 'INCREMENTAL',
            entityType: 'RESPONSE',
            entityId: existing.id,
            offlineId: data.offlineId,
            action: 'UPDATE',
            status: 'CONFLICT',
            conflictData: {
              local: data,
              remote: existing,
            },
            createdAt: new Date(),
          },
        });
        
        return { status: 'CONFLICT', entityId: existing.id };
      }
      
      // Update existing
      const updated = await prisma.rapidResponse.update({
        where: { id: existing.id },
        data: {
          ...data,
          syncStatus: 'SYNCED',
          updatedAt: new Date(),
        },
      });
      
      return { status: 'SUCCESS', entityId: updated.id };
    } else {
      // Create new response
      const created = await prisma.rapidResponse.create({
        data: {
          ...data,
          id: undefined,
          offlineId: data.offlineId,
          syncStatus: 'SYNCED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      
      // Queue for verification if delivered
      if (created.status === 'DELIVERED') {
        await verificationQueue.add('verify-response', {
          entityId: created.id,
          entityType: 'RESPONSE',
        });
      }
      
      // Queue delivery evidence for upload
      if (data.deliveryEvidence?.length > 0) {
        for (const evidence of data.deliveryEvidence) {
          await mediaQueue.add('upload-media', {
            localPath: evidence.localPath,
            entityId: created.id,
            entityType: 'RESPONSE',
            metadata: evidence,
          });
        }
      }
      
      return { status: 'SUCCESS', entityId: created.id };
    }
  } catch (error) {
    console.error('Sync response failed:', error);
    throw error;
  }
}

async function processSyncMedia(data: any) {
  try {
    const { entityId, entityType, mediaFiles } = data;
    const uploadResults = [];
    
    for (const file of mediaFiles) {
      try {
        // Upload to S3
        const result = await uploadToS3({
          localPath: file.localPath,
          bucket: process.env.S3_BUCKET,
          key: `${entityType}/${entityId}/${file.filename}`,
        });
        
        // Create or update media attachment record
        await prisma.mediaAttachment.upsert({
          where: { id: file.id },
          create: {
            id: file.id,
            url: result.url,
            mimeType: file.mimeType,
            size: file.size,
            metadata: file.metadata,
            assessmentId: entityType === 'ASSESSMENT' ? entityId : undefined,
            responseId: entityType === 'RESPONSE' ? entityId : undefined,
            syncStatus: 'SYNCED',
          },
          update: {
            url: result.url,
            syncStatus: 'SYNCED',
          },
        });
        
        uploadResults.push({ 
          fileId: file.id, 
          status: 'SUCCESS', 
          url: result.url 
        });
      } catch (error) {
        uploadResults.push({ 
          fileId: file.id, 
          status: 'FAILED', 
          error: error.message 
        });
      }
    }
    
    return { 
      status: 'COMPLETED', 
      results: uploadResults 
    };
  } catch (error) {
    console.error('Media sync failed:', error);
    throw error;
  }
}

function determinePriority(entityType: string, entityId: string): string {
  // LLM: Implement priority logic based on business rules
  // For example, HEALTH assessments might be higher priority
  // Or responses with large beneficiary counts
  return 'NORMAL';
}

async function generateThumbnail(localPath: string, s3Url: string): Promise<string> {
  // LLM: Implement thumbnail generation
  // This is a placeholder - actual implementation would use sharp or similar
  return `${s3Url}_thumb`;
}

// Export worker instances for lifecycle management
export const workers = {
  syncWorker,
  verificationWorker,
  mediaWorker,
};

// Graceful shutdown
export async function shutdownWorkers() {
  await Promise.all([
    syncWorker.close(),
    verificationWorker.close(),
    mediaWorker.close(),
  ]);
}

```      

## Synchronization Engine

```typescript

// lib/sync/engine.ts
// LLM Note: Core synchronization logic with conflict resolution

import { prisma } from '@/lib/prisma';
import { SyncStatus, ConflictResolution } from '@/shared/types';

export class SyncEngine {
  private syncToken: string;
  
  constructor(syncToken: string) {
    this.syncToken = syncToken;
  }
  
  async performSync(
    deviceId: string,
    userId: string,
    changes: any\[]
  ): Promise<SyncResult> {
    const results = {
      successful: \[],
      conflicts: \[],
      failed: \[],
    };
    
    for (const change of changes) {
      try {
        const result = await this.processChange(change, deviceId, userId);
        
        if (result.status === 'CONFLICT') {
          results.conflicts.push(result);
        } else if (result.status === 'SUCCESS') {
          results.successful.push(result);
        } else {
          results.failed.push(result);
        }
      } catch (error) {
        results.failed.push({
          entityId: change.entityId,
          error: error.message,
        });
      }
    }
    
    // Generate new sync token
    const newSyncToken = await this.generateSyncToken();
    
    return {
      ...results,
      syncToken: newSyncToken,
    };
  }
  
  private async processChange(
    change: any,
    deviceId: string,
    userId: string
  ): Promise<any> {
    // Check for conflicts using timestamp comparison
    const serverVersion = await this.getServerVersion(
      change.entityType,
      change.entityId
    );
    
    if (serverVersion \&\& serverVersion.updatedAt > change.updatedAt) {
      // Conflict detected
      return {
        status: 'CONFLICT',
        entityId: change.entityId,
        localVersion: change,
        serverVersion: serverVersion,
      };
    }
    
    // Apply change based on action
    switch (change.action) {
      case 'CREATE':
        return await this.handleCreate(change, userId);
      case 'UPDATE':
        return await this.handleUpdate(change, userId);
      case 'DELETE':
        return await this.handleDelete(change, userId);
      default:
        throw new Error(`Unknown action: ${change.action}`);
    }
  }
  
  async resolveConflict(
    entityId: string,
    resolution: ConflictResolution,
    data?: any
  ): Promise<void> {
    switch (resolution) {
      case 'LOCAL\_WINS':
        await this.applyLocalVersion(entityId, data);
        break;
      case 'SERVER\_WINS':
        // No action needed, client will pull server version
        break;
      case 'MERGE':
        await this.mergeVersions(entityId, data);
        break;
    }
  }
  
  private async generateSyncToken(): Promise<string> {
    // Generate unique sync token for tracking sync state
    return `sync\_${Date.now()}\_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## Notification System

```typescript
// lib/notifications/index.ts
// LLM Note: Multi-channel notification system

import { prisma } from '@/lib/prisma';
import { sendEmail } from './email';
import { sendSMS } from './sms';
import { sendPushNotification } from './push';

export interface Notification {
  type: NotificationType;
  recipient: string;
  title: string;
  message: string;
  data?: any;
  channels?: ('EMAIL' | 'SMS' | 'PUSH')\[];
}

export async function sendNotification(notification: Notification) {
  const user = await prisma.user.findUnique({
    where: { id: notification.recipient },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const channels = notification.channels || \['PUSH'];
  const results = \[];
  
  for (const channel of channels) {
    try {
      switch (channel) {
        case 'EMAIL':
          if (user.email) {
            await sendEmail({
              to: user.email,
              subject: notification.title,
              body: notification.message,
              data: notification.data,
            });
            results.push({ channel: 'EMAIL', status: 'SUCCESS' });
          }
          break;
          
        case 'SMS':
          if (user.phone) {
            await sendSMS({
              to: user.phone,
              message: notification.message,
            });
            results.push({ channel: 'SMS', status: 'SUCCESS' });
          }
          break;
          
        case 'PUSH':
          await sendPushNotification({
            userId: user.id,
            title: notification.title,
            body: notification.message,
            data: notification.data,
          });
          results.push({ channel: 'PUSH', status: 'SUCCESS' });
          break;
      }
    } catch (error) {
      results.push({
        channel,
        status: 'FAILED',
        error: error.message,
      });
    }
  }
  
  // Log notification
  await prisma.notificationLog.create({
    data: {
      userId: user.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      channels: channels,
      results: results,
      createdAt: new Date(),
    },
  });
  
  return results;
}

// Notification templates
export const notificationTemplates = {
  ASSESSMENT\_VERIFIED: {
    title: 'Assessment Verified',
    message: 'Your assessment for {{entityName}} has been verified.',
  },
  RESPONSE\_DELIVERED: {
    title: 'Response Delivered',
    message: 'Response delivery to {{entityName}} confirmed.',
  },
  SYNC\_CONFLICT: {
    title: 'Sync Conflict Detected',
    message: 'Conflict detected for {{entityType}}. Manual review required.',
  },
  AUTO\_VERIFICATION: {
    title: 'Auto-Verified',
    message: 'Your {{entityType}} was automatically verified.',
  },
};
```

## Auto-Verification Engine

```typescript
// lib/verification/auto-verify.ts
// LLM Note: Rule-based auto-verification system

import { prisma } from '@/lib/prisma';

export interface AutoVerificationRule {
  id: string;
  entityType: 'ASSESSMENT' | 'RESPONSE';
  subType?: string;
  conditions: RuleCondition\[];
  priority: number;
}

export interface RuleCondition {
  field: string;
  operator: 'EQUALS' | 'GREATER\_THAN' | 'LESS\_THAN' | 'CONTAINS' | 'EXISTS';
  value: any;
  required: boolean;
}

export async function autoVerify(
  entityId: string,
  rule: AutoVerificationRule
): Promise<{ verified: boolean; reason?: string }> {
  try {
    // Fetch entity based on type
    const entity = await fetchEntity(entityId, rule.entityType);
    
    if (!entity) {
      return { verified: false, reason: 'Entity not found' };
    }
    
    // Check all conditions
    for (const condition of rule.conditions) {
      const fieldValue = getFieldValue(entity, condition.field);
      const conditionMet = evaluateCondition(fieldValue, condition);
      
      if (condition.required \&\& !conditionMet) {
        return {
          verified: false,
          reason: `Required condition not met: ${condition.field}`,
        };
      }
    }
    
    // All required conditions met
    return { verified: true };
  } catch (error) {
    console.error('Auto-verification error:', error);
    return { verified: false, reason: error.message };
  }
}

function evaluateCondition(value: any, condition: RuleCondition): boolean {
  switch (condition.operator) {
    case 'EQUALS':
      return value === condition.value;
    case 'GREATER\_THAN':
      return value > condition.value;
    case 'LESS\_THAN':
      return value < condition.value;
    case 'CONTAINS':
      return Array.isArray(value) 
        ? value.includes(condition.value)
        : String(value).includes(condition.value);
    case 'EXISTS':
      return value !== null \&\& value !== undefined;
    default:
      return false;
  }
}

function getFieldValue(entity: any, fieldPath: string): any {
  // Navigate nested fields using dot notation
  const fields = fieldPath.split('.');
  let value = entity;
  
  for (const field of fields) {
    if (value \&\& typeof value === 'object') {
      value = value\[field];
    } else {
      return undefined;
    }
  }
  
  return value;
}

async function fetchEntity(
  entityId: string,
  entityType: string
): Promise<any> {
  if (entityType === 'ASSESSMENT') {
    return prisma.rapidAssessment.findUnique({
      where: { id: entityId },
      include: {
        mediaAttachments: true,
        affectedEntity: true,
      },
    });
  } else if (entityType === 'RESPONSE') {
    return prisma.rapidResponse.findUnique({
      where: { id: entityId },
      include: {
        deliveryEvidence: true,
        assessment: true,
      },
    });
  }
  
  return null;
}
```

---
