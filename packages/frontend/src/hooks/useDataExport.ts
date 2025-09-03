import { useState, useCallback } from 'react';

interface ExportRequest {
  type: 'assessments' | 'responses' | 'incidents' | 'entities';
  format: 'csv' | 'json' | 'pdf';
  filters: Record<string, any>;
  columns?: string[];
  includeMedia?: boolean;
}

interface ExportStatus {
  exportId: string;
  type: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
}

export function useDataExport() {
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [exportHistory, setExportHistory] = useState<ExportStatus[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateExport = useCallback(async (exportRequest: ExportRequest) => {
    setIsExporting(true);
    setError(null);
    setExportStatus(null);
    
    try {
      const response = await fetch(`/api/v1/monitoring/export/${exportRequest.type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportRequest),
      });

      const data = await response.json();
      
      if (data.success) {
        const initialStatus: ExportStatus = {
          exportId: data.data.exportId,
          type: data.data.type,
          status: 'processing',
          progress: 0,
          createdAt: data.data.generatedAt,
        };
        
        setExportStatus(initialStatus);
        
        // Start polling for status updates
        pollExportStatus(data.data.exportId, exportRequest.type);
      } else {
        setError(data.message || 'Failed to initiate export');
        setIsExporting(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setIsExporting(false);
    }
  }, []);

  const pollExportStatus = useCallback(async (exportId: string, type: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/v1/monitoring/export/${type}?exportId=${exportId}`);
        const data = await response.json();
        
        if (data.success) {
          setExportStatus(data.data);
          
          if (data.data.status === 'completed') {
            setIsExporting(false);
            // Add to export history
            setExportHistory(prev => {
              const newHistory = [data.data, ...prev.filter(item => item.exportId !== exportId)];
              return newHistory.slice(0, 10); // Keep last 10 exports
            });
          } else if (data.data.status === 'failed') {
            setError('Export processing failed');
            setIsExporting(false);
          } else {
            // Continue polling every 2 seconds
            setTimeout(poll, 2000);
          }
        } else {
          setError(data.message || 'Failed to check export status');
          setIsExporting(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check export status');
        setIsExporting(false);
      }
    };
    
    poll();
  }, []);

  const downloadExport = useCallback((downloadUrl: string, filename?: string) => {
    const link = document.createElement('a');
    link.href = downloadUrl;
    if (filename) {
      link.download = filename;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const clearExportStatus = useCallback(() => {
    setExportStatus(null);
    setError(null);
  }, []);

  const retryExport = useCallback(async (exportRequest: ExportRequest) => {
    await initiateExport(exportRequest);
  }, [initiateExport]);

  return {
    exportStatus,
    exportHistory,
    isExporting,
    error,
    initiateExport,
    downloadExport,
    clearExportStatus,
    retryExport,
  };
}