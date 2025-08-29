/**
 * ConflictResolver - MVP Conflict Resolution Interface for Coordinators
 * 
 * Provides basic conflict resolution capabilities including:
 * - Simple conflict queue display  
 * - Side-by-side data comparison view
 * - Basic resolution controls (LOCAL_WINS/SERVER_WINS only)
 * - Basic audit trail logging
 * 
 * Advanced features disabled for MVP delivery
 */

'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle, XCircle, Eye, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { syncEngine, type ConflictDetailed, type ConflictResolution } from '@/lib/sync/SyncEngine';
import { ConflictComparison } from './ConflictComparison';
import { ConflictAuditTrail } from './ConflictAuditTrail';
import { toast } from '@/hooks/use-toast';

interface ConflictResolverProps {
  coordinatorId: string;
  onConflictResolved?: (conflictId: string) => void;
  className?: string;
}

// Simplified interface for MVP - no advanced filtering
interface ConflictFilters {
  entityType?: 'ALL' | 'ASSESSMENT' | 'RESPONSE' | 'INCIDENT' | 'ENTITY';
}

export const ConflictResolver: React.FC<ConflictResolverProps> = ({
  coordinatorId,
  onConflictResolved,
  className = ''
}) => {
  // State management
  const [conflicts, setConflicts] = useState<ConflictDetailed[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<ConflictDetailed | null>(null);
  const [resolutionStrategy, setResolutionStrategy] = useState<ConflictResolution>('SERVER_WINS');
  const [justification, setJustification] = useState('');
  const [mergedData, setMergedData] = useState<any>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [filters, setFilters] = useState<ConflictFilters>({
    entityType: 'ALL'
  });
  const [stats, setStats] = useState<any>(null);

  // Load conflicts and stats on mount and periodically
  useEffect(() => {
    loadConflicts();
    loadStats();
    
    const interval = setInterval(() => {
      loadConflicts();
      loadStats();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [filters]);

  /**
   * Load conflicts from SyncEngine with basic filtering (MVP)
   */
  const loadConflicts = () => {
    let allConflicts = syncEngine.getPendingConflicts();
    
    // Apply basic entity type filtering only
    if (filters.entityType !== 'ALL') {
      allConflicts = allConflicts.filter(conflict => conflict.entityType === filters.entityType);
    }
    
    setConflicts(allConflicts);
    
    // If selected conflict is no longer in the list, clear selection
    if (selectedConflict && !allConflicts.find(c => c.id === selectedConflict.id)) {
      setSelectedConflict(null);
    }
  };

  /**
   * Load conflict statistics
   */
  const loadStats = () => {
    const conflictStats = syncEngine.getConflictStats();
    setStats(conflictStats);
  };

  /**
   * Handle conflict selection
   */
  const handleConflictSelect = (conflict: ConflictDetailed) => {
    setSelectedConflict(conflict);
    setResolutionStrategy('SERVER_WINS');
    setJustification('');
    setMergedData(null);
  };

  /**
   * Handle conflict resolution (MVP - simplified validation)
   */
  const handleResolveConflict = async () => {
    if (!selectedConflict) {
      toast({
        title: 'Validation Error',
        description: 'Please select a conflict to resolve',
        variant: 'destructive'
      });
      return;
    }
    
    // MVP: Make justification optional for basic resolutions
    const finalJustification = justification.trim() || `${resolutionStrategy} resolution applied by coordinator`;
    
    setIsResolving(true);
    
    try {
      await syncEngine.resolveConflict(
        selectedConflict.id,
        resolutionStrategy,
        mergedData,
        coordinatorId,
        finalJustification
      );
      
      toast({
        title: 'Conflict Resolved',
        description: `Successfully resolved conflict for ${selectedConflict.entityType} ${selectedConflict.entityId}`,
      });
      
      // Refresh conflicts list
      loadConflicts();
      loadStats();
      
      // Clear selection
      setSelectedConflict(null);
      setJustification('');
      setMergedData(null);
      
      // Notify parent component
      onConflictResolved?.(selectedConflict.id);
      
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      toast({
        title: 'Resolution Failed',
        description: error instanceof Error ? error.message : 'Failed to resolve conflict',
        variant: 'destructive'
      });
    } finally {
      setIsResolving(false);
    }
  };

  /**
   * Get severity badge variant
   */
  const getSeverityBadgeVariant = (severity: ConflictDetailed['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'destructive';
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'default';
      case 'LOW':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  /**
   * Get severity icon
   */
  const getSeverityIcon = (severity: ConflictDetailed['severity']) => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4" />;
      case 'MEDIUM':
        return <Clock className="h-4 w-4" />;
      case 'LOW':
        return <Eye className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  /**
   * Format time ago
   */
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Statistics */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Conflict Resolution Center (MVP)</h2>
          <div className="flex items-center space-x-2">
            <Select 
              value={filters.entityType} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, entityType: value as ConflictFilters['entityType'] }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="ASSESSMENT">Assessment</SelectItem>
                <SelectItem value="RESPONSE">Response</SelectItem>
                <SelectItem value="INCIDENT">Incident</SelectItem>
                <SelectItem value="ENTITY">Entity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Conflicts</p>
                    <p className="text-2xl font-bold">{stats.pendingConflicts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Critical</p>
                    <p className="text-2xl font-bold">{stats.criticalConflicts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Resolved</p>
                    <p className="text-2xl font-bold">{stats.resolvedConflicts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{stats.totalConflicts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conflicts Queue */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Pending Conflicts ({conflicts.length})</CardTitle>
            <CardDescription>
              Conflicts require coordinator attention and resolution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {conflicts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p className="text-lg font-medium">No pending conflicts!</p>
                <p className="text-sm">All conflicts have been resolved.</p>
              </div>
            ) : (
              conflicts.map((conflict) => (
                <Card 
                  key={conflict.id}
                  className={`cursor-pointer transition-all ${
                    selectedConflict?.id === conflict.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                  }`}
                  onClick={() => handleConflictSelect(conflict)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getSeverityIcon(conflict.severity)}
                        <Badge variant={getSeverityBadgeVariant(conflict.severity)}>
                          {conflict.severity}
                        </Badge>
                        <Badge variant="outline">{conflict.entityType}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(conflict.detectedAt)}
                      </span>
                    </div>
                    
                    <p className="font-medium mb-1">
                      {conflict.entityType} {conflict.entityId}
                    </p>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {conflict.conflictType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      {conflict.conflictFields && conflict.conflictFields.length > 0 && (
                        <span> • Fields: {conflict.conflictFields.join(', ')}</span>
                      )}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Detected by: {conflict.detectedBy}</span>
                      {conflict.conflictFields && (
                        <span>{conflict.conflictFields.length} field(s) affected</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Conflict Resolution Panel */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Conflict Resolution</CardTitle>
            <CardDescription>
              {selectedConflict 
                ? `Resolving ${selectedConflict.entityType} ${selectedConflict.entityId}`
                : 'Select a conflict from the queue to begin resolution'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedConflict ? (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-3" />
                <p>Select a conflict to view details and resolution options</p>
              </div>
            ) : (
              <Tabs defaultValue="comparison" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="comparison">Data Comparison</TabsTrigger>
                  <TabsTrigger value="audit">Audit Trail</TabsTrigger>
                </TabsList>
                
                <TabsContent value="comparison" className="space-y-4">
                  <ConflictComparison
                    conflict={selectedConflict}
                    onMergedDataChange={setMergedData}
                  />
                  
                  {/* Resolution Strategy Selection - MVP: Basic strategies only */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Resolution Strategy (MVP)</label>
                    <Select value={resolutionStrategy} onValueChange={(value) => setResolutionStrategy(value as ConflictResolution)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOCAL_WINS">Accept Local Changes</SelectItem>
                        <SelectItem value="SERVER_WINS">Accept Server Version</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Justification - MVP: Optional */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Resolution Justification (Optional)</label>
                    <Textarea
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      placeholder="Optional: Explain why this resolution was chosen..."
                      className="min-h-[80px]"
                    />
                  </div>
                  
                  {/* Resolution Actions */}
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleResolveConflict}
                      disabled={isResolving}
                      className="flex-1"
                    >
                      {isResolving ? 'Resolving...' : 'Resolve Conflict'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedConflict(null)}
                      disabled={isResolving}
                    >
                      Cancel
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="audit">
                  <ConflictAuditTrail conflict={selectedConflict} />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* High Priority Alert */}
      {conflicts.some(c => c.severity === 'CRITICAL') && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Critical conflicts detected!</strong> 
            {` ${conflicts.filter(c => c.severity === 'CRITICAL').length} critical conflict(s) require immediate attention.`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ConflictResolver;