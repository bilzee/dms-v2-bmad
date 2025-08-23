import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  RapidResponse, 
  ResponseType, 
  ResponseStatus,
  RapidAssessment,
  AffectedEntity,
  OfflineQueueItem 
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
  
  // Planning helpers
  availableAssessments: RapidAssessment[];
  availableEntities: AffectedEntity[];
  itemTemplates: ItemTemplate[];
  
  // UI state
  isLoading: boolean;
  isCreating: boolean;
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
  loadPlanningData: () => Promise<void>;
  setCurrentDraft: (draft: ResponsePlanDraft | null) => void;
  clearError: () => void;
  updateFilters: (filters: Partial<ResponseState['filters']>) => void;
  
  // Item template actions
  addItemTemplate: (template: Omit<ItemTemplate, 'id'>) => void;
  updateItemTemplate: (id: string, updates: Partial<ItemTemplate>) => void;
  deleteItemTemplate: (id: string) => void;
  getTemplatesForResponseType: (responseType: ResponseType) => ItemTemplate[];
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
      responses: [],
      drafts: [],
      currentDraft: null,
      
      availableAssessments: [],
      availableEntities: [],
      itemTemplates: createDefaultItemTemplates(),
      
      isLoading: false,
      isCreating: false,
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
          // TODO: Implement actual API call
          // const response = await fetch('/api/v1/responses/plans', {
          //   method: 'GET',
          //   headers: { 'Content-Type': 'application/json' },
          //   body: JSON.stringify(filters),
          // });
          // const data = await response.json();
          
          // For now, return empty array
          set({ responses: [], isLoading: false });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load responses';
          set({ error: errorMessage, isLoading: false });
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
    }),
    {
      name: 'response-storage',
      partialize: (state) => ({
        drafts: state.drafts,
        itemTemplates: state.itemTemplates,
        filters: state.filters,
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