'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Play, Pause, TestTube } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useSyncStore } from '@/stores/sync.store';
import type { PriorityRule, PriorityCondition } from '@dms/shared';

interface PriorityRuleFormData {
  name: string;
  entityType: 'ASSESSMENT' | 'RESPONSE' | 'MEDIA';
  conditions: PriorityCondition[];
  priorityModifier: number;
  isActive: boolean;
}

/**
 * PriorityRuleManager component for configuring synchronization priority rules
 * Implements AC: 1 - Configurable priority rules (health emergencies first)
 */
export function PriorityRuleManager() {
  const {
    priorityRules,
    isLoadingRules,
    error,
    loadPriorityRules,
    createPriorityRule,
    updatePriorityRule,
    deletePriorityRule,
  } = useSyncStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PriorityRule | null>(null);
  const [formData, setFormData] = useState<PriorityRuleFormData>({
    name: '',
    entityType: 'ASSESSMENT',
    conditions: [],
    priorityModifier: 10,
    isActive: true,
  });

  // Load rules on mount
  useEffect(() => {
    loadPriorityRules();
  }, [loadPriorityRules]);

  const resetForm = () => {
    setFormData({
      name: '',
      entityType: 'ASSESSMENT',
      conditions: [],
      priorityModifier: 10,
      isActive: true,
    });
  };

  const handleCreateRule = async () => {
    // Basic validation
    if (!formData.name.trim()) {
      return; // Don't submit if name is empty
    }
    
    try {
      await createPriorityRule({
        ...formData,
        createdBy: 'current-user-id', // TODO: Get from auth context
      });
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by store
    }
  };

  const handleEditRule = (rule: PriorityRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      entityType: rule.entityType,
      conditions: rule.conditions,
      priorityModifier: rule.priorityModifier,
      isActive: rule.isActive,
    });
    setIsCreateModalOpen(true);
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;

    try {
      await updatePriorityRule(editingRule.id, formData);
      setIsCreateModalOpen(false);
      setEditingRule(null);
      resetForm();
    } catch (error) {
      // Error handled by store
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (confirm('Are you sure you want to delete this priority rule?')) {
      try {
        await deletePriorityRule(ruleId);
      } catch (error) {
        // Error handled by store
      }
    }
  };

  const handleToggleRule = async (rule: PriorityRule) => {
    try {
      await updatePriorityRule(rule.id, {
        isActive: !rule.isActive,
      });
    } catch (error) {
      // Error handled by store
    }
  };

  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [
        ...formData.conditions,
        {
          field: '',
          operator: 'EQUALS',
          value: '',
          modifier: 5,
        },
      ],
    });
  };

  const removeCondition = (index: number) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    });
  };

  const updateCondition = (index: number, updates: Partial<PriorityCondition>) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.map((condition, i) =>
        i === index ? { ...condition, ...updates } : condition
      ),
    });
  };

  const getEntityTypeColor = (type: string) => {
    switch (type) {
      case 'ASSESSMENT': return 'bg-blue-100 text-blue-800';
      case 'RESPONSE': return 'bg-green-100 text-green-800';
      case 'MEDIA': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRuleTypeExamples = (entityType: string) => {
    switch (entityType) {
      case 'ASSESSMENT':
        return [
          { name: 'Health Emergency Priority', description: 'Prioritize health assessments with emergency keywords' },
          { name: 'High Population Impact', description: 'Boost priority for assessments affecting >1000 people' },
          { name: 'Severe Incident Response', description: 'Prioritize catastrophic severity assessments' },
        ];
      case 'RESPONSE':
        return [
          { name: 'Urgent Health Response', description: 'Prioritize health responses within 24 hours' },
          { name: 'Large Scale Response', description: 'Boost priority for responses serving >500 people' },
          { name: 'Critical Supply Delivery', description: 'Prioritize emergency medical supply responses' },
        ];
      case 'MEDIA':
        return [
          { name: 'Emergency Documentation', description: 'Prioritize photos from emergency assessments' },
          { name: 'Large File Priority', description: 'Boost priority for files >10MB' },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Priority Rules</h2>
          <p className="text-gray-600 mt-1">
            Configure automatic priority assignment rules for sync items
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) {
            setEditingRule(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Edit Priority Rule' : 'Create Priority Rule'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ruleName">Rule Name</Label>
                  <Input
                    id="ruleName"
                    data-testid="rule-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Health Emergency Priority"
                  />
                </div>
                <div>
                  <Label htmlFor="entityType">Entity Type</Label>
                  <Select 
                    value={formData.entityType} 
                    onValueChange={(value: any) => setFormData({ ...formData, entityType: value })}
                  >
                    <SelectTrigger data-testid="entity-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSESSMENT">Assessment</SelectItem>
                      <SelectItem value="RESPONSE">Response</SelectItem>
                      <SelectItem value="MEDIA">Media</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="priorityModifier">Priority Modifier</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Input
                    id="priorityModifier"
                    type="number"
                    value={formData.priorityModifier}
                    onChange={(e) => setFormData({ ...formData, priorityModifier: parseInt(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-600">
                    Points to add/subtract from base priority (negative values to reduce priority)
                  </span>
                </div>
              </div>

              {/* Rule Examples */}
              <div className="bg-blue-50 p-4 rounded-lg" data-testid="examples-section">
                <h4 className="font-medium text-blue-900 mb-2">Example Rules for {formData.entityType}</h4>
                <div className="space-y-2">
                  {getRuleTypeExamples(formData.entityType).map((example, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-blue-800">{example.name}</div>
                        <div className="text-xs text-blue-600">{example.description}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData({ ...formData, name: example.name })}
                      >
                        Use
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conditions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Conditions</Label>
                  <Button variant="outline" size="sm" onClick={addCondition} data-testid="add-condition-btn">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Condition
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {formData.conditions.map((condition, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Condition {index + 1}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCondition(index)}
                          data-testid={`remove-condition-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs">Field</Label>
                          <Input
                            value={condition.field}
                            onChange={(e) => updateCondition(index, { field: e.target.value })}
                            placeholder="e.g., data.assessmentType"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Operator</Label>
                          <Select 
                            value={condition.operator} 
                            onValueChange={(value: any) => updateCondition(index, { operator: value })}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EQUALS">Equals</SelectItem>
                              <SelectItem value="GREATER_THAN">Greater Than</SelectItem>
                              <SelectItem value="CONTAINS">Contains</SelectItem>
                              <SelectItem value="IN_ARRAY">In Array</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Value</Label>
                          <Input
                            value={condition.value}
                            onChange={(e) => updateCondition(index, { value: e.target.value })}
                            placeholder="e.g., HEALTH"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Points</Label>
                          <Input
                            type="number"
                            value={condition.modifier}
                            onChange={(e) => updateCondition(index, { modifier: parseInt(e.target.value) || 0 })}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {formData.conditions.length === 0 && (
                    <div className="text-center py-4 text-gray-500 border-2 border-dashed rounded-lg" data-testid="no-conditions-state">
                      <TestTube className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>No conditions added yet</p>
                      <p className="text-sm">Add conditions to define when this rule applies</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Rule is active</Label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingRule(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={editingRule ? handleUpdateRule : handleCreateRule}>
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {isLoadingRules ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
              Loading priority rules...
            </CardContent>
          </Card>
        ) : priorityRules.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <TestTube className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Priority Rules</h3>
              <p className="text-gray-600 mb-4">
                Create your first priority rule to automatically adjust sync priorities based on content.
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          priorityRules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-lg">{rule.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge className={getEntityTypeColor(rule.entityType)}>
                          {rule.entityType}
                        </Badge>
                        <span>•</span>
                        <span>{rule.conditions.length} condition(s)</span>
                        <span>•</span>
                        <span className={rule.priorityModifier > 0 ? 'text-green-600' : 'text-red-600'}>
                          {rule.priorityModifier > 0 ? '+' : ''}{rule.priorityModifier} points
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={() => handleToggleRule(rule)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditRule(rule)}
                      data-testid={`edit-rule-${rule.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                      data-testid={`delete-rule-${rule.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {rule.conditions.length > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Conditions:</h4>
                    <div className="grid gap-2">
                      {rule.conditions.map((condition, i) => (
                        <div key={i} className="text-sm bg-gray-50 rounded p-2 font-mono">
                          {condition.field} {condition.operator.toLowerCase().replace('_', ' ')} &quot;{condition.value}&quot;
                          <Badge variant="secondary" className="ml-2 text-xs">
                            +{condition.modifier}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}