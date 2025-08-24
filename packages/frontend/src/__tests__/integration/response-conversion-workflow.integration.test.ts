/**
 * Integration Test: Response Conversion Workflow
 * 
 * Tests the complete workflow from planned response to delivered status
 * including all components working together and API integration.
 */

import { useResponseStore } from '@/stores/response.store';
import { ResponseType, ResponseStatus, generateOfflineId } from '@dms/shared';

// Mock the offline store
jest.mock('@/stores/offline.store', () => ({
  useOfflineStore: {
    getState: () => ({
      addToQueue: jest.fn(),
    }),
  },
}));

describe('Response Conversion Workflow Integration', () => {
  beforeEach(() => {
    // COMPLETE state reset using setState to trigger updates
    useResponseStore.setState({
      responses: [],
      drafts: [],
      currentDraft: null,
      conversionInProgress: false,
      conversionDraft: null,
      currentConversion: null,
      isConverting: false,
      error: null,
    });

    // Reset any zustand persist state
    useResponseStore.persist.clearStorage();
  });

  describe('Complete Conversion Flow', () => {
    it('should complete full conversion workflow from planned to delivered', async () => {
      // Step 1: Create a mock planned response
      const mockPlannedResponse = {
        id: 'response-123',
        responseType: ResponseType.HEALTH,
        status: ResponseStatus.PLANNED,
        plannedDate: new Date('2024-01-15T10:00:00Z'),
        affectedEntityId: 'entity-1',
        assessmentId: 'assessment-1',
        responderId: 'responder-1',
        responderName: 'John Doe',
        verificationStatus: 'PENDING' as any,
        syncStatus: 'SYNCED' as any,
        data: {
          medicinesDelivered: [],
          medicalSuppliesDelivered: [],
          healthWorkersDeployed: 2,
          patientsTreated: 0,
        },
        otherItemsDelivered: [
          { item: 'Paracetamol', quantity: 100, unit: 'tablets' },
          { item: 'Bandages', quantity: 25, unit: 'rolls' },
        ],
        deliveryEvidence: [],
        createdAt: new Date('2024-01-10T08:00:00Z'),
        updatedAt: new Date('2024-01-10T08:00:00Z'),
      };

      // Add response to store using setState
      useResponseStore.setState({ responses: [mockPlannedResponse] });

      // Step 2: Start conversion process
      await useResponseStore.getState().startConversion('response-123');

      // Verify conversion started correctly
      let store = useResponseStore.getState();
      expect(store.conversionInProgress).toBe(true);
      expect(store.currentConversion).toBe('response-123');
      expect(store.conversionDraft).toMatchObject({
        originalPlanId: 'response-123',
        conversionTimestamp: expect.any(Date),
        deliveryTimestamp: expect.any(Date),
        deliveryLocation: expect.objectContaining({
          latitude: 0,
          longitude: 0,
          captureMethod: 'GPS',
        }),
        actualItemsDelivered: [],
        beneficiariesServed: 0,
        completionPercentage: 0,
        deliveryEvidence: [],
      });
      expect(store.error).toBeNull();

      // Step 3: Update conversion with actual delivery data
      const actualDeliveryData = {
        deliveryTimestamp: new Date('2024-01-15T14:00:00Z'),
        deliveryLocation: {
          latitude: 9.0579,
          longitude: 7.4951,
          timestamp: new Date('2024-01-15T14:00:00Z'),
          captureMethod: 'GPS' as const,
        },
        actualItemsDelivered: [
          {
            item: 'Paracetamol',
            plannedQuantity: 100,
            actualQuantity: 95,
            unit: 'tablets',
            variationPercentage: -5,
          },
          {
            item: 'Bandages',
            plannedQuantity: 25,
            actualQuantity: 30,
            unit: 'rolls',
            variationPercentage: 20,
          },
        ],
        beneficiariesServed: 75,
        deliveryNotes: 'Successful delivery with minor quantity adjustments',
        challenges: 'Slight shortage in Paracetamol due to increased demand',
      };

      useResponseStore.getState().updateConversionData(actualDeliveryData);

      // Verify conversion data updated
      store = useResponseStore.getState();
      expect(store.conversionDraft).toMatchObject({
        ...actualDeliveryData,
        originalPlanId: 'response-123',
      });

      // Step 4: Complete the conversion
      await useResponseStore.getState().completeConversion('response-123');

      // Verify final state
      store = useResponseStore.getState();
      expect(store.conversionInProgress).toBe(false);
      expect(store.conversionDraft).toBeNull();
      expect(store.currentConversion).toBeNull();
      expect(store.isConverting).toBe(false);

      // Verify response status changed
      const updatedResponse = store.responses.find(r => r.id === 'response-123');
      expect(updatedResponse?.status).toBe(ResponseStatus.DELIVERED);
      expect(updatedResponse?.deliveredDate).toEqual(actualDeliveryData.deliveryTimestamp);
    });

    it('should prevent conversion of non-planned responses', async () => {
      // Create a response that's already delivered
      const mockDeliveredResponse = {
        id: 'response-456',
        responseType: ResponseType.WASH,
        status: ResponseStatus.DELIVERED,
        plannedDate: new Date('2024-01-10T10:00:00Z'),
        deliveredDate: new Date('2024-01-10T14:00:00Z'),
        affectedEntityId: 'entity-2',
        assessmentId: 'assessment-2',
        responderId: 'responder-2',
        responderName: 'Jane Smith',
        verificationStatus: 'VERIFIED' as any,
        syncStatus: 'SYNCED' as any,
        data: {
          medicinesDelivered: [],
          medicalSuppliesDelivered: [],
          healthWorkersDeployed: 0,
          patientsTreated: 0,
        },
        otherItemsDelivered: [],
        deliveryEvidence: [],
        createdAt: new Date('2024-01-10T08:00:00Z'),
        updatedAt: new Date('2024-01-10T15:00:00Z'),
      };

      useResponseStore.setState({ responses: [mockDeliveredResponse] });

      // Attempt to start conversion
      await useResponseStore.getState().startConversion('response-456');

      // Verify conversion was rejected
      let store = useResponseStore.getState();
      expect(store.conversionInProgress).toBe(false);
      expect(store.error).toBe('Only planned responses can be converted to delivery');
    });

    it('should handle non-existent response gracefully', async () => {
      // Attempt to start conversion for non-existent response
      await useResponseStore.getState().startConversion('non-existent-response');

      // Verify error handling
      let store = useResponseStore.getState();
      expect(store.conversionInProgress).toBe(false);
      expect(store.error).toBe('Response not found for conversion');
    });
  });

  describe('Actual vs Planned Calculation', () => {
    it('should calculate actual vs planned items correctly', () => {
      const mockResponse = {
        id: 'response-789',
        responseType: ResponseType.FOOD,
        status: ResponseStatus.PLANNED,
        plannedDate: new Date(),
        affectedEntityId: 'entity-3',
        assessmentId: 'assessment-3',
        responderId: 'responder-3',
        responderName: 'Bob Wilson',
        verificationStatus: 'PENDING' as any,
        syncStatus: 'SYNCED' as any,
        data: {
          medicinesDelivered: [],
          medicalSuppliesDelivered: [],
          healthWorkersDeployed: 0,
          patientsTreated: 0,
        },
        otherItemsDelivered: [
          { item: 'Rice', quantity: 50, unit: 'kg' },
          { item: 'Oil', quantity: 10, unit: 'liters' },
          { item: 'Beans', quantity: 20, unit: 'kg' },
        ],
        deliveryEvidence: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      useResponseStore.setState({ responses: [mockResponse] });

      const actualItems = [
        { item: 'Rice', quantity: 45, unit: 'kg' }, // -10%
        { item: 'Oil', quantity: 12, unit: 'liters' }, // +20%
        { item: 'Beans', quantity: 20, unit: 'kg' }, // 0%
        { item: 'Salt', quantity: 5, unit: 'kg' }, // New item
      ];

      const comparison = useResponseStore.getState().calculateActualVsPlanned('response-789', actualItems);

      expect(comparison).toHaveLength(4);
      
      // Check Rice calculation
      expect(comparison.find(item => item.item === 'Rice')).toMatchObject({
        item: 'Rice',
        plannedQuantity: 50,
        actualQuantity: 45,
        unit: 'kg',
        variationPercentage: -10,
        variationReason: 'Significant variation',
      });

      // Check Oil calculation
      expect(comparison.find(item => item.item === 'Oil')).toMatchObject({
        item: 'Oil',
        plannedQuantity: 10,
        actualQuantity: 12,
        unit: 'liters',
        variationPercentage: 20,
        variationReason: 'Significant variation',
      });

      // Check Beans calculation (no significant variation)
      expect(comparison.find(item => item.item === 'Beans')).toMatchObject({
        item: 'Beans',
        plannedQuantity: 20,
        actualQuantity: 20,
        unit: 'kg',
        variationPercentage: 0,
        variationReason: undefined,
      });

      // Check new item (Salt)
      expect(comparison.find(item => item.item === 'Salt')).toMatchObject({
        item: 'Salt',
        plannedQuantity: 0,
        actualQuantity: 5,
        unit: 'kg',
        variationPercentage: 100,
        variationReason: 'Additional item not in plan',
      });
    });

    it('should handle empty planned items list', () => {
      const mockResponse = {
        id: 'response-empty',
        responseType: ResponseType.SECURITY,
        status: ResponseStatus.PLANNED,
        plannedDate: new Date(),
        affectedEntityId: 'entity-4',
        assessmentId: 'assessment-4',
        responderId: 'responder-4',
        responderName: 'Security Officer',
        verificationStatus: 'PENDING' as any,
        syncStatus: 'SYNCED' as any,
        data: {
          medicinesDelivered: [],
          medicalSuppliesDelivered: [],
          healthWorkersDeployed: 0,
          patientsTreated: 0,
        },
        otherItemsDelivered: [], // Empty planned items
        deliveryEvidence: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      useResponseStore.setState({ responses: [mockResponse] });

      const actualItems = [
        { item: 'Radio', quantity: 2, unit: 'units' },
      ];

      const comparison = useResponseStore.getState().calculateActualVsPlanned('response-empty', actualItems);

      expect(comparison).toHaveLength(1);
      expect(comparison[0]).toMatchObject({
        item: 'Radio',
        plannedQuantity: 0,
        actualQuantity: 2,
        unit: 'units',
        variationPercentage: 100,
        variationReason: 'Additional item not in plan',
      });
    });
  });

  describe('Error Recovery', () => {
    it('should handle conversion cancellation gracefully', async () => {
      const mockResponse = {
        id: 'response-cancel',
        responseType: ResponseType.SHELTER,
        status: ResponseStatus.PLANNED,
        plannedDate: new Date(),
        affectedEntityId: 'entity-5',
        assessmentId: 'assessment-5',
        responderId: 'responder-5',
        responderName: 'Shelter Coordinator',
        verificationStatus: 'PENDING' as any,
        syncStatus: 'SYNCED' as any,
        data: {
          medicinesDelivered: [],
          medicalSuppliesDelivered: [],
          healthWorkersDeployed: 0,
          patientsTreated: 0,
        },
        otherItemsDelivered: [
          { item: 'Tents', quantity: 5, unit: 'pieces' },
        ],
        deliveryEvidence: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      useResponseStore.setState({ responses: [mockResponse] });

      // Start conversion
      await useResponseStore.getState().startConversion('response-cancel');
      let store = useResponseStore.getState();
      expect(store.conversionInProgress).toBe(true);

      // Cancel conversion
      useResponseStore.getState().cancelConversion();

      // Verify clean cancellation
      store = useResponseStore.getState();
      expect(store.conversionInProgress).toBe(false);
      expect(store.conversionDraft).toBeNull();
      expect(store.currentConversion).toBeNull();
      
      // Original response should remain unchanged
      const originalResponse = store.responses.find(r => r.id === 'response-cancel');
      expect(originalResponse?.status).toBe(ResponseStatus.PLANNED);
    });

    it('should clear errors when requested', async () => {
      // Set an error state
      await useResponseStore.getState().startConversion('non-existent');
      let store = useResponseStore.getState();
      expect(store.error).toBeTruthy();

      // Clear the error
      useResponseStore.getState().clearError();
      store = useResponseStore.getState();
      expect(store.error).toBeNull();
    });
  });

  describe('Data Persistence', () => {
    it('should persist conversion state correctly', () => {
      // Create conversion draft
      const conversionDraft = {
        originalPlanId: 'response-persist',
        conversionTimestamp: new Date(),
        deliveryTimestamp: new Date(),
        deliveryLocation: {
          latitude: 9.0579,
          longitude: 7.4951,
          timestamp: new Date(),
          captureMethod: 'GPS' as const,
        },
        actualItemsDelivered: [],
        beneficiariesServed: 50,
        completionPercentage: 75,
        deliveryEvidence: [],
      };

      // Update store state
      useResponseStore.setState({ 
        conversionDraft, 
        currentConversion: 'response-persist' 
      });

      // Verify state is maintained
      const store = useResponseStore.getState();
      expect(store.conversionDraft).toEqual(conversionDraft);
      expect(store.currentConversion).toBe('response-persist');
    });
  });
});