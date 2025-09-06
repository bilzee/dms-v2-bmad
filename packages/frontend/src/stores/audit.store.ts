// stores/audit.store.ts

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { 
  SystemActivityLog, 
  SecurityEvent,
  AuditActivityResponse,
  SecurityEventResponse,
  AuditDataExportResponse
} from '@dms/shared/types/admin';

// Local types for exports until they're added to shared types
interface AuditExport {
  id: string;
  type: 'user_activity' | 'security_events' | 'system_metrics';
  format: 'JSON' | 'CSV' | 'PDF';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  fileSize?: number;
  progress?: number;
  error?: string;
}

interface AuditExportResponse {
  success: boolean;
  data: { exportId: string };
  message?: string;
}

interface AuditExportListResponse {
  success: boolean;
  data: { exports: AuditExport[] };
  message?: string;
}

interface AuditFilters {
  search?: string;
  userId?: string;
  eventType?: string;
  module?: string;
  timeRange?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface SecurityFilters {
  search?: string;
  severity?: string;
  investigationStatus?: string;
  eventType?: string;
  timeRange?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

interface AuditStore {
  // Activity Logs State
  activities: SystemActivityLog[];
  activityFilters: AuditFilters;
  activityPagination: PaginationState;
  isLoadingActivities: boolean;
  lastActivityRefresh: Date | null;

  // Security Events State
  securityEvents: SecurityEvent[];
  securityFilters: SecurityFilters;
  securityPagination: PaginationState;
  isLoadingSecurityEvents: boolean;
  lastSecurityRefresh: Date | null;

  // Exports State
  exports: AuditExport[];
  isLoadingExports: boolean;
  lastExportRefresh: Date | null;

  // Actions
  // Activity Log Actions
  setActivities: (activities: SystemActivityLog[]) => void;
  setActivityFilters: (filters: Partial<AuditFilters>) => void;
  setActivityPagination: (pagination: Partial<PaginationState>) => void;
  setLoadingActivities: (loading: boolean) => void;
  loadActivities: (resetPagination?: boolean) => Promise<void>;
  refreshActivities: () => Promise<void>;

  // Security Event Actions
  setSecurityEvents: (events: SecurityEvent[]) => void;
  setSecurityFilters: (filters: Partial<SecurityFilters>) => void;
  setSecurityPagination: (pagination: Partial<PaginationState>) => void;
  setLoadingSecurityEvents: (loading: boolean) => void;
  loadSecurityEvents: (resetPagination?: boolean) => Promise<void>;
  refreshSecurityEvents: () => Promise<void>;
  updateSecurityEventStatus: (eventId: string, status: string, notes?: string) => Promise<boolean>;

  // Export Actions
  setExports: (exports: AuditExport[]) => void;
  setLoadingExports: (loading: boolean) => void;
  loadExports: () => Promise<void>;
  refreshExports: () => Promise<void>;
  createExport: (exportRequest: any) => Promise<string | null>;
  downloadExport: (exportId: string, format: string) => Promise<boolean>;
  deleteExport: (exportId: string) => Promise<boolean>;

  // Utility Actions
  reset: () => void;
}

const initialState = {
  // Activity Logs
  activities: [],
  activityFilters: {
    sortBy: 'timestamp',
    sortOrder: 'desc' as const,
    timeRange: '24h'
  },
  activityPagination: {
    page: 1,
    limit: 50,
    total: 0
  },
  isLoadingActivities: false,
  lastActivityRefresh: null,

  // Security Events
  securityEvents: [],
  securityFilters: {
    sortBy: 'detectedAt',
    sortOrder: 'desc' as const,
    timeRange: '24h'
  },
  securityPagination: {
    page: 1,
    limit: 50,
    total: 0
  },
  isLoadingSecurityEvents: false,
  lastSecurityRefresh: null,

  // Exports
  exports: [],
  isLoadingExports: false,
  lastExportRefresh: null,
};

export const useAuditStore = create<AuditStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Activity Log Actions
        setActivities: (activities) => set({ activities }),

        setActivityFilters: (filters) => 
          set((state) => ({
            activityFilters: { ...state.activityFilters, ...filters }
          })),

        setActivityPagination: (pagination) =>
          set((state) => ({
            activityPagination: { ...state.activityPagination, ...pagination }
          })),

        setLoadingActivities: (loading) => set({ isLoadingActivities: loading }),

        loadActivities: async (resetPagination = false) => {
          const { activityFilters, activityPagination, setLoadingActivities, setActivities, setActivityPagination } = get();
          
          try {
            setLoadingActivities(true);

            if (resetPagination) {
              setActivityPagination({ page: 1 });
            }

            const currentPagination = resetPagination 
              ? { ...activityPagination, page: 1 }
              : activityPagination;

            const searchParams = new URLSearchParams();
            
            // Add filters
            Object.entries(activityFilters).forEach(([key, value]) => {
              if (value) searchParams.set(key, value.toString());
            });

            // Add pagination
            searchParams.set('page', currentPagination.page.toString());
            searchParams.set('limit', currentPagination.limit.toString());

            const response = await fetch(`/api/v1/admin/audit/activity?${searchParams}`);
            const data: AuditActivityResponse = await response.json();

            if (data.success) {
              setActivities(data.data.activities);
              setActivityPagination({ total: data.data.totalCount });
              set({ lastActivityRefresh: new Date() });
            } else {
              throw new Error(data.message || 'Failed to load activities');
            }
          } catch (error) {
            console.error('Failed to load activities:', error);
            throw error;
          } finally {
            setLoadingActivities(false);
          }
        },

        refreshActivities: async () => {
          const { loadActivities } = get();
          await loadActivities(false);
        },

        // Security Event Actions
        setSecurityEvents: (events) => set({ securityEvents: events }),

        setSecurityFilters: (filters) => 
          set((state) => ({
            securityFilters: { ...state.securityFilters, ...filters }
          })),

        setSecurityPagination: (pagination) =>
          set((state) => ({
            securityPagination: { ...state.securityPagination, ...pagination }
          })),

        setLoadingSecurityEvents: (loading) => set({ isLoadingSecurityEvents: loading }),

        loadSecurityEvents: async (resetPagination = false) => {
          const { securityFilters, securityPagination, setLoadingSecurityEvents, setSecurityEvents, setSecurityPagination } = get();
          
          try {
            setLoadingSecurityEvents(true);

            if (resetPagination) {
              setSecurityPagination({ page: 1 });
            }

            const currentPagination = resetPagination 
              ? { ...securityPagination, page: 1 }
              : securityPagination;

            const searchParams = new URLSearchParams();
            
            // Add filters
            Object.entries(securityFilters).forEach(([key, value]) => {
              if (value) searchParams.set(key, value.toString());
            });

            // Add pagination
            searchParams.set('page', currentPagination.page.toString());
            searchParams.set('limit', currentPagination.limit.toString());

            const response = await fetch(`/api/v1/admin/audit/security-events?${searchParams}`);
            const data: SecurityEventResponse = await response.json();

            if (data.success) {
              setSecurityEvents(data.data.events);
              setSecurityPagination({ total: data.data.totalCount });
              set({ lastSecurityRefresh: new Date() });
            } else {
              throw new Error(data.message || 'Failed to load security events');
            }
          } catch (error) {
            console.error('Failed to load security events:', error);
            throw error;
          } finally {
            setLoadingSecurityEvents(false);
          }
        },

        refreshSecurityEvents: async () => {
          const { loadSecurityEvents } = get();
          await loadSecurityEvents(false);
        },

        updateSecurityEventStatus: async (eventId, status, notes) => {
          try {
            const response = await fetch(`/api/v1/admin/audit/security-events/${eventId}/investigate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                investigationStatus: status,
                investigatorNotes: notes
              })
            });

            if (response.ok) {
              // Update the event in the local state
              const { securityEvents, setSecurityEvents } = get();
              const updatedEvents = securityEvents.map(event => 
                event.id === eventId 
                  ? { ...event, investigationStatus: status as any, investigatorNotes: notes }
                  : event
              );
              setSecurityEvents(updatedEvents);
              return true;
            } else {
              throw new Error('Failed to update status');
            }
          } catch (error) {
            console.error('Failed to update security event status:', error);
            return false;
          }
        },

        // Export Actions
        setExports: (exports) => set({ exports }),

        setLoadingExports: (loading) => set({ isLoadingExports: loading }),

        loadExports: async () => {
          const { setLoadingExports, setExports } = get();
          
          try {
            setLoadingExports(true);

            const response = await fetch('/api/v1/admin/audit/export');
            const data: AuditExportListResponse = await response.json();

            if (data.success) {
              setExports(data.data.exports);
              set({ lastExportRefresh: new Date() });
            } else {
              throw new Error(data.message || 'Failed to load exports');
            }
          } catch (error) {
            console.error('Failed to load exports:', error);
            throw error;
          } finally {
            setLoadingExports(false);
          }
        },

        refreshExports: async () => {
          const { loadExports } = get();
          await loadExports();
        },

        createExport: async (exportRequest) => {
          try {
            const response = await fetch('/api/v1/admin/audit/export', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(exportRequest)
            });

            const data: AuditExportResponse = await response.json();

            if (data.success) {
              // Refresh exports to include the new one
              const { loadExports } = get();
              await loadExports();
              return data.data.exportId;
            } else {
              throw new Error(data.message || 'Failed to create export');
            }
          } catch (error) {
            console.error('Failed to create export:', error);
            return null;
          }
        },

        downloadExport: async (exportId, format) => {
          try {
            const response = await fetch(`/api/v1/admin/audit/export/${exportId}/download?format=${format}`);
            
            if (!response.ok) {
              throw new Error('Download failed');
            }

            // Create download link
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-export-${exportId}.${format.toLowerCase()}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            return true;
          } catch (error) {
            console.error('Failed to download export:', error);
            return false;
          }
        },

        deleteExport: async (exportId) => {
          try {
            const response = await fetch(`/api/v1/admin/audit/export/${exportId}`, {
              method: 'DELETE'
            });

            if (response.ok) {
              // Remove from local state
              const { exports, setExports } = get();
              const updatedExports = exports.filter(exp => exp.id !== exportId);
              setExports(updatedExports);
              return true;
            } else {
              throw new Error('Failed to delete export');
            }
          } catch (error) {
            console.error('Failed to delete export:', error);
            return false;
          }
        },

        // Utility Actions
        reset: () => set(initialState),
      }),
      {
        name: 'audit-store',
        // Only persist filters and pagination, not the actual data
        partialize: (state) => ({
          activityFilters: state.activityFilters,
          activityPagination: state.activityPagination,
          securityFilters: state.securityFilters,
          securityPagination: state.securityPagination,
        }),
      }
    ),
    { name: 'audit-store' }
  )
);