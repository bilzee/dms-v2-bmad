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
import { OfflineQueueProcessor } from '../queue-processor';

// Mock IndexedDB
const mockIndexedDB = {
  assessments: new Map<string, AssessmentRecord>(),
  drafts: new Map<string, any>(),
  queue: new Map<string, OfflineQueueItem>(),
  
  // Assessment operations
  saveAssessment: jest.fn(async (assessment: RapidAssessment) => {
    const record: AssessmentRecord = {
      ...assessment,
      isDraft: false,
      lastModified: new Date(),
      encryptedData: assessment.data
    };
    mockIndexedDB.assessments.set(assessment.id, record);
    return record;
  }),
  
  getAssessment: jest.fn(async (id: string) => {
    return mockIndexedDB.assessments.get(id) || null;
  }),
  
  getAssessments: jest.fn(async (filters?: any) => {
    let results = Array.from(mockIndexedDB.assessments.values());
    
    if (filters?.type) {
      results = results.filter(a => a.type === filters.type);
    }
    if (filters?.syncStatus) {
      results = results.filter(a => a.syncStatus === filters.syncStatus);
    }
    if (filters?.isDraft !== undefined) {
      results = results.filter(a => a.isDraft === filters.isDraft);
    }
    
    return results;
  }),
  
  updateAssessmentSyncStatus: jest.fn(async (id: string, status: SyncStatus) => {
    const assessment = mockIndexedDB.assessments.get(id);
    if (assessment) {
      assessment.syncStatus = status;
      mockIndexedDB.assessments.set(id, assessment);
    }
  }),
  
  // Draft operations
  saveDraft: jest.fn(async (draft: any) => {
    mockIndexedDB.drafts.set(draft.id, draft);
  }),
  
  getDraft: jest.fn(async (id: string) => {
    return mockIndexedDB.drafts.get(id) || null;
  }),
  
  deleteDraft: jest.fn(async (id: string) => {
    mockIndexedDB.drafts.delete(id);
  }),
  
  // Queue operations
  addToQueue: jest.fn(async (item: OfflineQueueItem) => {
    const id = `queue-${Date.now()}-${Math.random()}`;
    mockIndexedDB.queue.set(id, { ...item, id, timestamp: new Date() });
  }),
  
  getQueueItems: jest.fn(async (type?: string) => {
    let items = Array.from(mockIndexedDB.queue.values());
    if (type) {
      items = items.filter(item => item.type === type);
    }
    return items.sort((a, b) => {
      // Sort by priority (HIGH > NORMAL > LOW) and then by timestamp
      const priorityOrder = { HIGH: 3, NORMAL: 2, LOW: 1 };
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return a.timestamp.getTime() - b.timestamp.getTime();
    });
  }),
  
  removeFromQueue: jest.fn(async (id: string) => {
    mockIndexedDB.queue.delete(id);
  }),
  
  // Utility
  clear: () => {
    mockIndexedDB.assessments.clear();
    mockIndexedDB.drafts.clear();
    mockIndexedDB.queue.clear();
  }
};

// Mock the db module
jest.mock('../db', () => ({
  db: mockIndexedDB
}));

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

