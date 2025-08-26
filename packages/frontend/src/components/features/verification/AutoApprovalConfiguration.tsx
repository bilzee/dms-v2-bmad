'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Settings, TestTube, Save } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { 
  AutoApprovalRule, 
  AutoApprovalConfig, 
  AssessmentType, 
  ResponseType,
  QualityThreshold,
  AutoApprovalCondition
} from '@dms/shared';
import QualityThresholdSettings from './QualityThresholdSettings';

interface AutoApprovalConfigurationProps {
  className?: string;
  config?: AutoApprovalConfig;
  onConfigurationChange?: (config: AutoApprovalConfig) => void;
  onSave?: (config: AutoApprovalConfig) => Promise<void>;
  onTestRules?: (rules: AutoApprovalRule[]) => Promise<void>;
}

export const AutoApprovalConfiguration: React.FC<AutoApprovalConfigurationProps> = ({
  className,
  config,
  onConfigurationChange,
  onSave,
  onTestRules,
}) => {
  const [activeConfig, setActiveConfig] = React.useState<AutoApprovalConfig>(() => 
    config || {
      enabled: false,
      rules: [],
      globalSettings: {
        maxAutoApprovalsPerHour: 50,
        requireCoordinatorOnline: true,
        emergencyOverrideEnabled: true,
        auditLogRetentionDays: 30,
      },
      coordinatorId: '',
      lastUpdated: new Date(),
    }
  );

  const [isLoading, setIsLoading] = React.useState(false);
  const [testResults, setTestResults] = React.useState<any>(null);

  React.useEffect(() => {
    if (config) {
      setActiveConfig(config);
    }
  }, [config]);

  const handleConfigChange = (newConfig: AutoApprovalConfig) => {
    setActiveConfig(newConfig);
    onConfigurationChange?.(newConfig);
  };

  const handleAddRule = (type: 'ASSESSMENT' | 'RESPONSE') => {
    const newRule: AutoApprovalRule = {
      id: `rule-${Date.now()}`,
      type,
      enabled: true,
      qualityThresholds: {
        dataCompletenessPercentage: 80,
        requiredFieldsComplete: true,
        hasMediaAttachments: false,
      },
      conditions: [],
      priority: activeConfig.rules.length + 1,
      createdBy: activeConfig.coordinatorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (type === 'ASSESSMENT') {
      newRule.assessmentType = AssessmentType.HEALTH;
    } else {
      newRule.responseType = ResponseType.HEALTH;
    }

    const updatedConfig = {
      ...activeConfig,
      rules: [...activeConfig.rules, newRule],
    };

    handleConfigChange(updatedConfig);
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<AutoApprovalRule>) => {
    const updatedConfig = {
      ...activeConfig,
      rules: activeConfig.rules.map(rule => 
        rule.id === ruleId 
          ? { ...rule, ...updates, updatedAt: new Date() }
          : rule
      ),
    };
    handleConfigChange(updatedConfig);
  };

  const handleDeleteRule = (ruleId: string) => {
    const updatedConfig = {
      ...activeConfig,
      rules: activeConfig.rules.filter(rule => rule.id !== ruleId),
    };
    handleConfigChange(updatedConfig);
  };

  const handleSave = async () => {
    if (!onSave) return;
    
    setIsLoading(true);
    try {
      await onSave(activeConfig);
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestRules = async () => {
    if (!onTestRules) return;
    
    setIsLoading(true);
    try {
      const results = await onTestRules(activeConfig.rules);
      setTestResults(results);
    } catch (error) {
      console.error('Failed to test rules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const assessmentRules = activeConfig.rules.filter(rule => rule.type === 'ASSESSMENT');
  const responseRules = activeConfig.rules.filter(rule => rule.type === 'RESPONSE');

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Auto-Approval Configuration</span>
            <div className="flex items-center gap-2">
              <Switch
                checked={activeConfig.enabled}
                onCheckedChange={(enabled) =>
                  handleConfigChange({ ...activeConfig, enabled })
                }
              />
              <Label>Enabled</Label>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxPerHour">Max Auto-Approvals Per Hour</Label>
              <Input
                id="maxPerHour"
                type="number"
                value={activeConfig.globalSettings.maxAutoApprovalsPerHour}
                onChange={(e) =>
                  handleConfigChange({
                    ...activeConfig,
                    globalSettings: {
                      ...activeConfig.globalSettings,
                      maxAutoApprovalsPerHour: parseInt(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retentionDays">Audit Log Retention (Days)</Label>
              <Input
                id="retentionDays"
                type="number"
                value={activeConfig.globalSettings.auditLogRetentionDays}
                onChange={(e) =>
                  handleConfigChange({
                    ...activeConfig,
                    globalSettings: {
                      ...activeConfig.globalSettings,
                      auditLogRetentionDays: parseInt(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={activeConfig.globalSettings.requireCoordinatorOnline}
                onCheckedChange={(requireCoordinatorOnline) =>
                  handleConfigChange({
                    ...activeConfig,
                    globalSettings: {
                      ...activeConfig.globalSettings,
                      requireCoordinatorOnline,
                    },
                  })
                }
              />
              <Label>Require Coordinator Online</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={activeConfig.globalSettings.emergencyOverrideEnabled}
                onCheckedChange={(emergencyOverrideEnabled) =>
                  handleConfigChange({
                    ...activeConfig,
                    globalSettings: {
                      ...activeConfig.globalSettings,
                      emergencyOverrideEnabled,
                    },
                  })
                }
              />
              <Label>Emergency Override Enabled</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="assessments" className="w-full">
        <TabsList>
          <TabsTrigger value="assessments">
            Assessment Rules ({assessmentRules.length})
          </TabsTrigger>
          <TabsTrigger value="responses">
            Response Rules ({responseRules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assessments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Assessment Auto-Approval Rules</h3>
            <Button
              onClick={() => handleAddRule('ASSESSMENT')}
              disabled={!activeConfig.enabled}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Assessment Rule
            </Button>
          </div>

          <div className="space-y-4">
            {assessmentRules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onUpdate={(updates) => handleUpdateRule(rule.id, updates)}
                onDelete={() => handleDeleteRule(rule.id)}
              />
            ))}
            {assessmentRules.length === 0 && (
              <Card>
                <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
                  No assessment rules configured. Add a rule to get started.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Response Auto-Approval Rules</h3>
            <Button
              onClick={() => handleAddRule('RESPONSE')}
              disabled={!activeConfig.enabled}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Response Rule
            </Button>
          </div>

          <div className="space-y-4">
            {responseRules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onUpdate={(updates) => handleUpdateRule(rule.id, updates)}
                onDelete={() => handleDeleteRule(rule.id)}
              />
            ))}
            {responseRules.length === 0 && (
              <Card>
                <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
                  No response rules configured. Add a rule to get started.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleTestRules}
          disabled={isLoading || activeConfig.rules.length === 0}
        >
          <TestTube className="w-4 h-4 mr-2" />
          Test Rules
        </Button>
        <Button
          onClick={handleSave}
          disabled={isLoading}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Configuration
        </Button>
      </div>

      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle>Rule Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-4 rounded">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface RuleCardProps {
  rule: AutoApprovalRule;
  onUpdate: (updates: Partial<AutoApprovalRule>) => void;
  onDelete: () => void;
}

const RuleCard: React.FC<RuleCardProps> = ({ rule, onUpdate, onDelete }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Badge variant={rule.enabled ? 'default' : 'secondary'}>
            {rule.type}
          </Badge>
          <Badge variant="outline">
            Priority {rule.priority}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={rule.enabled}
            onCheckedChange={(enabled) => onUpdate({ enabled })}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{rule.type === 'ASSESSMENT' ? 'Assessment Type' : 'Response Type'}</Label>
            <Select
              value={rule.assessmentType || rule.responseType}
              onValueChange={(value) => {
                if (rule.type === 'ASSESSMENT') {
                  onUpdate({ assessmentType: value as AssessmentType });
                } else {
                  onUpdate({ responseType: value as ResponseType });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(rule.type === 'ASSESSMENT' ? AssessmentType : ResponseType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Input
              type="number"
              value={rule.priority}
              onChange={(e) =>
                onUpdate({ priority: parseInt(e.target.value) || 1 })
              }
              min={1}
            />
          </div>
        </div>

        <QualityThresholdSettings
          thresholds={rule.qualityThresholds}
          onChange={(qualityThresholds) => onUpdate({ qualityThresholds })}
        />
      </CardContent>
    </Card>
  );
};

export default AutoApprovalConfiguration;