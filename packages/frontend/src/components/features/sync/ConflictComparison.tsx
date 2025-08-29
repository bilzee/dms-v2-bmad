/**
 * ConflictComparison - Side-by-Side Data Comparison Component
 * 
 * Provides visual comparison of local vs server versions with:
 * - Side-by-side diff view with highlighted differences
 * - Field-level comparison and highlighting
 * - Interactive merge editor for manual resolution
 * - JSON view for complex object comparison
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, Edit, Eye, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ConflictDetailed } from '@/lib/sync/SyncEngine';

interface ConflictComparisonProps {
  conflict: ConflictDetailed;
  onMergedDataChange?: (mergedData: any) => void;
  className?: string;
}

interface FieldDiff {
  field: string;
  localValue: any;
  serverValue: any;
  isDifferent: boolean;
  type: 'primitive' | 'object' | 'array';
}

export const ConflictComparison: React.FC<ConflictComparisonProps> = ({
  conflict,
  onMergedDataChange,
  className = ''
}) => {
  const [mergedData, setMergedData] = useState<any>(conflict.serverVersion);
  const [editMode, setEditMode] = useState(false);
  const [jsonMode, setJsonMode] = useState(false);
  const [editedJson, setEditedJson] = useState('');

  // Compute field differences
  const fieldDiffs = useMemo(() => {
    const diffs: FieldDiff[] = [];
    const allFields = new Set([
      ...Object.keys(conflict.localVersion || {}),
      ...Object.keys(conflict.serverVersion || {})
    ]);

    allFields.forEach(field => {
      const localValue = conflict.localVersion?.[field];
      const serverValue = conflict.serverVersion?.[field];
      
      let type: FieldDiff['type'] = 'primitive';
      if (Array.isArray(localValue) || Array.isArray(serverValue)) {
        type = 'array';
      } else if (typeof localValue === 'object' || typeof serverValue === 'object') {
        type = 'object';
      }

      const isDifferent = !deepEqual(localValue, serverValue);

      diffs.push({
        field,
        localValue,
        serverValue,
        isDifferent,
        type
      });
    });

    return diffs.sort((a, b) => {
      // Sort: different fields first, then by field name
      if (a.isDifferent && !b.isDifferent) return -1;
      if (!a.isDifferent && b.isDifferent) return 1;
      return a.field.localeCompare(b.field);
    });
  }, [conflict.localVersion, conflict.serverVersion]);

  // Update merged data when it changes
  useEffect(() => {
    onMergedDataChange?.(mergedData);
  }, [mergedData, onMergedDataChange]);

  // Update JSON editor when merged data changes
  useEffect(() => {
    setEditedJson(JSON.stringify(mergedData, null, 2));
  }, [mergedData]);

  /**
   * Deep equality comparison
   */
  const deepEqual = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;
    
    if (typeof a === 'object') {
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      
      if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        return a.every((item, index) => deepEqual(item, b[index]));
      }
      
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      
      return keysA.every(key => deepEqual(a[key], b[key]));
    }
    
    return false;
  };

  /**
   * Format value for display
   */
  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Date) return value.toISOString();
    return JSON.stringify(value, null, 2);
  };

  /**
   * Get display color for value differences
   */
  const getValueColor = (isDifferent: boolean, side: 'local' | 'server') => {
    if (!isDifferent) return 'text-muted-foreground';
    return side === 'local' ? 'text-blue-600 bg-blue-50' : 'text-green-600 bg-green-50';
  };

  /**
   * Handle field value selection for merge
   */
  const selectFieldValue = (field: string, value: any) => {
    setMergedData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Handle JSON editor changes
   */
  const handleJsonChange = () => {
    try {
      const parsed = JSON.parse(editedJson);
      setMergedData(parsed);
      setJsonMode(false);
    } catch (error) {
      // Invalid JSON, keep editor open
      console.error('Invalid JSON:', error);
    }
  };

  /**
   * Copy value to clipboard
   */
  const copyToClipboard = async (value: any) => {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium">Data Comparison</h3>
          <Badge variant="outline">
            {fieldDiffs.filter(d => d.isDifferent).length} differences
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setJsonMode(!jsonMode)}
          >
            <Eye className="h-4 w-4 mr-1" />
            {jsonMode ? 'Field View' : 'JSON View'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditMode(!editMode)}
          >
            <Edit className="h-4 w-4 mr-1" />
            {editMode ? 'View Mode' : 'Edit Mode'}
          </Button>
        </div>
      </div>

      {jsonMode ? (
        /* JSON Editor View */
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Merged Data (JSON)</CardTitle>
            <CardDescription>
              Edit the JSON directly to create a custom merge result
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={editedJson}
              onChange={(e) => setEditedJson(e.target.value)}
              className="font-mono text-sm min-h-[300px]"
              placeholder="Edit JSON..."
            />
            <div className="flex space-x-2">
              <Button onClick={handleJsonChange}>
                Apply Changes
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setEditedJson(JSON.stringify(mergedData, null, 2))}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Field-by-Field Comparison */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Local Version */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                Local Version
              </CardTitle>
              <CardDescription>
                Changes made offline on device
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] w-full">
                <div className="space-y-3">
                  {fieldDiffs.map(diff => (
                    <div key={`local-${diff.field}`} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">{diff.field}</Label>
                        {diff.isDifferent && editMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => selectFieldValue(diff.field, diff.localValue)}
                            className="h-6 px-2"
                          >
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className={`p-2 rounded border text-sm font-mono ${getValueColor(diff.isDifferent, 'local')}`}>
                        {formatValue(diff.localValue)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Server Version */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                Server Version
              </CardTitle>
              <CardDescription>
                Current version on server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] w-full">
                <div className="space-y-3">
                  {fieldDiffs.map(diff => (
                    <div key={`server-${diff.field}`} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">{diff.field}</Label>
                        {diff.isDifferent && editMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => selectFieldValue(diff.field, diff.serverValue)}
                            className="h-6 px-2"
                          >
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className={`p-2 rounded border text-sm font-mono ${getValueColor(diff.isDifferent, 'server')}`}>
                        {formatValue(diff.serverValue)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Merged Result Preview */}
      {editMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
              Merged Result
            </CardTitle>
            <CardDescription>
              Preview of the final merged data that will be saved
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] w-full">
              <pre className="text-sm font-mono p-2 bg-muted rounded">
                {JSON.stringify(mergedData, null, 2)}
              </pre>
            </ScrollArea>
            <div className="flex justify-end mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(mergedData)}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy JSON
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conflict Fields Summary */}
      {conflict.conflictFields && conflict.conflictFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conflicted Fields</CardTitle>
            <CardDescription>
              Fields that have different values between versions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {conflict.conflictFields.map(field => (
                <Badge key={field} variant="destructive">
                  {field}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resolution Hints */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="space-y-2 text-sm">
            <p className="font-medium text-blue-800">Resolution Guidelines:</p>
            <ul className="text-blue-700 space-y-1 ml-4 list-disc">
              <li><strong>Local Wins:</strong> Use when local changes are more recent or accurate</li>
              <li><strong>Server Wins:</strong> Use when server version should take precedence</li>
              <li><strong>Merge:</strong> Combine both versions when possible</li>
              <li><strong>Manual:</strong> Create custom resolution using the editor above</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConflictComparison;