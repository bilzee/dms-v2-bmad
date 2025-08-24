'use client';

import React, { useState, useEffect } from 'react';
import { DeliveryReasonCode } from '@dms/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, AlertCircle } from 'lucide-react';

export interface ReasonCodeSelectorProps {
  selectedReasonCodes: DeliveryReasonCode[];
  availableItems: string[];
  onChange: (reasonCodes: DeliveryReasonCode[]) => void;
  isReadOnly?: boolean;
  className?: string;
}

interface NewReasonCode {
  code: string;
  category: DeliveryReasonCode['category'];
  description: string;
  appliesTo: string[];
}

// Predefined reason codes
const PREDEFINED_REASON_CODES: Omit<DeliveryReasonCode, 'appliesTo'>[] = [
  {
    code: 'SUPPLY_001',
    category: 'SUPPLY_SHORTAGE',
    description: 'Insufficient stock available at warehouse'
  },
  {
    code: 'SUPPLY_002',
    category: 'SUPPLY_SHORTAGE',
    description: 'Supply chain disruption affecting availability'
  },
  {
    code: 'ACCESS_001',
    category: 'ACCESS_LIMITATION',
    description: 'Road closure preventing delivery vehicle access'
  },
  {
    code: 'ACCESS_002',
    category: 'ACCESS_LIMITATION',
    description: 'Bridge damage limiting heavy vehicle passage'
  },
  {
    code: 'SECURITY_001',
    category: 'SECURITY_ISSUE',
    description: 'Active conflict zone requiring security clearance'
  },
  {
    code: 'SECURITY_002',
    category: 'SECURITY_ISSUE',
    description: 'Curfew restrictions limiting delivery hours'
  },
  {
    code: 'WEATHER_001',
    category: 'WEATHER_DELAY',
    description: 'Heavy rainfall making roads impassable'
  },
  {
    code: 'WEATHER_002',
    category: 'WEATHER_DELAY',
    description: 'Flooding preventing vehicle access to location'
  },
  {
    code: 'LOGISTICS_001',
    category: 'LOGISTICS_CHALLENGE',
    description: 'Vehicle breakdown during delivery route'
  },
  {
    code: 'LOGISTICS_002',
    category: 'LOGISTICS_CHALLENGE',
    description: 'Fuel shortage affecting delivery operations'
  },
  {
    code: 'BENEFICIARY_001',
    category: 'BENEFICIARY_UNAVAILABLE',
    description: 'Community members temporarily relocated'
  },
  {
    code: 'BENEFICIARY_002',
    category: 'BENEFICIARY_UNAVAILABLE',
    description: 'Key community representatives not available for handover'
  }
];

const REASON_CATEGORIES: { value: DeliveryReasonCode['category']; label: string }[] = [
  { value: 'SUPPLY_SHORTAGE', label: 'Supply Shortage' },
  { value: 'ACCESS_LIMITATION', label: 'Access Limitation' },
  { value: 'SECURITY_ISSUE', label: 'Security Issue' },
  { value: 'WEATHER_DELAY', label: 'Weather Delay' },
  { value: 'LOGISTICS_CHALLENGE', label: 'Logistics Challenge' },
  { value: 'BENEFICIARY_UNAVAILABLE', label: 'Beneficiary Unavailable' },
  { value: 'OTHER', label: 'Other' },
];

