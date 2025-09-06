// components/features/admin/audit/AuditExportControls.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  Trash2,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { 
  AuditExport, 
  AuditExportRequest, 
  AuditExportResponse,
  AuditExportListResponse 
} from '@dms/shared/types/admin';

interface AuditExportControlsProps {
  className?: string;
}

interface ExportForm {
  type: 'user_activity' | 'security_events' | 'system_metrics';
  format: 'JSON' | 'CSV' | 'PDF';
  dateFrom: string;
  dateTo: string;
  includeDetails: boolean;
  filters: {
    userId?: string;
    eventType?: string;
    module?: string;
    severity?: string;
  };
}

export function AuditExportControls({ className }: AuditExportControlsProps) {
  const { toast } = useToast();
  
  // State management
  const [exportForm, setExportForm] = useState<ExportForm>({
    type: 'user_activity',
    format: 'CSV',
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    dateTo: new Date().toISOString().split('T')[0], // Today
    includeDetails: true,
    filters: {}
  });
  const [activeExports, setActiveExports] = useState<AuditExport[]>([]);
  const [completedExports, setCompletedExports] = useState<AuditExport[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing exports
  const loadExports = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/v1/admin/audit/export');
      const data: AuditExportListResponse = await response.json();

      if (data.success) {
        const active = data.data.exports.filter(exp => 
          exp.status === 'PENDING' || exp.status === 'PROCESSING'
        );
        const completed = data.data.exports.filter(exp => 
          exp.status === 'COMPLETED' || exp.status === 'FAILED' || exp.status === 'EXPIRED'
        );
        
        setActiveExports(active);
        setCompletedExports(completed);
      } else {
        throw new Error(data.message || 'Failed to load exports');
      }
    } catch (error) {
      console.error('Failed to load exports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load export history',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load exports on mount and set up polling for active exports
  useEffect(() => {
    loadExports();
    
    // Poll every 5 seconds if there are active exports
    const interval = setInterval(() => {
      if (activeExports.length > 0) {
        loadExports();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeExports.length]);

  // Handle form field changes
  const updateFormField = <K extends keyof ExportForm>(field: K, value: ExportForm[K]) => {
    setExportForm(prev => ({ ...prev, [field]: value }));
  };

  // Handle filter changes
  const updateFilter = (key: string, value: string) => {
    setExportForm(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value || undefined }
    }));
  };

  // Submit export request
  const handleExportSubmit = async () => {
    if (!exportForm.dateFrom || !exportForm.dateTo) {
      toast({
        title: 'Validation Error',
        description: 'Please select both start and end dates',
        variant: 'destructive'
      });
      return;
    }

    if (new Date(exportForm.dateFrom) > new Date(exportForm.dateTo)) {
      toast({
        title: 'Validation Error',
        description: 'Start date must be before end date',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const exportRequest: AuditExportRequest = {
        type: exportForm.type,
        format: exportForm.format,
        dateRange: {
          from: new Date(exportForm.dateFrom),
          to: new Date(exportForm.dateTo)
        },
        includeDetails: exportForm.includeDetails,
        filters: Object.fromEntries(
          Object.entries(exportForm.filters).filter(([_, value]) => value)
        )
      };

      const response = await fetch('/api/v1/admin/audit/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportRequest)
      });

      const data: AuditExportResponse = await response.json();

      if (data.success) {
        toast({
          title: 'Export Started',
          description: `Export ${data.data.exportId} has been queued for processing`,
        });
        
        // Reload exports to show the new one
        loadExports();
      } else {
        throw new Error(data.message || 'Failed to start export');
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to start export',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download completed export
  const handleDownload = async (exportId: string, format: string) => {
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

      toast({
        title: 'Download Started',
        description: 'Your export file is being downloaded',
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Failed to download export file',
        variant: 'destructive'
      });
    }
  };

  // Delete export
  const handleDelete = async (exportId: string) => {
    try {
      const response = await fetch(`/api/v1/admin/audit/export/${exportId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Export Deleted',
          description: 'Export has been removed from the system'
        });
        loadExports();
      } else {
        throw new Error('Failed to delete export');
      }
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete export',
        variant: 'destructive'
      });
    }
  };

  // Get status badge for export
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { variant: 'secondary' as const, icon: <Clock className="h-3 w-3" /> };
      case 'PROCESSING':
        return { variant: 'default' as const, icon: <RefreshCw className="h-3 w-3 animate-spin" /> };
      case 'COMPLETED':
        return { variant: 'default' as const, icon: <CheckCircle className="h-3 w-3" /> };
      case 'FAILED':
        return { variant: 'destructive' as const, icon: <XCircle className="h-3 w-3" /> };
      case 'EXPIRED':
        return { variant: 'outline' as const, icon: <Clock className="h-3 w-3" /> };
      default:
        return { variant: 'secondary' as const, icon: <Clock className="h-3 w-3" /> };
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Export Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Create New Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Export Type and Format */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="export-type">Data Type</Label>
                <Select value={exportForm.type} onValueChange={(value: any) => updateFormField('type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select data type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user_activity">User Activity Logs</SelectItem>
                    <SelectItem value="security_events">Security Events</SelectItem>
                    <SelectItem value="system_metrics">System Metrics</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="export-format">Export Format</Label>
                <Select value={exportForm.format} onValueChange={(value: any) => updateFormField('format', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CSV">CSV (Comma Separated Values)</SelectItem>
                    <SelectItem value="JSON">JSON (JavaScript Object Notation)</SelectItem>
                    <SelectItem value="PDF">PDF (Portable Document Format)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date-from">Start Date</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={exportForm.dateFrom}
                  onChange={(e) => updateFormField('dateFrom', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="date-to">End Date</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={exportForm.dateTo}
                  onChange={(e) => updateFormField('dateTo', e.target.value)}
                />
              </div>
            </div>

            {/* Filters based on export type */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters (Optional)
              </Label>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {exportForm.type === 'user_activity' && (
                  <>
                    <div>
                      <Label htmlFor="filter-user">User ID</Label>
                      <Input
                        id="filter-user"
                        placeholder="Filter by user ID"
                        value={exportForm.filters.userId || ''}
                        onChange={(e) => updateFilter('userId', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="filter-event-type">Event Type</Label>
                      <Select value={exportForm.filters.eventType || ''} onValueChange={(value) => updateFilter('eventType', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="All event types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Types</SelectItem>
                          <SelectItem value="LOGIN">Login</SelectItem>
                          <SelectItem value="LOGOUT">Logout</SelectItem>
                          <SelectItem value="API_ACCESS">API Access</SelectItem>
                          <SelectItem value="DATA_EXPORT">Data Export</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="filter-module">Module</Label>
                      <Select value={exportForm.filters.module || ''} onValueChange={(value) => updateFilter('module', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="All modules" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Modules</SelectItem>
                          <SelectItem value="auth">Authentication</SelectItem>
                          <SelectItem value="incidents">Incidents</SelectItem>
                          <SelectItem value="resources">Resources</SelectItem>
                          <SelectItem value="sync">Sync</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {exportForm.type === 'security_events' && (
                  <>
                    <div>
                      <Label htmlFor="filter-severity">Severity</Label>
                      <Select value={exportForm.filters.severity || ''} onValueChange={(value) => updateFilter('severity', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="All severities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Severities</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="LOW">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-details"
                checked={exportForm.includeDetails}
                onCheckedChange={(checked) => updateFormField('includeDetails', !!checked)}
              />
              <Label htmlFor="include-details" className="text-sm">
                Include detailed metadata and context information
              </Label>
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleExportSubmit} 
              disabled={isSubmitting}
              className="w-full md:w-auto"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating Export...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Start Export
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Exports */}
      {activeExports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Active Exports ({activeExports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeExports.map((exportItem) => {
                const statusBadge = getStatusBadge(exportItem.status);
                
                return (
                  <div key={exportItem.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={statusBadge.variant} className="flex items-center gap-1">
                          {statusBadge.icon}
                          {exportItem.status}
                        </Badge>
                        <Badge variant="outline">{exportItem.type}</Badge>
                        <Badge variant="outline">{exportItem.format}</Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Export ID: {exportItem.id}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Created: {new Date(exportItem.createdAt).toLocaleString()}
                      </div>
                      
                      {exportItem.progress && exportItem.progress > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{exportItem.progress.toFixed(1)}%</span>
                          </div>
                          <Progress value={exportItem.progress} className="h-2" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(exportItem.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Exports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export History
            <Button variant="ghost" size="sm" onClick={loadExports} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mr-2"></div>
              Loading export history...
            </div>
          ) : completedExports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No completed exports found
            </div>
          ) : (
            <div className="space-y-3">
              {completedExports.map((exportItem) => {
                const statusBadge = getStatusBadge(exportItem.status);
                
                return (
                  <div key={exportItem.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={statusBadge.variant} className="flex items-center gap-1">
                          {statusBadge.icon}
                          {exportItem.status}
                        </Badge>
                        <Badge variant="outline">{exportItem.type}</Badge>
                        <Badge variant="outline">{exportItem.format}</Badge>
                        {exportItem.fileSize && (
                          <Badge variant="outline">{formatFileSize(exportItem.fileSize)}</Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Export ID: {exportItem.id}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Created: {new Date(exportItem.createdAt).toLocaleString()}
                      </div>
                      
                      {exportItem.expiresAt && (
                        <div className="text-sm text-muted-foreground">
                          Expires: {new Date(exportItem.expiresAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {exportItem.status === 'COMPLETED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(exportItem.id, exportItem.format)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(exportItem.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}