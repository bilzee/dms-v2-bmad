/**
 * ConflictAuditTrail - Conflict Resolution Audit Trail Component
 * 
 * Displays chronological audit trail of all conflict resolution actions:
 * - Conflict detection events
 * - Resolution attempts and outcomes
 * - User attributions and timestamps
 * - Resolution justifications and details
 */

'use client';

import React from 'react';
import { Clock, User, AlertTriangle, CheckCircle, FileText, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ConflictDetailed, ConflictAuditEntry } from '@/lib/sync/SyncEngine';

interface ConflictAuditTrailProps {
  conflict: ConflictDetailed;
  className?: string;
}

export const ConflictAuditTrail: React.FC<ConflictAuditTrailProps> = ({
  conflict,
  className = ''
}) => {
  /**
   * Get icon for audit action type
   */
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CONFLICT_DETECTED':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'CONFLICT_RESOLVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'CONFLICT_ESCALATED':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'RESOLUTION_ATTEMPTED':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  /**
   * Get badge variant for action type
   */
  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'CONFLICT_DETECTED':
        return 'destructive';
      case 'CONFLICT_RESOLVED':
        return 'default';
      case 'CONFLICT_ESCALATED':
        return 'secondary';
      case 'RESOLUTION_ATTEMPTED':
        return 'outline';
      default:
        return 'outline';
    }
  };

  /**
   * Format timestamp
   */
  const formatTimestamp = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
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
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  /**
   * Get action description
   */
  const getActionDescription = (entry: ConflictAuditEntry): string => {
    switch (entry.action) {
      case 'CONFLICT_DETECTED':
        return `Conflict detected by system during sync operation`;
      case 'CONFLICT_RESOLVED':
        return `Conflict resolved using ${entry.details?.strategy || 'unknown'} strategy`;
      case 'CONFLICT_ESCALATED':
        return `Conflict escalated for manual review`;
      case 'RESOLUTION_ATTEMPTED':
        return `Resolution attempted but failed`;
      default:
        return entry.action.replace(/_/g, ' ').toLowerCase();
    }
  };

  /**
   * Render details section
   */
  const renderDetails = (details: any) => {
    if (!details) return null;

    return (
      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
        <pre className="whitespace-pre-wrap font-mono">
          {JSON.stringify(details, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Audit Trail</h3>
        <Badge variant="outline">
          {conflict.auditTrail.length} event{conflict.auditTrail.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Conflict Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Conflict Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="font-medium text-muted-foreground">Entity</label>
              <p>{conflict.entityType} {conflict.entityId}</p>
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Type</label>
              <p>{conflict.conflictType.replace('_', ' ')}</p>
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Severity</label>
              <Badge variant={conflict.severity === 'CRITICAL' ? 'destructive' : 'default'}>
                {conflict.severity}
              </Badge>
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Status</label>
              <Badge variant={conflict.status === 'RESOLVED' ? 'default' : 'secondary'}>
                {conflict.status}
              </Badge>
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Detected At</label>
              <p>{formatTimestamp(conflict.detectedAt)}</p>
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Detected By</label>
              <p className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                {conflict.detectedBy}
              </p>
            </div>
          </div>
          
          {conflict.conflictFields && conflict.conflictFields.length > 0 && (
            <div>
              <label className="font-medium text-muted-foreground">Affected Fields</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {conflict.conflictFields.map(field => (
                  <Badge key={field} variant="outline" className="text-xs">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {conflict.status === 'RESOLVED' && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-muted-foreground">Resolution Strategy</label>
                  <p>{conflict.resolutionStrategy?.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="font-medium text-muted-foreground">Resolved By</label>
                  <p className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {conflict.resolvedBy || 'System'}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="font-medium text-muted-foreground">Resolved At</label>
                  <p>{conflict.resolvedAt ? formatTimestamp(conflict.resolvedAt) : 'N/A'}</p>
                </div>
                {conflict.resolutionJustification && (
                  <div className="col-span-2">
                    <label className="font-medium text-muted-foreground">Justification</label>
                    <p className="text-sm bg-muted p-2 rounded mt-1">
                      {conflict.resolutionJustification}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Audit Trail Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Timeline</CardTitle>
          <CardDescription>
            Chronological history of all conflict-related events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full">
            <div className="space-y-4">
              {conflict.auditTrail
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .map((entry, index) => (
                  <div key={index} className="relative">
                    {/* Timeline connector */}
                    {index < conflict.auditTrail.length - 1 && (
                      <div className="absolute left-5 top-8 h-full w-px bg-border" />
                    )}
                    
                    {/* Event */}
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-background border-2 flex items-center justify-center">
                        {getActionIcon(entry.action)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge variant={getActionBadgeVariant(entry.action)}>
                              {entry.action}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(entry.timestamp)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(entry.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mt-1">
                          {getActionDescription(entry)}
                        </p>
                        
                        <div className="flex items-center mt-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3 mr-1" />
                          {entry.performedBy}
                        </div>
                        
                        {entry.details && (
                          <div className="mt-2">
                            <details className="group">
                              <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                                View Details
                              </summary>
                              {renderDetails(entry.details)}
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Audit Trail Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {conflict.auditTrail.length}
            </div>
            <div className="text-xs text-muted-foreground">Total Events</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {conflict.auditTrail.filter(e => e.action === 'CONFLICT_RESOLVED').length}
            </div>
            <div className="text-xs text-muted-foreground">Resolutions</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {new Set(conflict.auditTrail.map(e => e.performedBy)).size}
            </div>
            <div className="text-xs text-muted-foreground">Contributors</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConflictAuditTrail;