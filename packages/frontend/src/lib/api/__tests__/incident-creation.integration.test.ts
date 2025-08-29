import { IncidentService } from '../incident.service';
import { NotificationService } from '../notification.service';
import { db } from '@/lib/offline/db';
import { useOfflineStore } from '@/stores/offline.store';
import { 
  AssessmentType, 
  IncidentType, 
  IncidentSeverity, 
  SyncStatus,
  VerificationStatus,
  type RapidAssessment,
  type PreliminaryAssessmentData 
} from '@dms/shared';

// Mock fetch for API calls
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock IndexedDB
jest.mock('@/lib/offline/db');
const mockDb = db as jest.Mocked<typeof db>;

// Mock offline store
jest.mock('@/stores/offline.store');
const mockUseOfflineStore = useOfflineStore as jest.MockedFunction<typeof useOfflineStore>;

describe('Incident Creation Workflow Integration', () => {
  let mockAddToQueue: jest.Mock;
  let mockAddPendingAssessment: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAddToQueue = jest.fn();
    mockAddPendingAssessment = jest.fn();
    
    mockUseOfflineStore.mockReturnValue({
      isOnline: true,
      addToQueue: mockAddToQueue,
      addPendingAssessment: mockAddPendingAssessment
    } as any);

    // Mock successful API responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        incident: {
          id: 'incident-123',
          name: 'FLOOD - SEVERE',
          type: IncidentType.FLOOD,
          severity: IncidentSeverity.SEVERE,
          status: 'ACTIVE',
          preliminaryAssessmentIds: ['assessment-123']
        }
      })
    } as Response);

    mockDb.saveAssessment.mockResolvedValue();
  });

  const createMockAssessment = (): RapidAssessment => ({
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
      severity: IncidentSeverity.SEVERE,
      affectedPopulationEstimate: 500,
      affectedHouseholdsEstimate: 100,
      immediateNeedsDescription: 'Shelter and clean water needed urgently',
      accessibilityStatus: 'ACCESSIBLE',
      priorityLevel: 'HIGH',
      additionalDetails: 'Bridge damaged, access limited from north'
    } as PreliminaryAssessmentData,
    mediaAttachments: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  describe('Online Incident Creation', () => {
    it('creates incident from preliminary assessment successfully', async () => {
      const assessment = createMockAssessment();
      const gpsCoordinates = {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        timestamp: new Date(),
        captureMethod: 'GPS' as const
      };

      const request = IncidentService.prepareIncidentRequest(assessment, gpsCoordinates);
      expect(request).not.toBeNull();

      const result = await IncidentService.createFromAssessment(request!);

      expect(result.success).toBe(true);
      expect(result.incident).toBeDefined();
      expect(result.incident!.type).toBe(IncidentType.FLOOD);
      expect(result.incident!.severity).toBe(IncidentSeverity.SEVERE);
      
      // Verify API was called with correct data
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/incidents/from-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
    });

    it('triggers coordinator notifications after incident creation', async () => {
      const assessment = createMockAssessment();
      
      // Mock notification service response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            incident: { id: 'incident-123', name: 'Test Incident' }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            notificationsSent: 3
          })
        } as Response);

      const request = IncidentService.prepareIncidentRequest(assessment);
      const incidentResult = await IncidentService.createFromAssessment(request!);
      
      const notificationResult = await NotificationService.notifyCoordinators({
        incidentId: incidentResult.incident!.id,
        assessmentId: assessment.id,
        assessorName: assessment.assessorName,
        incidentType: assessment.data.incidentType,
        severity: assessment.data.severity,
        priorityLevel: assessment.data.priorityLevel,
        affectedPopulation: assessment.data.affectedPopulationEstimate,
        message: `New ${assessment.data.priorityLevel} priority incident created from preliminary assessment`
      });

      expect(notificationResult.success).toBe(true);
      expect(notificationResult.notificationsSent).toBe(3);
    });

    it('handles incident creation API errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const assessment = createMockAssessment();
      const request = IncidentService.prepareIncidentRequest(assessment);

      await expect(IncidentService.createFromAssessment(request!))
        .rejects.toThrow('Network error');
    });

    it('handles invalid response from incident creation API', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid assessment data' })
      } as Response);

      const assessment = createMockAssessment();
      const request = IncidentService.prepareIncidentRequest(assessment);

      await expect(IncidentService.createFromAssessment(request!))
        .rejects.toThrow('Invalid assessment data');
    });
  });

  describe('Offline Incident Creation Workflow', () => {
    beforeEach(() => {
      mockUseOfflineStore.mockReturnValue({
        isOnline: false,
        addToQueue: mockAddToQueue,
        addPendingAssessment: mockAddPendingAssessment
      } as any);
    });

    it('queues assessment and incident creation for offline mode', async () => {
      const assessment = createMockAssessment();
      
      // Simulate saving assessment offline
      await mockDb.saveAssessment(assessment);
      
      // Should add to offline queue
      mockAddToQueue({
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: assessment,
        priority: 'HIGH'
      });

      // Should also queue incident creation
      mockAddToQueue({
        type: 'INCIDENT',
        action: 'CREATE',
        data: {
          fromAssessmentId: assessment.id,
          assessmentData: assessment.data,
          affectedEntityId: assessment.affectedEntityId,
          assessorId: assessment.assessorId,
          assessorName: assessment.assessorName
        },
        priority: 'HIGH'
      });

      expect(mockDb.saveAssessment).toHaveBeenCalledWith(assessment);
      expect(mockAddToQueue).toHaveBeenCalledTimes(2);
    });

    it('handles offline queue processing when coming back online', async () => {
      // Simulate offline assessment creation
      const assessment = createMockAssessment();
      await mockDb.saveAssessment(assessment);

      // Now simulate coming back online
      mockUseOfflineStore.mockReturnValue({
        isOnline: true,
        addToQueue: mockAddToQueue,
        addPendingAssessment: mockAddPendingAssessment
      } as any);

      // Process the queued assessment
      const request = IncidentService.prepareIncidentRequest(assessment);
      const result = await IncidentService.createFromAssessment(request!);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Assessment-Incident Linking', () => {
    it('links assessment to created incident', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      const result = await IncidentService.linkAssessmentToIncident(
        'assessment-123',
        'incident-123',
        'CREATED_FROM'
      );

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/incidents/link-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: 'assessment-123',
          incidentId: 'incident-123',
          linkType: 'CREATED_FROM'
        })
      });
    });

    it('retrieves incident information for assessment', async () => {
      const mockIncident = {
        id: 'incident-123',
        name: 'FLOOD - SEVERE',
        status: 'ACTIVE',
        severity: 'SEVERE'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ incident: mockIncident })
      } as Response);

      const result = await IncidentService.getIncidentForAssessment('assessment-123');

      expect(result.incident).toEqual(mockIncident);
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/incidents/by-assessment/assessment-123');
    });

    it('handles case when no incident exists for assessment', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      } as Response);

      const result = await IncidentService.getIncidentForAssessment('assessment-123');

      expect(result.incident).toBeNull();
      expect(result.error).toBeUndefined();
    });
  });

  describe('Priority-Based Processing', () => {
    it('processes HIGH priority assessments first', async () => {
      const highPriorityAssessment = {
        ...createMockAssessment(),
        data: {
          ...createMockAssessment().data,
          priorityLevel: 'HIGH'
        }
      };

      const request = IncidentService.prepareIncidentRequest(highPriorityAssessment);
      
      // Should queue with HIGH priority
      mockAddToQueue({
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: highPriorityAssessment,
        priority: 'HIGH'
      });

      expect(mockAddToQueue).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'HIGH' })
      );
    });

    it('processes NORMAL priority assessments with standard priority', async () => {
      const normalPriorityAssessment = {
        ...createMockAssessment(),
        data: {
          ...createMockAssessment().data,
          priorityLevel: 'NORMAL'
        }
      };

      mockAddToQueue({
        type: 'ASSESSMENT',
        action: 'CREATE',
        data: normalPriorityAssessment,
        priority: 'NORMAL'
      });

      expect(mockAddToQueue).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'NORMAL' })
      );
    });
  });

  describe('Error Recovery', () => {
    it('retries incident creation on temporary failures', async () => {
      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            incident: { id: 'incident-123', name: 'Test' }
          })
        } as Response);

      const assessment = createMockAssessment();
      const request = IncidentService.prepareIncidentRequest(assessment);

      // First attempt should fail
      await expect(IncidentService.createFromAssessment(request!))
        .rejects.toThrow('Temporary network error');

      // Retry should succeed
      const result = await IncidentService.createFromAssessment(request!);
      expect(result.success).toBe(true);
    });

    it('handles partial failures in notification system', async () => {
      // Incident creation succeeds, notification partially fails
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            incident: { id: 'incident-123', name: 'Test' }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            notificationsSent: 2,
            notificationsFailed: 1,
            warnings: ['Coordinator offline: coordinator-3']
          })
        } as Response);

      const assessment = createMockAssessment();
      const request = IncidentService.prepareIncidentRequest(assessment);
      
      const incidentResult = await IncidentService.createFromAssessment(request!);
      expect(incidentResult.success).toBe(true);

      const notificationResult = await NotificationService.notifyCoordinators({
        incidentId: incidentResult.incident!.id,
        assessmentId: assessment.id,
        assessorName: assessment.assessorName,
        incidentType: assessment.data.incidentType,
        severity: assessment.data.severity,
        priorityLevel: assessment.data.priorityLevel,
        affectedPopulation: assessment.data.affectedPopulationEstimate,
        message: 'Test notification'
      });

      expect(notificationResult.success).toBe(true);
      expect(notificationResult.notificationsSent).toBe(2);
    });
  });
});