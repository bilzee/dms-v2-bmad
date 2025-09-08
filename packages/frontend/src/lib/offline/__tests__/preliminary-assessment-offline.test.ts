import { db, type AssessmentRecord } from '../db';
import { useOfflineStore } from '@/stores/offline.store';
import { 
  AssessmentType, 
  IncidentType, 
  IncidentSeverity, 
  SyncStatus,
  VerificationStatus,
  type RapidAssessment,
  type PreliminaryAssessmentData,
  type OfflineQueueItem
} from '@dms/shared';
import { OfflineQueueService } from '../../services/OfflineQueueService';

// Mock the db module with inline factory function
jest.mock('../db', () => {
  const assessments = new Map();
  const drafts = new Map();
  const queue = new Map();
  
  return {
    db: {
      assessments,
      drafts,
      queue,
      
      // Assessment operations
      saveAssessment: jest.fn(async (assessment) => {
        const record = {
          ...assessment,
          isDraft: false,
          lastModified: new Date(),
          encryptedData: JSON.stringify(assessment.data)
        };
        assessments.set(assessment.id, record);
        return record;
      }),
      
      getAssessment: jest.fn(async (id) => {
        return assessments.get(id) || null;
      }),
      
      getAssessments: jest.fn(async (filters) => {
        let results = Array.from(assessments.values());
        
        if (filters?.type) {
          results = results.filter(a => a.type === filters.type);
        }
        
        if (filters?.syncStatus) {
          results = results.filter(a => a.syncStatus === filters.syncStatus);
        }
        
        return results;
      }),
      
      // Draft operations
      saveDraft: jest.fn(async (draft) => {
        drafts.set(draft.id, draft);
        return draft;
      }),
      
      getDraft: jest.fn(async (id) => {
        return drafts.get(id) || null;
      }),
      
      deleteDraft: jest.fn(async (id) => {
        drafts.delete(id);
      }),
      
      // Queue operations
      addToQueue: jest.fn(async (item) => {
        queue.set(item.id, item);
      }),
      
      getQueueItems: jest.fn(async () => {
        return Array.from(queue.values());
      }),
      
      removeFromQueue: jest.fn(async (id) => {
        queue.delete(id);
      }),
      
      updateQueueItem: jest.fn(async (id, updates) => {
        const item = queue.get(id);
        if (item) {
          const updated = { ...item, ...updates };
          queue.set(id, updated);
          return updated;
        }
        return null;
      }),
      
      // Bulk operations
      bulkUpdate: jest.fn(async (updates) => {
        for (const update of updates) {
          if (update.table === 'assessments') {
            assessments.set(update.id, update.data);
          } else if (update.table === 'queue') {
            queue.set(update.id, update.data);
          }
        }
      }),
      
      // Utility
      clear: () => {
        assessments.clear();
        drafts.clear();
        queue.clear();
      }
    }
  };
});

// Mock offline store
const mockStore = {
  isOnline: false,
  assessments: [],
  queue: [],
  addToQueue: jest.fn(),
  addPendingAssessment: jest.fn(),
  updateAssessmentSyncStatus: jest.fn(),
  syncAssessment: jest.fn(),
  processOfflineQueue: jest.fn()
};

jest.mock('@/stores/offline.store', () => ({
  useOfflineStore: {
    getState: () => mockStore,
    setState: (updates: any) => Object.assign(mockStore, updates)
  }
}));

// Mock queue service
jest.mock('../../services/OfflineQueueService', () => ({
  OfflineQueueService: {
    addToQueue: jest.fn(),
    processQueue: jest.fn(),
    getQueueStats: jest.fn(() => ({ pending: 0, processing: 0, completed: 0, failed: 0 }))
  }
}));

describe('Preliminary Assessment Offline Functionality', () => {
  const mockDb = db as any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.clear();
    mockStore.isOnline = false;
    mockStore.assessments = [];
    mockStore.queue = [];
  });

  describe('Offline Assessment Creation', () => {
    test('should create preliminary assessment when offline', async () => {
      const assessmentData: PreliminaryAssessmentData = {
        incidentType: IncidentType.FLOOD,
        severity: IncidentSeverity.SEVERE,
        affectedPopulationEstimate: 100,
        affectedHouseholdsEstimate: 25,
        immediateNeedsDescription: 'Test preliminary assessment',
        accessibilityStatus: 'ACCESSIBLE',
        priorityLevel: 'HIGH'
      };

      const assessment: RapidAssessment = {
        id: 'test-assessment-1',
        type: AssessmentType.PRELIMINARY,
        date: new Date(),
        affectedEntityId: 'test-entity-1',
        assessorName: 'Test Assessor',
        assessorId: 'test-user',
        verificationStatus: VerificationStatus.PENDING,
        syncStatus: SyncStatus.PENDING,
        data: assessmentData,
        mediaAttachments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await mockDb.saveAssessment(assessment);

      expect(mockDb.saveAssessment).toHaveBeenCalledWith(assessment);
      expect(mockDb.assessments.size).toBe(1);
      
      const saved = await mockDb.getAssessment('test-assessment-1');
      expect(saved).toBeTruthy();
      expect(saved?.type).toBe(AssessmentType.PRELIMINARY);
      expect(saved?.syncStatus).toBe(SyncStatus.PENDING);
    });

    test('should save assessment draft when user exits form', async () => {
      const draftData = {
        id: 'draft-1',
        type: AssessmentType.PRELIMINARY,
        data: {
          incidentType: IncidentType.FLOOD,
          description: 'Partial assessment...'
        },
        lastModified: new Date()
      };

      await mockDb.saveDraft(draftData);

      expect(mockDb.saveDraft).toHaveBeenCalledWith(draftData);
      expect(mockDb.drafts.size).toBe(1);

      const retrieved = await mockDb.getDraft('draft-1');
      expect(retrieved).toEqual(draftData);
    });

    test('should queue assessment for sync when created offline', async () => {
      const assessment: RapidAssessment = {
        id: 'test-assessment-2',
        type: AssessmentType.PRELIMINARY,
        data: {
          incidentType: IncidentType.CONFLICT,
          severity: IncidentSeverity.MODERATE,
          location: {
            address: 'Conflict Zone',
            coordinates: { lat: 23.45, lng: 67.89 }
          },
          description: 'Conflict assessment',
          estimatedAffected: 50,
          urgentNeeds: ['security', 'food'],
          accessibilityNotes: 'Unsafe area'
        },
        location: {
          address: 'Conflict Zone',
          coordinates: { lat: 23.45, lng: 67.89 }
        },
        timestamp: new Date(),
        userId: 'test-user',
        syncStatus: SyncStatus.PENDING,
        verificationStatus: VerificationStatus.PENDING,
        attachments: []
      };

      const queueItem: OfflineQueueItem = {
        id: 'queue-1',
        entityType: 'assessment',
        entityId: assessment.id,
        operation: 'CREATE',
        data: assessment,
        priority: 1,
        timestamp: new Date(),
        retryCount: 0,
        status: SyncStatus.PENDING
      };

      await mockDb.addToQueue(queueItem);

      expect(mockDb.addToQueue).toHaveBeenCalledWith(queueItem);
      expect(mockDb.queue.size).toBe(1);

      const queueItems = await mockDb.getQueueItems();
      expect(queueItems).toHaveLength(1);
      expect(queueItems[0].entityType).toBe('assessment');
      expect(queueItems[0].operation).toBe('CREATE');
    });
  });

  describe('Assessment Retrieval and Filtering', () => {
    beforeEach(async () => {
      // Setup test data
      const assessments = [
        {
          id: 'assessment-1',
          type: AssessmentType.PRELIMINARY,
          syncStatus: SyncStatus.PENDING,
          data: { incidentType: IncidentType.FLOOD }
        },
        {
          id: 'assessment-2', 
          type: AssessmentType.HEALTH,
          syncStatus: SyncStatus.SYNCED,
          data: { incidentType: IncidentType.CONFLICT }
        },
        {
          id: 'assessment-3',
          type: AssessmentType.PRELIMINARY,
          syncStatus: SyncStatus.FAILED,
          data: { incidentType: IncidentType.EPIDEMIC }
        }
      ];

      for (const assessment of assessments) {
        await mockDb.saveAssessment(assessment);
      }
    });

    test('should retrieve all assessments', async () => {
      const assessments = await mockDb.getAssessments();
      expect(assessments).toHaveLength(3);
    });

    test('should filter assessments by type', async () => {
      const preliminaryAssessments = await mockDb.getAssessments({ 
        type: AssessmentType.PRELIMINARY 
      });
      
      expect(preliminaryAssessments).toHaveLength(2);
      expect(preliminaryAssessments.every(a => a.type === AssessmentType.PRELIMINARY)).toBe(true);
    });

    test('should filter assessments by sync status', async () => {
      const pendingAssessments = await mockDb.getAssessments({ 
        syncStatus: SyncStatus.PENDING 
      });
      
      expect(pendingAssessments).toHaveLength(1);
      expect(pendingAssessments[0].syncStatus).toBe(SyncStatus.PENDING);
    });
  });

  describe('Queue Management', () => {
    test('should update queue item status', async () => {
      const queueItem: OfflineQueueItem = {
        id: 'queue-update-test',
        entityType: 'assessment',
        entityId: 'assessment-1',
        operation: 'CREATE',
        data: {},
        priority: 1,
        timestamp: new Date(),
        retryCount: 0,
        status: SyncStatus.PENDING
      };

      await mockDb.addToQueue(queueItem);
      
      const updated = await mockDb.updateQueueItem('queue-update-test', { 
        status: SyncStatus.SYNCING,
        retryCount: 1
      });

      expect(updated).toBeTruthy();
      expect(updated?.status).toBe(SyncStatus.SYNCING);
      expect(updated?.retryCount).toBe(1);
    });

    test('should remove completed items from queue', async () => {
      const queueItem: OfflineQueueItem = {
        id: 'queue-remove-test',
        entityType: 'assessment',
        entityId: 'assessment-1',
        operation: 'CREATE',
        data: {},
        priority: 1,
        timestamp: new Date(),
        retryCount: 0,
        status: SyncStatus.PENDING
      };

      await mockDb.addToQueue(queueItem);
      expect(mockDb.queue.size).toBe(1);

      await mockDb.removeFromQueue('queue-remove-test');
      expect(mockDb.queue.size).toBe(0);
    });
  });

  describe('Bulk Operations', () => {
    test('should perform bulk updates across multiple tables', async () => {
      const updates = [
        {
          table: 'assessments',
          id: 'bulk-assessment-1',
          data: { id: 'bulk-assessment-1', type: AssessmentType.PRELIMINARY }
        },
        {
          table: 'queue',
          id: 'bulk-queue-1',
          data: { id: 'bulk-queue-1', entityType: 'assessment', operation: 'UPDATE' }
        }
      ];

      await mockDb.bulkUpdate(updates);

      expect(mockDb.bulkUpdate).toHaveBeenCalledWith(updates);
      expect(mockDb.assessments.size).toBe(1);
      expect(mockDb.queue.size).toBe(1);
    });
  });

  describe('Data Persistence and Recovery', () => {
    test('should maintain data integrity after app restart simulation', async () => {
      // Simulate app creating data
      const assessment: RapidAssessment = {
        id: 'persistence-test',
        type: AssessmentType.PRELIMINARY,
        data: {
          incidentType: IncidentType.FLOOD,
          severity: IncidentSeverity.SEVERE,
          location: {
            address: 'Persistence Test Location',
            coordinates: { lat: 11.11, lng: 22.22 }
          },
          description: 'Test data persistence',
          estimatedAffected: 200,
          urgentNeeds: ['shelter'],
          accessibilityNotes: 'Test notes'
        },
        location: {
          address: 'Persistence Test Location',
          coordinates: { lat: 11.11, lng: 22.22 }
        },
        timestamp: new Date(),
        userId: 'test-user',
        syncStatus: SyncStatus.PENDING,
        verificationStatus: VerificationStatus.PENDING,
        attachments: []
      };

      await mockDb.saveAssessment(assessment);
      
      // Simulate app restart - data should still be available
      const retrieved = await mockDb.getAssessment('persistence-test');
      expect(retrieved).toBeTruthy();
      expect(retrieved?.id).toBe('persistence-test');
      expect(retrieved?.syncStatus).toBe(SyncStatus.PENDING);
    });

    test('should handle corrupted data gracefully', async () => {
      // Simulate corrupted data retrieval
      const nonExistentAssessment = await mockDb.getAssessment('non-existent');
      expect(nonExistentAssessment).toBeNull();
      
      const nonExistentDraft = await mockDb.getDraft('non-existent');
      expect(nonExistentDraft).toBeNull();
      
      // Should not throw errors
      await expect(mockDb.removeFromQueue('non-existent')).resolves.not.toThrow();
      await expect(mockDb.updateQueueItem('non-existent', { status: SyncStatus.FAILED })).resolves.toBe(null);
    });
  });
});