export function ReasonCodeSelector({
  selectedReasonCodes,
  availableItems,
  onChange,
  isReadOnly = false,
  className = '',
}: ReasonCodeSelectorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReasonCode, setNewReasonCode] = useState<NewReasonCode>({
    code: '',
    category: 'OTHER',
    description: '',
    appliesTo: [],
  });

  // Auto-generate code based on category and existing codes
  const generateReasonCode = (category: DeliveryReasonCode['category']): string => {
    const categoryPrefix = category.split('_')[0];
    const existingCodes = [...PREDEFINED_REASON_CODES, ...selectedReasonCodes]
      .filter(code => code.code.startsWith(categoryPrefix))
      .map(code => parseInt(code.code.split('_')[1] || '0'))
      .filter(num => !isNaN(num));
    
    const nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
    return `${categoryPrefix}_${nextNumber.toString().padStart(3, '0')}`;
  };

  // Update code when category changes
  useEffect(() => {
    if (showAddForm && newReasonCode.category) {
      setNewReasonCode(prev => ({
        ...prev,
        code: generateReasonCode(prev.category)
      }));
    }
  }, [newReasonCode.category, showAddForm]);

  // Add predefined reason code
  const addPredefinedReasonCode = (predefinedCode: Omit<DeliveryReasonCode, 'appliesTo'>) => {
    const newCode: DeliveryReasonCode = {
      ...predefinedCode,
      appliesTo: [],
    };
    
    onChange([...selectedReasonCodes, newCode]);
  };

  // Add custom reason code
  const addCustomReasonCode = () => {
    if (!newReasonCode.code || !newReasonCode.description) return;

    const customCode: DeliveryReasonCode = {
      code: newReasonCode.code,
      category: newReasonCode.category,
      description: newReasonCode.description,
      appliesTo: newReasonCode.appliesTo,
    };

    onChange([...selectedReasonCodes, customCode]);
    
    // Reset form
    setNewReasonCode({
      code: '',
      category: 'OTHER',
      description: '',
      appliesTo: [],
    });
    setShowAddForm(false);
  };

  // Remove reason code
  const removeReasonCode = (codeToRemove: string) => {
    onChange(selectedReasonCodes.filter(code => code.code !== codeToRemove));
  };

  // Update which items a reason code applies to
  const updateReasonCodeItems = (reasonCodeId: string, appliesTo: string[]) => {
    onChange(
      selectedReasonCodes.map(code =>
        code.code === reasonCodeId ? { ...code, appliesTo } : code
      )
    );
  };

  // Toggle item assignment to reason code
  const toggleItemForReasonCode = (reasonCodeId: string, item: string) => {
    const reasonCode = selectedReasonCodes.find(code => code.code === reasonCodeId);
    if (!reasonCode) return;

    const updatedAppliesTo = reasonCode.appliesTo.includes(item)
      ? reasonCode.appliesTo.filter(i => i !== item)
      : [...reasonCode.appliesTo, item];

    updateReasonCodeItems(reasonCodeId, updatedAppliesTo);
  };

  // Get category color
  const getCategoryColor = (category: DeliveryReasonCode['category']) => {
    const colors = {
      'SUPPLY_SHORTAGE': 'bg-red-100 text-red-800 border-red-200',
      'ACCESS_LIMITATION': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'SECURITY_ISSUE': 'bg-orange-100 text-orange-800 border-orange-200',
      'WEATHER_DELAY': 'bg-blue-100 text-blue-800 border-blue-200',
      'LOGISTICS_CHALLENGE': 'bg-purple-100 text-purple-800 border-purple-200',
      'BENEFICIARY_UNAVAILABLE': 'bg-gray-100 text-gray-800 border-gray-200',
      'OTHER': 'bg-slate-100 text-slate-800 border-slate-200',
    };
    return colors[category] || colors.OTHER;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle>Partial Delivery Reason Codes</CardTitle>
          <CardDescription>
            Select or create reason codes to explain why deliveries are incomplete
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Selected Reason Codes */}
            {selectedReasonCodes.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Selected Reason Codes</h4>
                {selectedReasonCodes.map((reasonCode) => (
                  <Card key={reasonCode.code} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getCategoryColor(reasonCode.category)}>
                              {REASON_CATEGORIES.find(cat => cat.value === reasonCode.category)?.label}
                            </Badge>
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {reasonCode.code}
                            </code>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">{reasonCode.description}</p>
                        </div>
                        
                        {!isReadOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeReasonCode(reasonCode.code)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Item Assignment */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          Applies to items:
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {availableItems.map((item) => {
                            const isApplied = reasonCode.appliesTo.includes(item);
                            return (
                              <Button
                                key={item}
                                variant={isApplied ? "default" : "outline"}
                                size="sm"
                                onClick={() => !isReadOnly && toggleItemForReasonCode(reasonCode.code, item)}
                                disabled={isReadOnly}
                                className={`text-xs ${isApplied ? 'bg-blue-600' : ''}`}
                              >
                                {item}
                              </Button>
                            );
                          })}
                        </div>
                        {reasonCode.appliesTo.length === 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Click items above to assign this reason code
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Add Reason Code Section */}
            {!isReadOnly && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Add Reason Code</h4>
                
                {/* Predefined Reason Codes */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Select from predefined codes:
                  </Label>
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {PREDEFINED_REASON_CODES
                      .filter(code => !selectedReasonCodes.some(selected => selected.code === code.code))
                      .map((predefined) => (
                        <div
                          key={predefined.code}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                          onClick={() => addPredefinedReasonCode(predefined)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getCategoryColor(predefined.category)}>
                                {REASON_CATEGORIES.find(cat => cat.value === predefined.category)?.label}
                              </Badge>
                              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                {predefined.code}
                              </code>
                            </div>
                            <p className="text-sm text-gray-600">{predefined.description}</p>
                          </div>
                          <Plus className="h-4 w-4 text-blue-600" />
                        </div>
                      ))}
                  </div>
                </div>

                {/* Custom Reason Code Form */}
                <div>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Custom Reason Code
                  </Button>

                  {showAddForm && (
                    <Card className="mt-3">
                      <CardContent className="pt-4">
                        <div className="grid gap-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="reason-category">Category</Label>
                              <Select
                                value={newReasonCode.category}
                                onValueChange={(value: DeliveryReasonCode['category']) =>
                                  setNewReasonCode(prev => ({ ...prev, category: value }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {REASON_CATEGORIES.map((category) => (
                                    <SelectItem key={category.value} value={category.value}>
                                      {category.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label htmlFor="reason-code">Code</Label>
                              <Input
                                id="reason-code"
                                value={newReasonCode.code}
                                onChange={(e) =>
                                  setNewReasonCode(prev => ({ ...prev, code: e.target.value }))
                                }
                                placeholder="AUTO_GENERATED"
                                readOnly
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="reason-description">Description</Label>
                            <Textarea
                              id="reason-description"
                              value={newReasonCode.description}
                              onChange={(e) =>
                                setNewReasonCode(prev => ({ ...prev, description: e.target.value }))
                              }
                              placeholder="Describe the reason for partial delivery..."
                              rows={3}
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={addCustomReasonCode}
                              disabled={!newReasonCode.description.trim()}
                            >
                              Add Reason Code
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowAddForm(false);
                                setNewReasonCode({ code: '', category: 'OTHER', description: '', appliesTo: [] });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* No reason codes selected */}
            {selectedReasonCodes.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Reason Codes Selected</h3>
                <p className="text-gray-600">
                  Add reason codes to explain why items couldn&apos;t be fully delivered.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}