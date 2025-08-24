'use client';

import React, { useState, useMemo } from 'react';
import { 
  type RapidResponse, 
  type ActualVsPlannedItem,
  type ItemDeliveryData,
} from '@dms/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ActualVsPlannedComparisonProps {
  response: RapidResponse;
  actualVsPlannedItems: ActualVsPlannedItem[];
  onItemsUpdate: (items: ItemDeliveryData[]) => void;
  onContinue: () => void;
  onBack: () => void;
  className?: string;
}

// Predefined variation reason codes
const VARIATION_REASONS = [
  'Insufficient supply',
  'Excess available',
  'Field conditions changed',
  'Beneficiary needs adjusted',
  'Logistical constraints',
  'Weather conditions',
  'Security concerns',
  'Equipment failure',
  'Other',
];

export function ActualVsPlannedComparison({
  response,
  actualVsPlannedItems,
  onItemsUpdate,
  onContinue,
  onBack,
  className,
}: ActualVsPlannedComparisonProps) {
  const [editingItems, setEditingItems] = useState<Record<string, ItemDeliveryData>>({});
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState<number>(0);
  const [newItemUnit, setNewItemUnit] = useState('');

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalPlanned = actualVsPlannedItems.reduce((sum, item) => sum + item.plannedQuantity, 0);
    const totalActual = actualVsPlannedItems.reduce((sum, item) => sum + item.actualQuantity, 0);
    const completionPercentage = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;
    
    const significantVariations = actualVsPlannedItems.filter(
      item => Math.abs(item.variationPercentage) > 10
    ).length;

    return {
      totalPlanned,
      totalActual,
      completionPercentage,
      significantVariations,
      totalItems: actualVsPlannedItems.length,
    };
  }, [actualVsPlannedItems]);

  // Handle inline editing of actual quantities
  const handleQuantityChange = (itemKey: string, actualQuantity: number) => {
    const item = actualVsPlannedItems.find(i => `${i.item}-${i.unit}` === itemKey);
    if (!item) return;

    setEditingItems(prev => ({
      ...prev,
      [itemKey]: {
        item: item.item,
        quantity: actualQuantity,
        unit: item.unit,
      }
    }));

    // Update the parent component immediately
    const updatedItems = actualVsPlannedItems.map(i => 
      `${i.item}-${i.unit}` === itemKey 
        ? { ...i, actualQuantity, variationPercentage: calculateVariation(i.plannedQuantity, actualQuantity) }
        : i
    );

    const deliveryItems: ItemDeliveryData[] = updatedItems.map(item => ({
      item: item.item,
      quantity: item.actualQuantity,
      unit: item.unit,
    }));

    onItemsUpdate(deliveryItems);
  };

  // Handle variation reason selection
  const handleReasonChange = (itemKey: string, reason: string) => {
    // This would update the reason in the conversion data
    console.log(`Reason for ${itemKey}: ${reason}`);
  };

  // Add new item not in original plan
  const handleAddNewItem = () => {
    if (!newItemName.trim() || newItemQuantity <= 0 || !newItemUnit.trim()) return;

    const newItem: ItemDeliveryData = {
      item: newItemName.trim(),
      quantity: newItemQuantity,
      unit: newItemUnit.trim(),
    };

    const currentItems = actualVsPlannedItems.map(item => ({
      item: item.item,
      quantity: item.actualQuantity,
      unit: item.unit,
    }));

    onItemsUpdate([...currentItems, newItem]);
    
    // Reset form
    setNewItemName('');
    setNewItemQuantity(0);
    setNewItemUnit('');
  };

  // Calculate variation percentage
  const calculateVariation = (planned: number, actual: number): number => {
    return planned > 0 ? ((actual - planned) / planned) * 100 : (actual > 0 ? 100 : 0);
  };

  // Get variation badge color
  const getVariationBadgeVariant = (percentage: number) => {
    if (Math.abs(percentage) <= 5) return 'secondary';
    if (Math.abs(percentage) <= 15) return 'outline';
    return 'destructive';
  };

  // Get variation description
  const getVariationDescription = (percentage: number) => {
    if (percentage > 15) return 'Significant over-delivery';
    if (percentage > 5) return 'Moderate over-delivery';
    if (percentage >= -5) return 'On target';
    if (percentage >= -15) return 'Moderate under-delivery';
    return 'Significant under-delivery';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{summaryStats.completionPercentage}%</div>
              <div className="text-sm text-gray-500">Overall Completion</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{summaryStats.totalItems}</div>
              <div className="text-sm text-gray-500">Total Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{summaryStats.significantVariations}</div>
              <div className="text-sm text-gray-500">Significant Variations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summaryStats.totalActual}</div>
              <div className="text-sm text-gray-500">Total Delivered</div>
              <div className="text-xs text-gray-400">vs {summaryStats.totalPlanned} planned</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Planned vs Actual Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Item-by-Item Comparison</CardTitle>
          <p className="text-sm text-gray-600">
            Review and adjust actual delivery quantities. Click on quantities to edit.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Planned</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variation</TableHead>
                  <TableHead>Reason (if significant)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actualVsPlannedItems.map((item) => {
                  const itemKey = `${item.item}-${item.unit}`;
                  const isEditing = editingItems[itemKey];
                  
                  return (
                    <TableRow key={itemKey}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.item}</div>
                          <div className="text-sm text-gray-500">{item.unit}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{item.plannedQuantity}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <Input
                            type="number"
                            value={isEditing?.quantity ?? item.actualQuantity}
                            onChange={(e) => handleQuantityChange(itemKey, Number(e.target.value))}
                            className="w-20 text-right"
                            min="0"
                            step="1"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          <Badge variant={getVariationBadgeVariant(item.variationPercentage)}>
                            {item.variationPercentage > 0 ? '+' : ''}{Math.round(item.variationPercentage)}%
                          </Badge>
                          <div className="text-xs text-gray-500">
                            {getVariationDescription(item.variationPercentage)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {Math.abs(item.variationPercentage) > 10 ? (
                          <Select
                            value={item.variationReason || ''}
                            onValueChange={(reason) => handleReasonChange(itemKey, reason)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select reason..." />
                            </SelectTrigger>
                            <SelectContent>
                              {VARIATION_REASONS.map((reason) => (
                                <SelectItem key={reason} value={reason}>
                                  {reason}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm text-gray-400">Not required</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Additional Items */}
      <Card>
        <CardHeader>
          <CardTitle>Add Additional Items</CardTitle>
          <p className="text-sm text-gray-600">
            Add any items delivered that were not in the original plan.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Name
              </label>
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g., Emergency blankets"
              />
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <Input
                type="number"
                value={newItemQuantity || ''}
                onChange={(e) => setNewItemQuantity(Number(e.target.value))}
                placeholder="0"
                min="1"
              />
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit
              </label>
              <Input
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
                placeholder="pieces"
              />
            </div>
            <Button
              type="button"
              onClick={handleAddNewItem}
              disabled={!newItemName.trim() || newItemQuantity <= 0 || !newItemUnit.trim()}
            >
              Add Item
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Review
        </Button>
        <Button
          onClick={onContinue}
          disabled={summaryStats.totalItems === 0}
        >
          Continue to Completion
        </Button>
      </div>
    </div>
  );
}