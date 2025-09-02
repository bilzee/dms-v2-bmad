import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { 
  Donor, 
  DonorCommitment, 
  DonorAchievement,
  AffectedEntity,
  Incident,
  ResponseType 
} from '@dms/shared';

interface DonorCommitmentFormData {
  responseType: ResponseType;
  quantity: number;
  unit: string;
  targetDate: Date;
  affectedEntityId?: string;
  incidentId?: string;
  notes?: string;
}

interface DonorProfileUpdateData {
  name: string;
  organization: string;
  phone?: string;
}

interface DonorStoreState {
  // State
  currentDonor: Donor | null;
  commitments: DonorCommitment[];
  achievements: DonorAchievement[];
  availableEntities: AffectedEntity[];
  availableIncidents: Incident[];
  loading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;

  // Actions
  loadDonorProfile: () => Promise<void>;
  loadCommitments: (includeHistory?: boolean) => Promise<void>;
  loadDonorData: () => Promise<void>;
  createCommitment: (data: DonorCommitmentFormData) => Promise<DonorCommitment>;
  updateCommitment: (commitmentId: string, updates: Partial<DonorCommitment>) => Promise<DonorCommitment>;
  cancelCommitment: (commitmentId: string, reason: string) => Promise<DonorCommitment>;
  updateProfile: (data: DonorProfileUpdateData) => Promise<Donor>;
  clearError: () => void;
  reset: () => void;
}

export const useDonorStore = create<DonorStoreState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentDonor: null,
      commitments: [],
      achievements: [],
      availableEntities: [],
      availableIncidents: [],
      loading: false,
      isCreating: false,
      isUpdating: false,
      error: null,

      // Load donor profile
      loadDonorProfile: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/v1/donors/profile');
          const result = await response.json();

          if (!result.success) {
            throw new Error(result.message || 'Failed to load donor profile');
          }

          set({ 
            currentDonor: result.data.profile,
            loading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load donor profile',
            loading: false 
          });
        }
      },

      // Load commitments and achievements
      loadCommitments: async (includeHistory = true) => {
        const { currentDonor } = get();
        if (!currentDonor) return;

        set({ loading: true, error: null });
        try {
          const params = new URLSearchParams({
            includeHistory: includeHistory.toString(),
          });

          const response = await fetch(`/api/v1/donors/${currentDonor.id}/commitments?${params}`);
          const result = await response.json();

          if (!result.success) {
            throw new Error(result.message || 'Failed to load commitments');
          }

          set({ 
            commitments: result.data.commitments || [],
            achievements: result.data.achievements || [],
            loading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load commitments',
            loading: false 
          });
        }
      },

      // Load all donor-related data
      loadDonorData: async () => {
        set({ loading: true, error: null });
        try {
          // Load entities and incidents in parallel
          const [entitiesResponse, incidentsResponse] = await Promise.all([
            fetch('/api/v1/entities'),
            fetch('/api/v1/incidents'),
          ]);

          const entitiesResult = await entitiesResponse.json();
          const incidentsResult = await incidentsResponse.json();

          if (entitiesResult.success) {
            set({ availableEntities: entitiesResult.data.entities || [] });
          }

          if (incidentsResult.success) {
            set({ availableIncidents: incidentsResult.data.incidents || [] });
          }

          set({ loading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load donor data',
            loading: false 
          });
        }
      },

      // Create new commitment
      createCommitment: async (data: DonorCommitmentFormData) => {
        const { currentDonor } = get();
        if (!currentDonor) {
          throw new Error('No donor profile found');
        }

        set({ isCreating: true, error: null });
        try {
          const response = await fetch(`/api/v1/donors/${currentDonor.id}/commitments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...data,
              donorName: currentDonor.name,
              donorOrganization: currentDonor.organization,
              donorEmail: currentDonor.email,
            }),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.message || 'Failed to create commitment');
          }

          const newCommitment = result.data.commitment;

          // Update local state
          set(state => ({
            commitments: [...state.commitments, newCommitment],
            isCreating: false,
          }));

          return newCommitment;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create commitment',
            isCreating: false 
          });
          throw error;
        }
      },

      // Update existing commitment
      updateCommitment: async (commitmentId: string, updates: Partial<DonorCommitment>) => {
        const { currentDonor } = get();
        if (!currentDonor) {
          throw new Error('No donor profile found');
        }

        set({ isUpdating: true, error: null });
        try {
          const params = new URLSearchParams({ commitmentId });
          const response = await fetch(`/api/v1/donors/${currentDonor.id}/commitments?${params}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.message || 'Failed to update commitment');
          }

          const updatedCommitment = result.data.commitment;

          // Update local state
          set(state => ({
            commitments: state.commitments.map(c => 
              c.id === commitmentId ? updatedCommitment : c
            ),
            isUpdating: false,
          }));

          return updatedCommitment;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update commitment',
            isUpdating: false 
          });
          throw error;
        }
      },

      // Cancel commitment
      cancelCommitment: async (commitmentId: string, reason: string) => {
        const { currentDonor } = get();
        if (!currentDonor) {
          throw new Error('No donor profile found');
        }

        set({ isUpdating: true, error: null });
        try {
          const params = new URLSearchParams({ commitmentId, reason });
          const response = await fetch(`/api/v1/donors/${currentDonor.id}/commitments?${params}`, {
            method: 'DELETE',
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.message || 'Failed to cancel commitment');
          }

          const cancelledCommitment = result.data.commitment;

          // Update local state
          set(state => ({
            commitments: state.commitments.map(c => 
              c.id === commitmentId ? cancelledCommitment : c
            ),
            isUpdating: false,
          }));

          return cancelledCommitment;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to cancel commitment',
            isUpdating: false 
          });
          throw error;
        }
      },

      // Update donor profile
      updateProfile: async (data: DonorProfileUpdateData) => {
        set({ isUpdating: true, error: null });
        try {
          const response = await fetch('/api/v1/donors/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.message || 'Failed to update profile');
          }

          const updatedProfile = result.data.profile;

          set({ 
            currentDonor: updatedProfile,
            isUpdating: false,
          });

          return updatedProfile;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update profile',
            isUpdating: false 
          });
          throw error;
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Reset store
      reset: () => {
        set({
          currentDonor: null,
          commitments: [],
          achievements: [],
          availableEntities: [],
          availableIncidents: [],
          loading: false,
          isCreating: false,
          isUpdating: false,
          error: null,
        });
      },
    }),
    {
      name: 'donor-store',
    }
  )
);