'use client';

import { useState, useRef } from 'react';
import { BulkImportData, BulkImportError } from '../../../../../../../shared/types/admin';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ImportStep = 'upload' | 'validation' | 'preview' | 'processing' | 'completed';

interface ValidationResult {
  validRows: number;
  invalidRows: number;
  errors: BulkImportError[];
  sampleUsers: any[];
}

export function BulkImportModal({ open, onClose, onSuccess }: BulkImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importData, setImportData] = useState<BulkImportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please select a valid CSV file.',
        variant: 'destructive'
      });
    }
  };

  const validateFile = async () => {
    if (!selectedFile) return;

    try {
      setLoading(true);
      setStep('validation');

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('validateOnly', 'true');

      const response = await fetch('/api/v1/admin/users/bulk-import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Validation failed');
      }

      const result = await response.json();
      
      if (result.success && result.data.preview) {
        setValidationResult(result.data.preview);
        setStep('preview');
      } else {
        throw new Error(result.message || 'Validation failed');
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: 'Validation Error',
        description: error instanceof Error ? error.message : 'Failed to validate file',
        variant: 'destructive'
      });
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const processImport = async () => {
    if (!selectedFile || !validationResult) return;

    try {
      setLoading(true);
      setStep('processing');
      setProgress(0);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/v1/admin/users/bulk-import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Import failed');
      }

      const result = await response.json();
      
      if (result.success) {
        setImportData(result.data);
        setProgress(100);
        setStep('completed');
        
        // Simulate progress update
        let currentProgress = 0;
        const progressInterval = setInterval(() => {
          currentProgress += 10;
          setProgress(currentProgress);
          if (currentProgress >= 100) {
            clearInterval(progressInterval);
          }
        }, 500);
      } else {
        throw new Error(result.message || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Error',
        description: error instanceof Error ? error.message : 'Failed to process import',
        variant: 'destructive'
      });
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['name', 'email', 'phone', 'organization', 'roles', 'isActive'];
    const sampleData = [
      ['John Doe', 'john.doe@example.com', '+1234567890', 'Relief Organization', 'ASSESSOR,RESPONDER', 'true'],
      ['Jane Smith', 'jane.smith@example.com', '+0987654321', 'Emergency Response', 'COORDINATOR', 'true']
    ];
    
    const csvContent = [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-import-template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const resetModal = () => {
    setStep('upload');
    setSelectedFile(null);
    setValidationResult(null);
    setImportData(null);
    setProgress(0);
    setLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (step === 'completed') {
      onSuccess();
    } else {
      onClose();
    }
    resetModal();
  };

  const renderUploadStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold mt-2">Upload CSV File</h3>
        <p className="text-sm text-muted-foreground">
          Select a CSV file containing user data to import
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file-upload">CSV File</Label>
        <Input
          id="file-upload"
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          ref={fileInputRef}
        />
        {selectedFile && (
          <p className="text-sm text-muted-foreground">
            Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
          </p>
        )}
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>CSV Format Requirements:</strong>
          <ul className="list-disc list-inside mt-1 text-sm">
            <li>Headers: name, email, phone, organization, roles, isActive</li>
            <li>Roles should be comma-separated (e.g., &quot;ASSESSOR,RESPONDER&quot;)</li>
            <li>isActive should be &quot;true&quot; or &quot;false&quot;</li>
            <li>Email addresses must be unique</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="flex justify-center">
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </div>
    </div>
  );

  const renderValidationStep = () => (
    <div className="flex flex-col items-center justify-center space-y-4 py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">Validating File</h3>
        <p className="text-sm text-muted-foreground">
          Checking data format and validating user information...
        </p>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <FileText className="mx-auto h-12 w-12 text-blue-600" />
        <h3 className="text-lg font-semibold mt-2">Import Preview</h3>
        <p className="text-sm text-muted-foreground">
          Review the validation results before importing
        </p>
      </div>

      {validationResult && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {validationResult.validRows}
                    </p>
                    <p className="text-sm text-muted-foreground">Valid Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-6 w-6 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {validationResult.invalidRows}
                    </p>
                    <p className="text-sm text-muted-foreground">Invalid Rows</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {validationResult.sampleUsers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sample Valid Users</CardTitle>
                <CardDescription>Preview of users that will be imported</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Roles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResult.sampleUsers.map((user, index) => (
                        <TableRow key={index}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.organization || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {user.roleIds && user.roleIds.length > 0 ? (
                                user.roleIds.map((roleId: string, i: number) => (
                                  <Badge key={i} variant="secondary">
                                    {roleId}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground">No roles</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {validationResult.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Validation Errors</CardTitle>
                <CardDescription>
                  These rows have errors and will not be imported
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResult.errors.map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell>{error.field}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {error.value}
                          </TableCell>
                          <TableCell className="text-red-600">
                            {error.error}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );

  const renderProcessingStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <RefreshCw className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
        <h3 className="text-lg font-semibold mt-2">Processing Import</h3>
        <p className="text-sm text-muted-foreground">
          Creating user accounts and sending notifications...
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>
    </div>
  );

  const renderCompletedStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
        <h3 className="text-lg font-semibold mt-2 text-green-600">
          Import Completed!
        </h3>
        <p className="text-sm text-muted-foreground">
          Users have been successfully imported
        </p>
      </div>

      {importData && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {importData.successfulRows}
                </p>
                <p className="text-sm text-muted-foreground">Users Created</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {importData.failedRows}
                </p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const getStepContent = () => {
    switch (step) {
      case 'upload':
        return renderUploadStep();
      case 'validation':
        return renderValidationStep();
      case 'preview':
        return renderPreviewStep();
      case 'processing':
        return renderProcessingStep();
      case 'completed':
        return renderCompletedStep();
      default:
        return renderUploadStep();
    }
  };

  const getFooterButtons = () => {
    switch (step) {
      case 'upload':
        return (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={validateFile} 
              disabled={!selectedFile || loading}
            >
              Validate File
            </Button>
          </>
        );
      case 'preview':
        return (
          <>
            <Button variant="outline" onClick={() => setStep('upload')}>
              Back
            </Button>
            <Button 
              onClick={processImport} 
              disabled={!validationResult || validationResult.validRows === 0 || loading}
            >
              Import {validationResult?.validRows || 0} Users
            </Button>
          </>
        );
      case 'completed':
        return (
          <Button onClick={handleClose}>
            Close
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Bulk Import Users</DialogTitle>
          <DialogDescription>
            Import multiple users from a CSV file with automatic validation and error reporting.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[400px]">
          {getStepContent()}
        </div>

        <DialogFooter>
          {getFooterButtons()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}