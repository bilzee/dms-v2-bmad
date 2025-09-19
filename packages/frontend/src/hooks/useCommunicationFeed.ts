import { useState, useCallback } from 'react';
import useSWR from 'swr';

interface CommunicationMessage {
  id: string;
  type: 'notification' | 'audit' | 'activity' | 'system';
  title: string;
  message: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: Date;
  entityId: string;
  metadata: any;
  status: string;
  source: string;
  category: string;
  actions: string[];
}

interface CommunicationFeedData {
  communicationFeed: CommunicationMessage[];
  summary: {
    totalMessages: number;
    unreadCount: number;
    highPriorityCount: number;
    messagesByType: Record<string, number>;
    messagesByCategory: Record<string, number>;
    recentActivity: {
      lastHour: number;
      last24Hours: number;
    };
  };
}

interface UseCommunicationFeedOptions {
  incidentId?: string;
  type?: 'notification' | 'audit' | 'activity' | 'system';
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  limit?: number;
  refreshInterval?: number;
}

interface UseCommunicationFeedReturn {
  data: CommunicationFeedData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  sendMessage: (request: any) => Promise<any>;
  isSendingMessage: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export const useCommunicationFeed = (options: UseCommunicationFeedOptions = {}): UseCommunicationFeedReturn => {
  const { incidentId, type, priority, limit = 50, refreshInterval = 30000 } = options; // 30 seconds default for real-time feel
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Build URL with query parameters
  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (incidentId) params.append('incidentId', incidentId);
    if (type) params.append('type', type);
    if (priority) params.append('priority', priority);
    if (limit) params.append('limit', limit.toString());
    
    return `/api/v1/coordinator/communications${params.toString() ? '?' + params.toString() : ''}`;
  }, [incidentId, type, priority, limit]);

  const { data, error, mutate } = useSWR(
    buildUrl(),
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: true, // More aggressive for communication feed
      revalidateOnReconnect: true,
      dedupingInterval: 10000 // Shorter deduping for real-time updates
    }
  );

  const sendMessage = useCallback(async (request: any) => {
    try {
      setIsSendingMessage(true);
      const response = await fetch('/api/v1/coordinator/communications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.errors?.[0] || 'Failed to send message');
      }

      // Refresh communication feed after successful send
      mutate();
      
      return result.data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    } finally {
      setIsSendingMessage(false);
    }
  }, [mutate]);

  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  return {
    data: data?.success ? data.data : null,
    loading: !error && !data,
    error: error?.message || (data?.success === false ? data.errors?.[0] : null),
    refresh,
    sendMessage,
    isSendingMessage
  };
};