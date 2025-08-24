'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ItemCompletionData } from '@dms/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export interface PartialDeliveryTrackerProps {
  plannedItems: { item: string; quantity: number; unit: string }[];
  initialCompletionData?: ItemCompletionData[];
  onChange: (completionData: ItemCompletionData[]) => void;
  isReadOnly?: boolean;
  className?: string;
}

interface ItemProgressState {
  item: string;
  plannedQuantity: number;
  deliveredQuantity: number;
  unit: string;
  percentageComplete: number;
  remainingQuantity: number;
  reasonCodes: string[];
  followUpRequired: boolean;
}

export function PartialDeliveryTracker({
  plannedItems,
  initialCompletionData = [],
  onChange,
  isReadOnly = false,
  className = '',
}: PartialDeliveryTrackerProps) {
  const [itemProgress, setItemProgress] = useState<ItemProgressState[]>([]);

  // Initialize progress state from planned items
  useEffect(() => {
    const initialProgress = plannedItems.map(planned => {
      const existing = initialCompletionData.find(item => item.item === planned.item);
      return {
        item: planned.item,
        plannedQuantity: planned.quantity,
        deliveredQuantity: existing?.deliveredQuantity || 0,
        unit: planned.unit,
        percentageComplete: existing?.percentageComplete || 0,
        remainingQuantity: existing?.remainingQuantity || planned.quantity,
        reasonCodes: existing?.reasonCodes || [],
        followUpRequired: existing?.followUpRequired || false,
      };
    });
    
    setItemProgress(initialProgress);
  }, [plannedItems, initialCompletionData]);

  // Calculate percentage and remaining quantity when delivered quantity changes
  const calculateProgress = useCallback((deliveredQuantity: number, plannedQuantity: number) => {
    const percentage = plannedQuantity > 0 ? Math.min((deliveredQuantity / plannedQuantity) * 100, 100) : 0;
    const remaining = Math.max(plannedQuantity - deliveredQuantity, 0);
    return {
      percentageComplete: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      remainingQuantity: remaining
    };
  }, []);

  // Update delivered quantity for an item
  const handleQuantityChange = useCallback((itemName: string, newDeliveredQuantity: number) => {
    setItemProgress(prev => {
      const updated = prev.map(item => {
        if (item.item === itemName) {
          const { percentageComplete, remainingQuantity } = calculateProgress(
            newDeliveredQuantity, 
            item.plannedQuantity
          );
          
          return {
            ...item,
            deliveredQuantity: newDeliveredQuantity,
            percentageComplete,
            remainingQuantity,
            followUpRequired: percentageComplete < 100,
          };
        }
        return item;
      });
      
      // Convert to ItemCompletionData format and notify parent
      const completionData: ItemCompletionData[] = updated.map(item => ({
        item: item.item,
        plannedQuantity: item.plannedQuantity,
        deliveredQuantity: item.deliveredQuantity,
        remainingQuantity: item.remainingQuantity,
        percentageComplete: item.percentageComplete,
        unit: item.unit,
        reasonCodes: item.reasonCodes,
        followUpRequired: item.followUpRequired,
      }));
      
      onChange(completionData);
      
      return updated;
    });
  }, [calculateProgress, onChange]);

  // Get status icon and color based on completion percentage
  const getStatusIcon = (percentage: number) => {
    if (percentage >= 100) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (percentage > 0) return <Clock className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 100) return <Badge variant="success">Complete</Badge>;
    if (percentage > 0) return <Badge variant="warning">Partial</Badge>;
    return <Badge variant="destructive">Pending</Badge>;
  };

  // Calculate overall completion statistics
  const overallStats = React.useMemo(() => {
    const totalItems = itemProgress.length;
    const fullyDelivered = itemProgress.filter(item => item.percentageComplete >= 100).length;
    const partiallyDelivered = itemProgress.filter(item => item.percentageComplete > 0 && item.percentageComplete < 100).length;
    const pending = itemProgress.filter(item => item.percentageComplete === 0).length;
    const overallPercentage = totalItems > 0 
      ? itemProgress.reduce((sum, item) => sum + item.percentageComplete, 0) / totalItems 
      : 0;

    return {
      totalItems,
      fullyDelivered,
      partiallyDelivered,
      pending,
      overallPercentage: Math.round(overallPercentage * 100) / 100,
    };
  }, [itemProgress]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Progress Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Overall Delivery Progress
            {getStatusIcon(overallStats.overallPercentage)}
          </CardTitle>
          <CardDescription>
            Track completion percentage across all planned items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Completion</span>
                <span className="font-medium">{overallStats.overallPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={overallStats.overallPercentage} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-green-600">{overallStats.fullyDelivered}</div>
                <div className="text-gray-600">Complete</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-yellow-600">{overallStats.partiallyDelivered}</div>
                <div className="text-gray-600">Partial</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-red-600">{overallStats.pending}</div>
                <div className="text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-blue-600">{overallStats.totalItems}</div>
                <div className="text-gray-600">Total Items</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Item Progress */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Item-by-Item Progress</h3>
        
        {itemProgress.map((item) => (
          <Card key={item.item}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {getStatusIcon(item.percentageComplete)}
                  {item.item}
                </span>
                {getStatusBadge(item.percentageComplete)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Quantity Input */}
                <div className="space-y-2">
                  <Label htmlFor={`quantity-${item.item}`}>
                    Delivered Quantity ({item.unit})
                  </Label>
                  <Input
                    id={`quantity-${item.item}`}
                    type="number"
                    min="0"
                    max={item.plannedQuantity}
                    value={item.deliveredQuantity}
                    onChange={(e) => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      handleQuantityChange(item.item, value);
                    }}
                    disabled={isReadOnly}
                    placeholder="0"
                    className="w-full"
                  />
                  <div className="text-xs text-gray-600">
                    Planned: {item.plannedQuantity} {item.unit}
                  </div>
                </div>

                {/* Progress Visualization */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Completion</span>
                      <span className="font-medium">{item.percentageComplete.toFixed(1)}%</span>
                    </div>
                    <Progress value={item.percentageComplete} className="h-2" />
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Delivered:</span>
                      <span className="font-medium">{item.deliveredQuantity} {item.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Remaining:</span>
                      <span className="font-medium text-red-600">{item.remainingQuantity} {item.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Status & Follow-up */}
                <div className="space-y-2">
                  <div className="text-sm">
                    <div className="font-medium mb-2">Status</div>
                    {item.percentageComplete >= 100 ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Fully delivered
                      </div>
                    ) : item.percentageComplete > 0 ? (
                      <div className="flex items-center gap-1 text-yellow-600">
                        <Clock className="h-3 w-3" />
                        Partially delivered
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-600">
                        <AlertCircle className="h-3 w-3" />
                        Not yet delivered
                      </div>
                    )}
                  </div>
                  
                  {item.followUpRequired && (
                    <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
                      Follow-up required for completion
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {itemProgress.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Items to Track</h3>
            <p className="text-gray-600">
              No planned items available for delivery tracking. Please ensure the response plan includes items to deliver.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}