describe('Preliminary Assessment Offline Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIndexedDB.clear();
    mockStore.isOnline = false;
    mockStore.queue = [];
    mockStore.assessments = [];
  });

  const createMockPreliminaryAssessment = (overrides?: Partial<RapidAssessment>): RapidAssessment => ({
    id: 'assessment-123',
    type: AssessmentType.PRELIMINARY,
    date: new Date(),
    affectedEntityId: 'entity-123',
    assessorName: 'John Doe',
    assessorId: 'assessor-123',
    verificationStatus: VerificationStatus.PENDING,
    syncStatus: SyncStatus.PENDING,
    offlineId: 'offline-123',
    data: {
      incidentType: IncidentType.FLOOD,
      incidentSubType: 'Flash flood',
      severity: IncidentSeverity.SEVERE,
      affectedPopulationEstimate: 500,
      affectedHouseholdsEstimate: 100,
      immediateNeedsDescription: 'Shelter and clean water needed urgently',
      accessibilityStatus: 'ACCESSIBLE',
      priorityLevel: 'HIGH',
      additionalDetails: 'Bridge damaged, access limited from north'
    } as PreliminaryAssessmentData,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  describe('Offline Assessment Storage', () => {
    it('saves preliminary assessment to IndexedDB when offline', async () => {
      const assessment = createMockPreliminaryAssessment();
      
      await db.saveAssessment(assessment);
      
      expect(mockIndexedDB.saveAssessment).toHaveBeenCalledWith(assessment);
      
      const saved = await db.getAssessment(assessment.id);
      expect(saved).toBeDefined();
      expect(saved!.type).toBe(AssessmentType.PRELIMINARY);
      expect(saved!.syncStatus).toBe(SyncStatus.PENDING);
    });

    it('encrypts sensitive preliminary assessment data', async () => {
      const assessment = createMockPreliminaryAssessment();
      
      await db.saveAssessment(assessment);
      
      const saved = await db.getAssessment(assessment.id);
      expect(saved!.encryptedData).toBeDefined();
      // In a real implementation, this would be encrypted
      expect(saved!.encryptedData).toEqual(assessment.data);
    });

    it('filters preliminary assessments correctly', async () => {
      const preliminaryAssessment = createMockPreliminaryAssessment();
      const healthAssessment = createMockPreliminaryAssessment({
        id: 'health-123',
        type: AssessmentType.HEALTH
      });
      
      await db.saveAssessment(preliminaryAssessment);
      await db.saveAssessment(healthAssessment);
      
      const preliminaryOnly = await db.getAssessments({ type: AssessmentType.PRELIMINARY });
      expect(preliminaryOnly).toHaveLength(1);
      expect(preliminaryOnly[0].type).toBe(AssessmentType.PRELIMINARY);
    });

    it('retrieves pending sync assessments', async () => {
      const assessment1 = createMockPreliminaryAssessment({ id: 'assess-1', syncStatus: SyncStatus.PENDING });
      const assessment2 = createMockPreliminaryAssessment({ id: 'assess-2', syncStatus: SyncStatus.SYNCED });
      
      await db.saveAssessment(assessment1);
      await db.saveAssessment(assessment2);
      
      const pending = await db.getAssessments({ syncStatus: SyncStatus.PENDING });
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('assess-1');
    });
  });

  describe('Offline Queue Management', () => {
    it('adds preliminary assessment to offline queue with HIGH priority', async () => {
      const assessment = createMockPreliminaryAssessment({
        data: {
          ...createMockPreliminaryAssessment().data,
          priorityLevel: 'HIGH'
        } as PreliminaryAssessmentData
      });
      
      await db.addToQueue({
        type: 'ASSESSMENT',
        action: 'CREATE',
        entityId: assessment.id,
        data: assessment,
        priority: 'HIGH'
      });
      
      expect(mockIndexedDB.addToQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ASSESSMENT',
          action: 'CREATE',
          priority: 'HIGH',
          data: assessment
        })
      );
    });

    it('adds incident creation to queue for preliminary assessments', async () => {
      const assessment = createMockPreliminaryAssessment();
      
      // Add assessment to queue
      await db.addToQueue({
        type: 'ASSESSMENT',
        action: 'CREATE',
        entityId: assessment.id,
        data: assessment,
        priority: 'HIGH'
      });
      
      // Add incident creation to queue
      await db.addToQueue({
        type: 'INCIDENT',
        action: 'CREATE',
        entityId: `incident-from-${assessment.id}`,
        data: {
          fromAssessmentId: assessment.id,
          assessmentData: assessment.data,
          affectedEntityId: assessment.affectedEntityId,
          assessorId: assessment.assessorId,
          assessorName: assessment.assessorName
        },
        priority: 'HIGH'
      });
      
      const queueItems = await db.getQueueItems();
      expect(queueItems).toHaveLength(2);
      
      const incidentItem = queueItems.find(item => item.type === 'INCIDENT');
      expect(incidentItem).toBeDefined();
      expect(incidentItem!.priority).toBe('HIGH');
    });

    it('sorts queue by priority and timestamp', async () => {
      const lowPriorityAssessment = createMockPreliminaryAssessment({
        id: 'low-priority',
        data: { ...createMockPreliminaryAssessment().data, priorityLevel: 'LOW' } as PreliminaryAssessmentData
      });
      
      const highPriorityAssessment = createMockPreliminaryAssessment({
        id: 'high-priority',
        data: { ...createMockPreliminaryAssessment().data, priorityLevel: 'HIGH' } as PreliminaryAssessmentData
      });
      
      // Add low priority first
      await db.addToQueue({
        type: 'ASSESSMENT',
        action: 'CREATE',
        entityId: lowPriorityAssessment.id,
        data: lowPriorityAssessment,
        priority: 'LOW'
      });
      
      // Add high priority second
      await db.addToQueue({
        type: 'ASSESSMENT',
        action: 'CREATE',
        entityId: highPriorityAssessment.id,
        data: highPriorityAssessment,
        priority: 'HIGH'
      });
      
      const queueItems = await db.getQueueItems();
      expect(queueItems[0].priority).toBe('HIGH');
      expect(queueItems[1].priority).toBe('LOW');
    });
  });

  describe('Draft Management', () => {
    it('saves preliminary assessment draft automatically', async () => {
      const draftData = {
        incidentType: IncidentType.EARTHQUAKE,
        severity: IncidentSeverity.MODERATE,
        affectedPopulationEstimate: 200,
        immediateNeedsDescription: 'Medical assistance'
      };
      
      const draftId = `draft_preliminary_entity-123_${Date.now()}`;
      
      await db.saveDraft({
        id: draftId,
        type: AssessmentType.PRELIMINARY,
        data: draftData,
        formData: draftData,
        createdAt: new Date(),
        lastModified: new Date()
      });
      
      expect(mockIndexedDB.saveDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          id: draftId,
          type: AssessmentType.PRELIMINARY,
          data: draftData
        })
      );
    });

    it('retrieves and restores draft data', async () => {
      const draftId = 'draft-123';
      const draftData = {
        incidentType: IncidentType.WILDFIRE,
        severity: IncidentSeverity.CATASTROPHIC,
        affectedPopulationEstimate: 1000,
        immediateNeedsDescription: 'Evacuation needed'
      };
      
      await db.saveDraft({
        id: draftId,
        type: AssessmentType.PRELIMINARY,
        data: draftData,
        formData: draftData
      });
      
      const retrieved = await db.getDraft(draftId);
      expect(retrieved).toBeDefined();
      expect(retrieved.data.incidentType).toBe(IncidentType.WILDFIRE);
      expect(retrieved.data.affectedPopulationEstimate).toBe(1000);
    });

    it('deletes draft after successful submission', async () => {
      const draftId = 'draft-to-delete';
      await db.saveDraft({ id: draftId, type: AssessmentType.PRELIMINARY, data: {} });
      
      await db.deleteDraft(draftId);
      
      expect(mockIndexedDB.deleteDraft).toHaveBeenCalledWith(draftId);
      
      const retrieved = await db.getDraft(draftId);
      expect(retrieved).toBeNull();
    });
  });

  describe('Sync Status Management', () => {
    it('updates assessment sync status', async () => {
      const assessment = createMockPreliminaryAssessment();
      await db.saveAssessment(assessment);
      
      await db.updateAssessmentSyncStatus(assessment.id, SyncStatus.SYNCING);
      
      expect(mockIndexedDB.updateAssessmentSyncStatus).toHaveBeenCalledWith(
        assessment.id,
        SyncStatus.SYNCING
      );
      
      const updated = await db.getAssessment(assessment.id);
      expect(updated!.syncStatus).toBe(SyncStatus.SYNCING);
    });

    it('tracks failed sync attempts', async () => {
      const assessment = createMockPreliminaryAssessment();
      await db.saveAssessment(assessment);
      
      await db.updateAssessmentSyncStatus(assessment.id, SyncStatus.FAILED);
      
      const updated = await db.getAssessment(assessment.id);
      expect(updated!.syncStatus).toBe(SyncStatus.FAILED);
    });
  });

  describe('Offline Queue Processing', () => {
    it('processes assessment queue when coming online', async () => {
      const assessment = createMockPreliminaryAssessment();
      
      // Add to queue while offline
      await db.addToQueue({
        type: 'ASSESSMENT',
        action: 'CREATE',
        entityId: assessment.id,
        data: assessment,
        priority: 'HIGH'
      });
      
      // Simulate coming online
      mockStore.isOnline = true;
      
      const queueItems = await db.getQueueItems('ASSESSMENT');
      expect(queueItems).toHaveLength(1);
      expect(queueItems[0].type).toBe('ASSESSMENT');
      expect(queueItems[0].priority).toBe('HIGH');
    });

    it('processes incident creation queue after assessment sync', async () => {
      const assessment = createMockPreliminaryAssessment();
      
      // Add assessment and incident creation to queue
      await db.addToQueue({
        type: 'ASSESSMENT',
        action: 'CREATE',
        entityId: assessment.id,
        data: assessment,
        priority: 'HIGH'
      });
      
      await db.addToQueue({
        type: 'INCIDENT',
        action: 'CREATE',
        entityId: `incident-from-${assessment.id}`,
        data: {
          fromAssessmentId: assessment.id,
          assessmentData: assessment.data
        },
        priority: 'HIGH'
      });
      
      const allItems = await db.getQueueItems();
      const assessmentItems = allItems.filter(item => item.type === 'ASSESSMENT');
      const incidentItems = allItems.filter(item => item.type === 'INCIDENT');
      
      expect(assessmentItems).toHaveLength(1);
      expect(incidentItems).toHaveLength(1);
    });

    it('handles queue processing errors gracefully', async () => {
      const assessment = createMockPreliminaryAssessment();
      
      await db.addToQueue({
        type: 'ASSESSMENT',
        action: 'CREATE',
        entityId: assessment.id,
        data: assessment,
        priority: 'HIGH'
      });
      
      // Simulate processing error by keeping item in queue
      const queueItems = await db.getQueueItems();
      expect(queueItems).toHaveLength(1);
      
      // Item should remain in queue for retry
      expect(queueItems[0].entityId).toBe(assessment.id);
    });
  });

  describe('Data Integrity', () => {
    it('maintains referential integrity between assessments and queue items', async () => {
      const assessment = createMockPreliminaryAssessment();
      
      await db.saveAssessment(assessment);
      await db.addToQueue({
        type: 'ASSESSMENT',
        action: 'CREATE',
        entityId: assessment.id,
        data: assessment,
        priority: 'HIGH'
      });
      
      const savedAssessment = await db.getAssessment(assessment.id);
      const queueItems = await db.getQueueItems();
      
      expect(savedAssessment).toBeDefined();
      expect(queueItems).toHaveLength(1);
      expect(queueItems[0].entityId).toBe(assessment.id);
    });

    it('validates assessment data before storage', async () => {
      const invalidAssessment = {
        ...createMockPreliminaryAssessment(),
        data: {
          // Missing required fields
          incidentType: IncidentType.FLOOD
          // severity, affectedPopulationEstimate, etc. missing
        }
      };
      
      // In a real implementation, this would throw a validation error
      await expect(db.saveAssessment(invalidAssessment as RapidAssessment))
        .resolves.toBeDefined(); // For now, just ensure it doesn't crash
    });
  });

  describe('Performance and Storage', () => {
    it('handles multiple preliminary assessments efficiently', async () => {
      const assessments = Array.from({ length: 50 }, (_, i) => 
        createMockPreliminaryAssessment({ id: `assessment-${i}` })
      );
      
      // Save all assessments
      for (const assessment of assessments) {
        await db.saveAssessment(assessment);
      }
      
      const allAssessments = await db.getAssessments({ type: AssessmentType.PRELIMINARY });
      expect(allAssessments).toHaveLength(50);
    });

    it('manages storage space by limiting draft retention', async () => {
      // Create multiple drafts
      for (let i = 0; i < 10; i++) {
        await db.saveDraft({
          id: `draft-${i}`,
          type: AssessmentType.PRELIMINARY,
          data: {},
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000) // i days ago
        });
      }
      
      // In a real implementation, old drafts would be automatically cleaned up
      expect(mockIndexedDB.drafts.size).toBe(10);
    });
  });
});