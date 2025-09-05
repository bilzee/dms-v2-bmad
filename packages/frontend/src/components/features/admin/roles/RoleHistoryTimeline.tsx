'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Plus, 
  Minus, 
  RotateCcw, 
  Power, 
  PowerOff, 
  Clock, 
  User,
  MapPin,
  Monitor,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { RoleHistory, RoleHistoryResponse } from '../../../../../../shared/types/admin';
import { format } from 'date-fns';

interface RoleHistoryTimelineProps {
  userId: string;
  userName: string;
  onRollback?: (historyId: string, reason?: string) => void;
  isLoading?: boolean;
}

interface TimelineEntry extends RoleHistory {
  roleName: string;
}

export function RoleHistoryTimeline({ 
  userId, 
  userName, 
  onRollback, 
  isLoading = false 
}: RoleHistoryTimelineProps) {
  const [history, setHistory] = useState<TimelineEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimelineEntry | null>(null);

  const pageSize = 20;

  // Fetch role history
  const fetchHistory = async (page: number = 1) => {
    setIsLoadingHistory(true);
    try {
      const offset = (page - 1) * pageSize;
      const response = await fetch(`/api/v1/admin/users/${userId}/role-history?limit=${pageSize}&offset=${offset}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch role history');
      }

      const data: RoleHistoryResponse = await response.json();
      
      if (data.success) {
        const newHistory = data.data.history.map(entry => ({
          ...entry,
          roleName: 'Role ' + entry.roleId // Use roleId as fallback since roleName isn't in the API
        }));

        if (page === 1) {
          setHistory(newHistory);
        } else {
          setHistory(prev => [...prev, ...newHistory]);
        }
        
        setTotalCount(data.data.totalCount);
      }
    } catch (error) {
      console.error('Failed to fetch role history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, [userId]);

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchHistory(nextPage);
  };

  const handleRollback = (entry: TimelineEntry) => {
    if (onRollback) {
      onRollback(entry.id, `Rollback ${entry.action.toLowerCase()} of ${entry.roleName} role`);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'ADDED':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'REMOVED':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'ACTIVATED':
        return <Power className="h-4 w-4 text-blue-600" />;
      case 'DEACTIVATED':
        return <PowerOff className="h-4 w-4 text-gray-600" />;
      case 'ROLLBACK':
        return <RotateCcw className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'ADDED':
        return 'bg-green-100 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300';
      case 'REMOVED':
        return 'bg-red-100 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300';
      case 'ACTIVATED':
        return 'bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300';
      case 'DEACTIVATED':
        return 'bg-gray-100 border-gray-200 text-gray-800 dark:bg-gray-900/30 dark:border-gray-800 dark:text-gray-300';
      case 'ROLLBACK':
        return 'bg-orange-100 border-orange-200 text-orange-800 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-300';
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800 dark:bg-gray-900/30 dark:border-gray-800 dark:text-gray-300';
    }
  };

  const formatActionText = (entry: TimelineEntry) => {
    switch (entry.action) {
      case 'ADDED':
        return `Added ${entry.roleName} role`;
      case 'REMOVED':
        return `Removed ${entry.roleName} role`;
      case 'ACTIVATED':
        return `Set ${entry.roleName} as active role`;
      case 'DEACTIVATED':
        return `Deactivated ${entry.roleName} role`;
      case 'ROLLBACK':
        return `Rolled back changes to ${entry.roleName} role`;
      default:
        return `${entry.action} ${entry.roleName} role`;
    }
  };

  const canRollback = (entry: TimelineEntry) => {
    // Can rollback recent changes (within last 24 hours) and not already rollbacks
    const isRecent = new Date().getTime() - new Date(entry.createdAt).getTime() < 24 * 60 * 60 * 1000;
    const isNotRollback = entry.action !== 'ROLLBACK';
    return isRecent && isNotRollback && onRollback;
  };

  const hasMoreToLoad = history.length < totalCount;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Role Change History for {userName}
        </CardTitle>
        {totalCount > 0 && (
          <div className="text-sm text-muted-foreground">
            {totalCount} total changes • Showing {history.length}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading || (isLoadingHistory && history.length === 0) ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No role changes found</p>
            <p className="text-sm">This user has no recorded role change history</p>
          </div>
        ) : (
          <div className="space-y-4">
            <ScrollArea className="h-[500px]">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-5 bottom-0 w-px bg-border"></div>
                
                <div className="space-y-6">
                  {history.map((entry, index) => (
                    <div key={entry.id} className="relative flex items-start gap-4">
                      {/* Timeline dot */}
                      <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-background border-2 border-border">
                        {getActionIcon(entry.action)}
                      </div>

                      {/* Entry content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getActionColor(entry.action)}>
                                {formatActionText(entry)}
                              </Badge>
                              {entry.action === 'ROLLBACK' && (
                                <Badge variant="outline" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Rollback
                                </Badge>
                              )}
                            </div>

                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {entry.changedByName || 'Unknown Admin'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(entry.createdAt), 'MMM d, yyyy h:mm a')}
                                </span>
                              </div>

                              {entry.reason && (
                                <div className="text-xs bg-muted p-2 rounded mt-2">
                                  <strong>Reason:</strong> {entry.reason}
                                </div>
                              )}

                              {(entry.ipAddress || entry.userAgent) && (
                                <details className="text-xs">
                                  <summary className="cursor-pointer hover:text-foreground">
                                    Technical Details
                                  </summary>
                                  <div className="mt-1 space-y-1 ml-4">
                                    {entry.ipAddress && (
                                      <div className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {entry.ipAddress}
                                      </div>
                                    )}
                                    {entry.userAgent && (
                                      <div className="flex items-center gap-1">
                                        <Monitor className="h-3 w-3" />
                                        {entry.userAgent.substring(0, 50)}...
                                      </div>
                                    )}
                                  </div>
                                </details>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {canRollback(entry) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRollback(entry)}
                                className="text-xs"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Rollback
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                            >
                              <ChevronRight 
                                className={`h-4 w-4 transition-transform ${
                                  selectedEntry?.id === entry.id ? 'rotate-90' : ''
                                }`} 
                              />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {selectedEntry?.id === entry.id && entry.previousData && (
                          <div className="mt-3 p-3 bg-muted/50 rounded border">
                            <div className="text-sm">
                              <strong>Previous Data:</strong>
                              <pre className="mt-1 text-xs bg-background p-2 rounded overflow-x-auto">
                                {JSON.stringify(entry.previousData, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>

            {/* Load more button */}
            {hasMoreToLoad && (
              <div className="text-center pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoadingHistory}
                >
                  {isLoadingHistory ? 'Loading...' : `Load More (${totalCount - history.length} remaining)`}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}