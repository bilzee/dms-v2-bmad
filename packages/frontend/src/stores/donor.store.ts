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

// Performance tracking interfaces
interface DonorPerformanceMetrics {
  donorId: string;
  onTimeDeliveryRate: number;
  quantityAccuracyRate: number;
  performanceScore: number;
  totalCommitments: number;
  completedDeliveries: number;
  beneficiariesHelped: number;
  responseTypesServed: string[];
  lastUpdated: Date;
}

interface PerformanceHistoryPoint {
  date: string;
  onTimeDeliveryRate: number;
  quantityAccuracyRate: number;
  performanceScore: number;
  completedDeliveries: number;
  beneficiariesHelped: number;
}

interface ImpactMetrics {
  totalBeneficiariesHelped: number;
  beneficiariesByResponseType: Record<string, number>;
  geographicImpact: {
    locationsServed: number;
    coverageAreaKm2: number;
    regions: Array<{
      name: string;
      beneficiaries: number;
      deliveries: number;
      responseTypes: string[];
    }>;
  };
  impactOverTime: Array<{
    date: string;
    cumulativeBeneficiaries: number;
    newBeneficiaries: number;
    deliveries: number;
  }>;
  effectivenessMetrics: {
    needFulfillmentRate: number;
    responseTimeHours: number;
    verificationRate: number;
  };
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
  
  // Performance tracking state
  performanceMetrics: DonorPerformanceMetrics | null;
  performanceHistory: PerformanceHistoryPoint[];
  impactMetrics: ImpactMetrics | null;
  loadingPerformance: boolean;
  performanceError: string | null;

  // Verification-based achievement state
  verificationAchievements: DonorAchievement[];
  verificationStamps: any[];
  leaderboardData: any;
  loadingVerificationData: boolean;
  verificationError: string | null;

  // Actions
  loadDonorProfile: () => Promise<void>;
  loadCommitments: (includeHistory?: boolean) => Promise<void>;
  loadDonorData: () => Promise<void>;
  createCommitment: (data: DonorCommitmentFormData) => Promise<DonorCommitment>;
  updateCommitment: (commitmentId: string, updates: Partial<DonorCommitment>) => Promise<DonorCommitment>;
  cancelCommitment: (commitmentId: string, reason: string) => Promise<DonorCommitment>;
  updateProfile: (data: DonorProfileUpdateData) => Promise<Donor>;
  
  // Performance tracking actions
  loadPerformanceMetrics: (period?: string, responseType?: string, location?: string) => Promise<void>;
  loadPerformanceHistory: (period?: string, granularity?: string) => Promise<void>;
  loadImpactMetrics: (period?: string, responseType?: string, region?: string) => Promise<void>;
  refreshPerformanceData: () => Promise<void>;
  
  // Verification-based achievement actions
  loadVerificationAchievements: (responseId?: string, verificationId?: string) => Promise<void>;
  calculateAchievementsForVerification: (responseId: string, verificationId: string) => Promise<any>;
  loadLeaderboard: (category?: string, timeframe?: string, includePrivate?: boolean) => Promise<void>;
  generateVerificationStamp: (responseId: string, verificationNotes?: string) => Promise<any>;
  
  clearError: () => void;
  clearPerformanceError: () => void;
  clearVerificationError: () => void;
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
      
      // Performance tracking initial state
      performanceMetrics: null,
      performanceHistory: [],
      impactMetrics: null,
      loadingPerformance: false,
      performanceError: null,

      // Verification-based achievement initial state
      verificationAchievements: [],
      verificationStamps: [],
      leaderboardData: null,
      loadingVerificationData: false,
      verificationError: null,

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
        const { currentDonor, commitments } = get();
        if (!currentDonor) {
          throw new Error('No donor profile found');
        }

        const existingCommitment = commitments.find(c => c.id === commitmentId);
        if (!existingCommitment) {
          throw new Error('Commitment not found');
        }

        const previousStatus = existingCommitment.status;

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

          // Track status change for performance metrics
          if (updates.status && updates.status !== previousStatus) {
            // Import status tracker dynamically to avoid circular dependencies
            const { trackCommitmentStatusChange } = await import('@/lib/performance/statusTracker');
            await trackCommitmentStatusChange(
              updatedCommitment,
              previousStatus,
              updates.status,
              {
                updatedAt: new Date().toISOString(),
                updatedBy: 'donor',
                ...updates
              }
            );
          }

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
        const { currentDonor, commitments } = get();
        if (!currentDonor) {
          throw new Error('No donor profile found');
        }

        const existingCommitment = commitments.find(c => c.id === commitmentId);
        if (!existingCommitment) {
          throw new Error('Commitment not found');
        }

        const previousStatus = existingCommitment.status;

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

          // Track status change for performance metrics
          if (cancelledCommitment.status === 'CANCELLED') {
            // Import status tracker dynamically to avoid circular dependencies
            const { trackCommitmentStatusChange } = await import('@/lib/performance/statusTracker');
            await trackCommitmentStatusChange(
              cancelledCommitment,
              previousStatus,
              'CANCELLED',
              {
                cancelledAt: new Date().toISOString(),
                cancelledBy: 'donor',
                reason
              }
            );
          }

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

      // Load performance metrics
      loadPerformanceMetrics: async (period = '90', responseType, location) => {
        set({ loadingPerformance: true, performanceError: null });
        try {
          const params = new URLSearchParams({
            period,
            ...(responseType && { responseType }),
            ...(location && { location }),
          });

          const response = await fetch(`/api/v1/donors/performance?${params}`);
          const result = await response.json();

          if (!result.success) {
            throw new Error(result.message || 'Failed to load performance metrics');
          }

          set({ 
            performanceMetrics: {
              ...result.data.metrics,
              lastUpdated: new Date(result.data.metrics.lastUpdated),
            },
            loadingPerformance: false 
          });
        } catch (error) {
          set({ 
            performanceError: error instanceof Error ? error.message : 'Failed to load performance metrics',
            loadingPerformance: false 
          });
        }
      },

      // Load performance history
      loadPerformanceHistory: async (period = '90', granularity = 'weekly') => {
        set({ loadingPerformance: true, performanceError: null });
        try {
          const params = new URLSearchParams({
            period,
            granularity,
          });

          const response = await fetch(`/api/v1/donors/performance/history?${params}`);
          const result = await response.json();

          if (!result.success) {
            throw new Error(result.message || 'Failed to load performance history');
          }

          set({ 
            performanceHistory: result.data.history || [],
            loadingPerformance: false 
          });
        } catch (error) {
          set({ 
            performanceError: error instanceof Error ? error.message : 'Failed to load performance history',
            loadingPerformance: false 
          });
        }
      },

      // Load impact metrics
      loadImpactMetrics: async (period = 'all', responseType, region) => {
        set({ loadingPerformance: true, performanceError: null });
        try {
          const params = new URLSearchParams({
            period,
            ...(responseType && { responseType }),
            ...(region && { region }),
          });

          const response = await fetch(`/api/v1/donors/impact?${params}`);
          const result = await response.json();

          if (!result.success) {
            throw new Error(result.message || 'Failed to load impact metrics');
          }

          set({ 
            impactMetrics: result.data.impact,
            loadingPerformance: false 
          });
        } catch (error) {
          set({ 
            performanceError: error instanceof Error ? error.message : 'Failed to load impact metrics',
            loadingPerformance: false 
          });
        }
      },

      // Refresh all performance data
      refreshPerformanceData: async () => {
        const { loadPerformanceMetrics, loadPerformanceHistory, loadImpactMetrics } = get();
        await Promise.allSettled([
          loadPerformanceMetrics(),
          loadPerformanceHistory(),
          loadImpactMetrics(),
        ]);
      },

