import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  RapidResponse, 
  ResponseType, 
  ResponseStatus,
  RapidAssessment,
  AffectedEntity,
  OfflineQueueItem,
  DeliveryConversion,
  ActualVsPlannedItem,
  ResponseConversionRequest,
  GPSCoordinates,
  MediaAttachment,
  type DeliveryDocumentationFormData,
  type DeliveryDocumentationRequest,
} from '@dms/shared';

// Response Planning Draft - for offline creation
export interface ResponsePlanDraft {
  id: string; // Local UUID for draft
  responseType: ResponseType;
  affectedEntityId: string;
  assessmentId?: string;
  plannedDate: Date;
  estimatedDeliveryTime?: number; // minutes
  travelTimeToLocation?: number; // minutes
  data: Partial<any>; // Will be typed based on response type
  otherItemsDelivered: { item: string; quantity: number; unit: string }[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Item Template for quick selection
export interface ItemTemplate {
  id: string;
  responseType: ResponseType;
  name: string;
  category: string;
  defaultUnit: string;
  suggestedQuantities?: number[];
}

// Timeline planning data
export interface DeliveryTimeline {
  plannedDate: Date;
  estimatedTravelTime?: number; // minutes
  estimatedDeliveryDuration?: number; // minutes
  contingencyBuffer?: number; // minutes
  dependencies?: string[]; // IDs of other responses this depends on
  notes?: string;
}

interface ResponseState {
  // Response management
  responses: RapidResponse[];
  drafts: ResponsePlanDraft[];
  currentDraft: ResponsePlanDraft | null;
  
  // Conversion state
  conversionInProgress: boolean;
  conversionDraft: DeliveryConversion | null;
  currentConversion: string | null; // ID of response being converted
  
  // Delivery documentation state
  documentationInProgress: boolean;
  documentationDraft: DeliveryDocumentationFormData | null;
  currentDocumentation: string | null; // ID of response being documented
  
  // Planning helpers
  availableAssessments: RapidAssessment[];
  availableEntities: AffectedEntity[];
  itemTemplates: ItemTemplate[];
  
  // UI state
  isLoading: boolean;
  isCreating: boolean;
  isConverting: boolean;
  isDocumenting: boolean;
  error: string | null;
  
  // Filters and search
  filters: {
    responseType?: ResponseType;
    status?: ResponseStatus;
    dateRange?: { start: Date; end: Date };
    entityId?: string;
  };
  
  // Actions
  createDraft: (responseType: ResponseType, affectedEntityId: string) => string;
  updateDraft: (id: string, updates: Partial<ResponsePlanDraft>) => void;
  saveDraftToQueue: (id: string) => Promise<void>;
  deleteDraft: (id: string) => void;
  loadResponses: (filters?: ResponseState['filters']) => Promise<void>;
  loadSeedData: () => void;
  loadPlanningData: () => Promise<void>;
  setCurrentDraft: (draft: ResponsePlanDraft | null) => void;
  clearError: () => void;
  updateFilters: (filters: Partial<ResponseState['filters']>) => void;
  
  // Item template actions
  addItemTemplate: (template: Omit<ItemTemplate, 'id'>) => void;
  updateItemTemplate: (id: string, updates: Partial<ItemTemplate>) => void;
  deleteItemTemplate: (id: string) => void;
  getTemplatesForResponseType: (responseType: ResponseType) => ItemTemplate[];
  
  // Conversion actions
  startConversion: (responseId: string) => Promise<void>;
  updateConversionData: (updates: Partial<DeliveryConversion>) => void;
  completeConversion: (responseId: string) => Promise<void>;
  cancelConversion: () => void;
  calculateActualVsPlanned: (responseId: string, actualItems: { item: string; quantity: number; unit: string }[]) => ActualVsPlannedItem[];
  getResponseForConversion: (responseId: string) => RapidResponse | null;
  
  // Delivery documentation actions
  startDocumentation: (responseId: string) => Promise<void>;
  updateDocumentationData: (updates: Partial<DeliveryDocumentationFormData>) => void;
  completeDocumentation: (responseId: string) => Promise<void>;
  cancelDocumentation: () => void;
  getResponseForDocumentation: (responseId: string) => RapidResponse | null;
}

// Helper function to generate offline ID
const generateOfflineId = (): string => {
  return `response_draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to create default item templates
const createDefaultItemTemplates = (): ItemTemplate[] => [
  // Health Templates
  { id: 'health-1', responseType: ResponseType.HEALTH, name: 'Paracetamol', category: 'Medicine', defaultUnit: 'tablets', suggestedQuantities: [100, 500, 1000] },
  { id: 'health-2', responseType: ResponseType.HEALTH, name: 'Bandages', category: 'Medical Supplies', defaultUnit: 'rolls', suggestedQuantities: [10, 25, 50] },
  { id: 'health-3', responseType: ResponseType.HEALTH, name: 'Antiseptic', category: 'Medical Supplies', defaultUnit: 'bottles', suggestedQuantities: [5, 10, 20] },
  
  // WASH Templates
  { id: 'wash-1', responseType: ResponseType.WASH, name: 'Water Containers', category: 'Water Storage', defaultUnit: 'pieces', suggestedQuantities: [10, 25, 50] },
  { id: 'wash-2', responseType: ResponseType.WASH, name: 'Hygiene Kits', category: 'Hygiene', defaultUnit: 'kits', suggestedQuantities: [20, 50, 100] },
  { id: 'wash-3', responseType: ResponseType.WASH, name: 'Water Purification Tablets', category: 'Water Treatment', defaultUnit: 'packets', suggestedQuantities: [50, 100, 200] },
  
  // Shelter Templates
  { id: 'shelter-1', responseType: ResponseType.SHELTER, name: 'Tarpaulins', category: 'Shelter Material', defaultUnit: 'pieces', suggestedQuantities: [10, 20, 50] },
  { id: 'shelter-2', responseType: ResponseType.SHELTER, name: 'Blankets', category: 'Bedding', defaultUnit: 'pieces', suggestedQuantities: [20, 50, 100] },
  { id: 'shelter-3', responseType: ResponseType.SHELTER, name: 'Rope', category: 'Construction', defaultUnit: 'meters', suggestedQuantities: [100, 200, 500] },
  
  // Food Templates
  { id: 'food-1', responseType: ResponseType.FOOD, name: 'Rice', category: 'Staple Food', defaultUnit: 'kg', suggestedQuantities: [50, 100, 200] },
  { id: 'food-2', responseType: ResponseType.FOOD, name: 'Cooking Oil', category: 'Cooking Supplies', defaultUnit: 'liters', suggestedQuantities: [20, 50, 100] },
  { id: 'food-3', responseType: ResponseType.FOOD, name: 'Ready-to-Eat Meals', category: 'Prepared Food', defaultUnit: 'packets', suggestedQuantities: [50, 100, 200] },
  
  // Security Templates
  { id: 'security-1', responseType: ResponseType.SECURITY, name: 'Patrol Vehicles', category: 'Transport', defaultUnit: 'vehicles', suggestedQuantities: [1, 2, 3] },
  { id: 'security-2', responseType: ResponseType.SECURITY, name: 'Communication Equipment', category: 'Equipment', defaultUnit: 'units', suggestedQuantities: [5, 10, 15] },
  
  // Population Templates
  { id: 'population-1', responseType: ResponseType.POPULATION, name: 'ID Documents', category: 'Documentation', defaultUnit: 'pieces', suggestedQuantities: [50, 100, 200] },
  { id: 'population-2', responseType: ResponseType.POPULATION, name: 'Transport Vehicles', category: 'Evacuation', defaultUnit: 'vehicles', suggestedQuantities: [2, 5, 10] },
];

export const useResponseStore = create<ResponseState>()(
  persist(
    (set, get) => ({
      // Initial state
      responses: process.env.NODE_ENV === 'development' ? [] : [], // Will be populated by loadSeedData if needed
      drafts: [],
      currentDraft: null,
      
      // Conversion initial state
      conversionInProgress: false,
      conversionDraft: null,
      currentConversion: null,
      
      // Delivery documentation initial state
      documentationInProgress: false,
      documentationDraft: null,
      currentDocumentation: null,
      
      availableAssessments: [],
      availableEntities: [],
      itemTemplates: createDefaultItemTemplates(),
      
      isLoading: false,
      isCreating: false,
      isConverting: false,
      isDocumenting: false,
      error: null,
      
      filters: {},
      
      // Create new response plan draft
      createDraft: (responseType: ResponseType, affectedEntityId: string) => {
        const draftId = generateOfflineId();
        const newDraft: ResponsePlanDraft = {
          id: draftId,
          responseType,
          affectedEntityId,
          plannedDate: new Date(),
          data: {},
          otherItemsDelivered: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        set(state => ({
          drafts: [...state.drafts, newDraft],
          currentDraft: newDraft,
        }));
        
        return draftId;
      },
      
      // Update draft with new data
      updateDraft: (id: string, updates: Partial<ResponsePlanDraft>) => {
        set(state => ({
          drafts: state.drafts.map(draft =>
            draft.id === id 
              ? { ...draft, ...updates, updatedAt: new Date() }
              : draft
          ),
          currentDraft: state.currentDraft?.id === id 
            ? { ...state.currentDraft, ...updates, updatedAt: new Date() }
            : state.currentDraft,
        }));
      },
      
      // Save draft to offline queue for sync
      saveDraftToQueue: async (id: string) => {
        const { drafts } = get();
        const draft = drafts.find(d => d.id === id);
        
        if (!draft) {
          set({ error: 'Draft not found' });
          return;
        }
        
        set({ isCreating: true, error: null });
        
        try {
          // Create queue item for offline sync
          const queueItem: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'retryCount'> = {
            type: 'RESPONSE',
            action: 'CREATE',
            data: {
              responseType: draft.responseType,
              affectedEntityId: draft.affectedEntityId,
              assessmentId: draft.assessmentId,
              plannedDate: draft.plannedDate,
              data: draft.data,
              otherItemsDelivered: draft.otherItemsDelivered,
              notes: draft.notes,
            },
            priority: 'NORMAL',
          };
          
          // Add to offline queue (would integrate with existing offline store)
          // For now, we'll simulate by moving draft to pending responses
          const { useOfflineStore } = await import('./offline.store');
          useOfflineStore.getState().addToQueue(queueItem);
          
          // Remove from drafts
          set(state => ({
            drafts: state.drafts.filter(d => d.id !== id),
            currentDraft: state.currentDraft?.id === id ? null : state.currentDraft,
            isCreating: false,
          }));
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to save draft';
          set({ error: errorMessage, isCreating: false });
          console.error('Draft save error:', error);
        }
      },
      
      // Delete draft
      deleteDraft: (id: string) => {
        set(state => ({
          drafts: state.drafts.filter(d => d.id !== id),
          currentDraft: state.currentDraft?.id === id ? null : state.currentDraft,
        }));
      },
      
      // Load responses from API
      loadResponses: async (filters = {}) => {
        set({ isLoading: true, error: null });
        
        try {
          // In development, load seed data if no responses exist
          if (process.env.NODE_ENV === 'development') {
            const { responses } = get();
            if (responses.length === 0) {
              get().loadSeedData();
            }
          }
          
          // TODO: Implement actual API call
          // const response = await fetch('/api/v1/responses/plans', {
          //   method: 'GET',
          //   headers: { 'Content-Type': 'application/json' },
          //   body: JSON.stringify(filters),
          // });
          // const data = await response.json();
          
          set({ isLoading: false });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load responses';
          set({ error: errorMessage, isLoading: false });
        }
      },
      
      // Load seed data for development
      loadSeedData: () => {
        if (process.env.NODE_ENV === 'development') {
          try {
            const { seedResponses } = require('../lib/dev-data/seed-responses');
            set({ responses: [...seedResponses] });
          } catch (error) {
            console.warn('Failed to load seed data:', error);
          }
        }
      },
      
      // Load assessments and entities for planning
      loadPlanningData: async () => {
        try {
          // TODO: Load from existing stores or API
          // For now, use empty arrays
          set({
            availableAssessments: [],
            availableEntities: [],
          });
          
        } catch (error) {
          console.error('Failed to load planning data:', error);
        }
      },
      
      // Set current draft being edited
      setCurrentDraft: (draft: ResponsePlanDraft | null) => {
        set({ currentDraft: draft });
      },
      
      // Clear error state
      clearError: () => {
        set({ error: null });
      },
      
      // Update filters
      updateFilters: (newFilters: Partial<ResponseState['filters']>) => {
        set(state => ({
          filters: { ...state.filters, ...newFilters },
        }));
      },
      
      // Item template management
      addItemTemplate: (template: Omit<ItemTemplate, 'id'>) => {
        const newTemplate: ItemTemplate = {
          ...template,
          id: generateOfflineId(),
        };
        
        set(state => ({
          itemTemplates: [...state.itemTemplates, newTemplate],
        }));
      },
      
      updateItemTemplate: (id: string, updates: Partial<ItemTemplate>) => {
        set(state => ({
          itemTemplates: state.itemTemplates.map(template =>
            template.id === id ? { ...template, ...updates } : template
          ),
        }));
      },
      
      deleteItemTemplate: (id: string) => {
        set(state => ({
          itemTemplates: state.itemTemplates.filter(template => template.id !== id),
        }));
      },
      
      getTemplatesForResponseType: (responseType: ResponseType) => {
        const { itemTemplates } = get();
        return itemTemplates.filter(template => template.responseType === responseType);
      },
      
      // Conversion functionality
      startConversion: async (responseId: string) => {
        const { responses } = get();
        const response = responses.find(r => r.id === responseId);

        if (!response) {
          set({ error: 'Response not found for conversion' });
          return;
        }

        if (response.status !== ResponseStatus.PLANNED) {
          set({ error: 'Only planned responses can be converted to delivery' });
          return;
        }

        // CRITICAL: Ensure state is set before any async operations
        set({
          conversionInProgress: true,
          currentConversion: responseId,
          error: null, // Clear any previous errors
          conversionDraft: {
            originalPlanId: responseId,
            conversionTimestamp: new Date(),
            deliveryTimestamp: new Date(),
            deliveryLocation: {
              latitude: 0,
              longitude: 0,
              timestamp: new Date(),
              captureMethod: 'GPS' as const,
            },
            actualItemsDelivered: [],
            beneficiariesServed: 0,
            completionPercentage: 0,
            deliveryEvidence: [],
          }
        });
      },
      
      updateConversionData: (updates: Partial<DeliveryConversion>) => {
        const { conversionDraft } = get();
        if (!conversionDraft) return;
        
        set({
          conversionDraft: { ...conversionDraft, ...updates }
        });
      },
      
      completeConversion: async (responseId: string) => {
        const { conversionDraft, responses } = get();
        
        if (!conversionDraft) {
          set({ error: 'No conversion in progress' });
          return;
        }
        
        set({ isConverting: true, error: null });
        
        try {
          // Create conversion request
          const conversionRequest: ResponseConversionRequest = {
            deliveryTimestamp: conversionDraft.deliveryTimestamp,
            deliveryLocation: conversionDraft.deliveryLocation,
            actualData: responses.find(r => r.id === responseId)?.data || {} as any,
            actualItemsDelivered: conversionDraft.actualItemsDelivered.map(item => ({
              item: item.item,
              quantity: item.actualQuantity,
              unit: item.unit,
            })),
            deliveryEvidence: conversionDraft.deliveryEvidence,
            beneficiariesServed: conversionDraft.beneficiariesServed,
            deliveryNotes: conversionDraft.deliveryNotes,
            challenges: conversionDraft.challenges,
          };
          
          // Add to offline queue for sync
          const queueItem: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'retryCount'> = {
            type: 'RESPONSE',
            action: 'UPDATE',
            entityId: responseId,
            data: conversionRequest,
            priority: 'NORMAL',
          };
          
          const { useOfflineStore } = await import('./offline.store');
          useOfflineStore.getState().addToQueue(queueItem);
          
          // Update response status locally
          set(state => ({
            responses: state.responses.map(response =>
              response.id === responseId 
                ? { 
                    ...response, 
                    status: ResponseStatus.DELIVERED,
                    deliveredDate: conversionDraft.deliveryTimestamp,
                    deliveryEvidence: conversionDraft.deliveryEvidence,
                  }
                : response
            ),
            conversionInProgress: false,
            conversionDraft: null,
            currentConversion: null,
            isConverting: false,
          }));
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to complete conversion';
          set({ error: errorMessage, isConverting: false });
          console.error('Conversion completion error:', error);
        }
      },
      
      cancelConversion: () => {
        set({
          conversionInProgress: false,
          conversionDraft: null,
          currentConversion: null,
        });
      },
      
      calculateActualVsPlanned: (responseId: string, actualItems: { item: string; quantity: number; unit: string }[]): ActualVsPlannedItem[] => {
        const { responses } = get();
        const response = responses.find(r => r.id === responseId);

        if (!response) return [];

        const plannedItems = response.otherItemsDelivered;
        const comparison: ActualVsPlannedItem[] = [];

        // Process each planned item
        plannedItems.forEach(planned => {
          const actual = actualItems.find(a => a.item === planned.item && a.unit === planned.unit);
          const actualQuantity = actual?.quantity || 0;
          const variationPercentage = planned.quantity > 0
            ? ((actualQuantity - planned.quantity) / planned.quantity) * 100
            : 0;

          // CONSISTENT variation reason logic
          let variationReason: string | undefined;
          if (Math.abs(variationPercentage) >= 10) {
            variationReason = 'Significant variation';
          }

          comparison.push({
            item: planned.item,
            plannedQuantity: planned.quantity,
            actualQuantity,
            unit: planned.unit,
            variationPercentage,
            variationReason,
          });
        });

        // Add any additional actual items not in planned
        actualItems.forEach(actual => {
          const existsInPlanned = plannedItems.some(p => p.item === actual.item && p.unit === actual.unit);
          if (!existsInPlanned) {
            comparison.push({
              item: actual.item,
              plannedQuantity: 0,
              actualQuantity: actual.quantity,
              unit: actual.unit,
              variationPercentage: 100,
              variationReason: 'Additional item not in plan',
            });
          }
        });

        return comparison;
      },
      
      getResponseForConversion: (responseId: string): RapidResponse | null => {
        const { responses } = get();
        return responses.find(r => r.id === responseId) || null;
      },
      
      // Delivery documentation functionality
      startDocumentation: async (responseId: string) => {
        const { responses } = get();
        const response = responses.find(r => r.id === responseId);

        if (!response) {
          set({ error: 'Response not found for documentation' });
          return;
        }

        if (response.status !== ResponseStatus.IN_PROGRESS) {
          set({ error: 'Only in-progress responses can be documented' });
          return;
        }

        // Initialize documentation draft
        set({
          documentationInProgress: true,
          currentDocumentation: responseId,
          error: null,
          documentationDraft: {
            responseId,
            deliveryLocation: {
              latitude: 0,
              longitude: 0,
              timestamp: new Date(),
              captureMethod: 'GPS' as const,
            },
            beneficiaryVerification: {
              verificationMethod: 'VERBAL_CONFIRMATION',
              totalBeneficiariesServed: 0,
              householdsServed: 0,
              individualsServed: 0,
              demographicBreakdown: {
                male: 0,
                female: 0,
                children: 0,
                elderly: 0,
                pwD: 0,
              },
              verificationTimestamp: new Date(),
              verificationLocation: {
                latitude: 0,
                longitude: 0,
                timestamp: new Date(),
                captureMethod: 'GPS' as const,
              },
            },
            deliveryNotes: '',
            deliveryConditions: [],
            deliveryEvidence: [],
            completionTimestamp: new Date(),
            deliveryCompletionStatus: 'FULL',
            followUpRequired: false,
          },
        });
      },
      
      updateDocumentationData: (updates: Partial<DeliveryDocumentationFormData>) => {
        const { documentationDraft } = get();
        if (!documentationDraft) return;
        
        set({
          documentationDraft: { ...documentationDraft, ...updates }
        });
      },
      
      completeDocumentation: async (responseId: string) => {
        const { documentationDraft, responses } = get();
        
        if (!documentationDraft) {
          set({ error: 'No documentation in progress' });
          return;
        }
        
        set({ isDocumenting: true, error: null });
        
        try {
          // Create delivery documentation request
          const deliveryDocumentationRequest: DeliveryDocumentationRequest = {
            deliveryLocation: documentationDraft.deliveryLocation,
            beneficiaryVerification: documentationDraft.beneficiaryVerification,
            deliveryNotes: documentationDraft.deliveryNotes,
            deliveryConditions: documentationDraft.deliveryConditions,
            witnessDetails: documentationDraft.witnessDetails,
            deliveryEvidence: documentationDraft.deliveryEvidence,
            completionTimestamp: documentationDraft.completionTimestamp,
          };
          
          // Add to offline queue for sync
          const queueItem: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'retryCount'> = {
            type: 'RESPONSE',
            action: 'UPDATE',
            entityId: responseId,
            data: deliveryDocumentationRequest,
            priority: 'HIGH',
          };
          
          const { useOfflineStore } = await import('./offline.store');
          useOfflineStore.getState().addToQueue(queueItem);
          
          // Update response status locally
          set(state => ({
            responses: state.responses.map(response =>
              response.id === responseId 
                ? { 
                    ...response, 
                    status: ResponseStatus.DELIVERED,
                    deliveredDate: documentationDraft.completionTimestamp,
                    deliveryEvidence: [
                      ...(response.deliveryEvidence || []),
                      ...documentationDraft.deliveryEvidence,
                    ],
                    deliveryDocumentation: {
                      documentationId: generateOfflineId(),
                      completionTimestamp: documentationDraft.completionTimestamp,
                      deliveryLocation: documentationDraft.deliveryLocation,
                      beneficiaryVerification: documentationDraft.beneficiaryVerification,
                      deliveryNotes: documentationDraft.deliveryNotes,
                      deliveryConditions: documentationDraft.deliveryConditions,
                      witnessDetails: documentationDraft.witnessDetails,
                      deliveryCompletionStatus: documentationDraft.deliveryCompletionStatus,
                      followUpRequired: documentationDraft.followUpRequired,
                    },
                  }
                : response
            ),
            documentationInProgress: false,
            documentationDraft: null,
            currentDocumentation: null,
            isDocumenting: false,
          }));
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to complete documentation';
          set({ error: errorMessage, isDocumenting: false });
          console.error('Documentation completion error:', error);
        }
      },
      
      cancelDocumentation: () => {
        set({
          documentationInProgress: false,
          documentationDraft: null,
          currentDocumentation: null,
        });
      },
      
      getResponseForDocumentation: (responseId: string): RapidResponse | null => {
        const { responses } = get();
        return responses.find(r => r.id === responseId) || null;
      },
    }),
    {
      name: 'response-storage',
      partialize: (state) => ({
        drafts: state.drafts,
        itemTemplates: state.itemTemplates,
        filters: state.filters,
        conversionDraft: state.conversionDraft,
        currentConversion: state.currentConversion,
        documentationDraft: state.documentationDraft,
        currentDocumentation: state.currentDocumentation,
      }),
    }
  )
);

// Hook for getting current GPS location for response planning
export function useResponseLocation() {
  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    });
  };
  
  return { getCurrentLocation };
}