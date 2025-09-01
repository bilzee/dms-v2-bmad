'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Download, FileType, AlertCircle, CheckCircle, Clock } from 'lucide-react';

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

interface DataExportModalProps {
  dataType: 'assessments' | 'responses' | 'incidents' | 'entities';
  filters?: Record<string, any>;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DataExportModal({
  dataType,
  filters = {},
  trigger,
  open,
  onOpenChange,
}: DataExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [includeMedia, setIncludeMedia] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [exportHistory, setExportHistory] = useState<ExportStatus[]>([]);

  // Available columns for each data type
  const getAvailableColumns = (type: string) => {
    switch (type) {
      case 'assessments':
        return ['id', 'type', 'date', 'assessorName', 'verificationStatus', 'entityName', 'entityType', 'incidentName', 'mediaCount', 'coordinates'];
      case 'responses':
        return ['id', 'responseType', 'status', 'plannedDate', 'deliveredDate', 'responderName', 'entityName', 'donorName', 'deliveryItems', 'evidenceCount'];
      case 'incidents':
        return ['id', 'name', 'type', 'severity', 'status', 'date', 'assessmentCount', 'responseCount', 'affectedEntityCount'];
      case 'entities':
        return ['id', 'name', 'type', 'lga', 'ward', 'coordinates', 'totalAssessments', 'totalResponses', 'lastActivity'];
      default:
        return [];
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus(null);
    
    try {
      const exportRequest: ExportRequest = {
        type: dataType,
        format: selectedFormat,
        filters,
        columns: selectedColumns.length > 0 ? selectedColumns : undefined,
        includeMedia,
      };

      const response = await fetch(`/api/v1/monitoring/export/${dataType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportRequest),
      });

      const data = await response.json();
      
      if (data.success) {
        setExportStatus({
          exportId: data.data.exportId,
          type: data.data.type,
          status: 'processing',
          progress: 0,
          createdAt: data.data.generatedAt,
        });
        
        // Poll for export status
        pollExportStatus(data.data.exportId);
      }
    } catch (error) {
      console.error('Failed to initiate export:', error);
    }
  };

  const pollExportStatus = async (exportId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/v1/monitoring/export/${dataType}?exportId=${exportId}`);
        const data = await response.json();
        
        if (data.success) {
          setExportStatus(data.data);
          
          if (data.data.status === 'completed') {
            setIsExporting(false);
            // Add to export history
            setExportHistory(prev => [data.data, ...prev.slice(0, 4)]); // Keep last 5
          } else if (data.data.status === 'failed') {
            setIsExporting(false);
          } else {
            // Continue polling
            setTimeout(poll, 2000);
          }
        }
      } catch (error) {
        console.error('Failed to check export status:', error);
        setIsExporting(false);
      }
    };
    
    poll();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const availableColumns = getAvailableColumns(dataType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export {dataType.charAt(0).toUpperCase() + dataType.slice(1)} Data
          </DialogTitle>
          <DialogDescription>
            Configure export settings and download filtered data subsets
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Export Configuration */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="format">Export Format</Label>
              <Select value={selectedFormat} onValueChange={(value: 'csv' | 'json' | 'pdf') => setSelectedFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileType className="h-4 w-4" />
                      CSV - Spreadsheet format
                    </div>
                  </SelectItem>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileType className="h-4 w-4" />
                      JSON - Structured data
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileType className="h-4 w-4" />
                      PDF - Report format
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Column Selection for CSV */}
            {selectedFormat === 'csv' && (
              <div className="space-y-2">
                <Label>Select Columns (leave empty for all)</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {availableColumns.map((column) => (
                    <div key={column} className="flex items-center space-x-2">
                      <Checkbox
                        id={column}
                        checked={selectedColumns.includes(column)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedColumns([...selectedColumns, column]);
                          } else {
                            setSelectedColumns(selectedColumns.filter(c => c !== column));
                          }
                        }}
                      />
                      <Label htmlFor={column} className="text-sm">
                        {column.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Media Inclusion */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeMedia"
                checked={includeMedia}
                onCheckedChange={(checked) => setIncludeMedia(checked as boolean)}
              />
              <Label htmlFor="includeMedia" className="text-sm">
                Include media attachments (increases file size)
              </Label>
            </div>
          </div>

          {/* Current Export Status */}
          {exportStatus && (
            <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Export Status</h4>
                <div className="flex items-center gap-2">
                  {getStatusIcon(exportStatus.status)}
                  <span className="text-sm capitalize">{exportStatus.status}</span>
                </div>
              </div>
              
              {exportStatus.status === 'processing' && (
                <div className="space-y-2">
                  <Progress value={exportStatus.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Processing... {exportStatus.progress}%
                  </p>
                </div>
              )}
              
              {exportStatus.status === 'completed' && exportStatus.downloadUrl && (
                <Button asChild className="w-full">
                  <a href={exportStatus.downloadUrl} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download Export
                  </a>
                </Button>
              )}
            </div>
          )}

          {/* Export History */}
          {exportHistory.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Recent Exports</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {exportHistory.map((export_item) => (
                  <div key={export_item.exportId} className="flex items-center justify-between p-2 border rounded text-xs">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(export_item.status)}
                      <span>{export_item.type}</span>
                      <Badge variant="outline" className="text-xs">
                        {new Date(export_item.createdAt).toLocaleString()}
                      </Badge>
                    </div>
                    {export_item.downloadUrl && (
                      <Button asChild variant="outline" size="sm">
                        <a href={export_item.downloadUrl} download>
                          <Download className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleExport} 
              disabled={isExporting}
              className="flex-1"
            >
              {isExporting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Start Export
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}