      // Load verification-based achievements
      loadVerificationAchievements: async (responseId, verificationId) => {
        set({ loadingVerificationData: true, verificationError: null });
        try {
          const params = new URLSearchParams({
            includeStamps: 'true',
            ...(responseId && { responseId }),
            ...(verificationId && { verificationId }),
          });

          const response = await fetch(`/api/v1/donors/achievements/verification-based?${params}`);
          const result = await response.json();

          if (!result.success) {
            throw new Error(result.message || 'Failed to load verification achievements');
          }

          set({ 
            verificationAchievements: result.data.achievements || [],
            verificationStamps: result.data.verificationStamps || [],
            loadingVerificationData: false 
          });
        } catch (error) {
          set({ 
            verificationError: error instanceof Error ? error.message : 'Failed to load verification achievements',
            loadingVerificationData: false 
          });
        }
      },

      // Calculate achievements for verification
      calculateAchievementsForVerification: async (responseId: string, verificationId: string) => {
        set({ loadingVerificationData: true, verificationError: null });
        try {
          const response = await fetch('/api/v1/donors/achievements/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ responseId, verificationId }),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.message || 'Failed to calculate achievements');
          }

          // Update local achievements with new ones
          if (result.data.newAchievements && result.data.newAchievements.length > 0) {
            set(state => ({
              achievements: [...state.achievements, ...result.data.newAchievements],
              verificationAchievements: [...state.verificationAchievements, ...result.data.newAchievements],
            }));

            // Trigger browser event for notifications
            const { triggerAchievementNotification } = await import('@/components/features/donor/AchievementNotifications');
            triggerAchievementNotification(
              result.data.newAchievements,
              responseId,
              verificationId
            );
          }

          set({ loadingVerificationData: false });
          return result.data;
        } catch (error) {
          set({ 
            verificationError: error instanceof Error ? error.message : 'Failed to calculate achievements',
            loadingVerificationData: false 
          });
          throw error;
        }
      },

      // Load achievement leaderboard
      loadLeaderboard: async (category = 'OVERALL', timeframe = '90', includePrivate = false) => {
        set({ loadingVerificationData: true, verificationError: null });
        try {
          const params = new URLSearchParams({
            category,
            timeframe,
            includePrivate: includePrivate.toString(),
            limit: '20'
          });

          const response = await fetch(`/api/v1/donors/leaderboard?${params}`);
          const result = await response.json();

          if (!result.success) {
            throw new Error(result.message || 'Failed to load leaderboard');
          }

          set({ 
            leaderboardData: result.data,
            loadingVerificationData: false 
          });
        } catch (error) {
          set({ 
            verificationError: error instanceof Error ? error.message : 'Failed to load leaderboard',
            loadingVerificationData: false 
          });
        }
      },

      // Generate verification stamp
      generateVerificationStamp: async (responseId: string, verificationNotes?: string) => {
        set({ loadingVerificationData: true, verificationError: null });
        try {
          const response = await fetch(`/api/v1/verification/responses/${responseId}/stamp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              verificationNotes,
              generateAchievements: true 
            }),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.message || 'Failed to generate verification stamp');
          }

          // Refresh verification achievements if any were generated
          if (result.data.achievementResults && result.data.achievementResults.length > 0) {
            const { loadVerificationAchievements } = get();
            await loadVerificationAchievements();
          }

          set({ loadingVerificationData: false });
          return result.data;
        } catch (error) {
          set({ 
            verificationError: error instanceof Error ? error.message : 'Failed to generate verification stamp',
            loadingVerificationData: false 
          });
          throw error;
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Clear performance error
      clearPerformanceError: () => {
        set({ performanceError: null });
      },

      // Clear verification error
      clearVerificationError: () => {
        set({ verificationError: null });
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
          performanceMetrics: null,
          performanceHistory: [],
          impactMetrics: null,
          loadingPerformance: false,
          performanceError: null,
          verificationAchievements: [],
          verificationStamps: [],
          leaderboardData: null,
          loadingVerificationData: false,
          verificationError: null,
        });
      },
    }),
    {
      name: 'donor-store',
    }
  )
);