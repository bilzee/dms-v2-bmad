'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { HelpCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { QualityThreshold } from '@dms/shared';

interface QualityThresholdSettingsProps {
  className?: string;
  thresholds: QualityThreshold;
  onChange: (thresholds: QualityThreshold) => void;
  disabled?: boolean;
}

export const QualityThresholdSettings: React.FC<QualityThresholdSettingsProps> = ({
  className,
  thresholds,
  onChange,
  disabled = false,
}) => {
  const handleThresholdChange = (key: keyof QualityThreshold, value: any) => {
    onChange({
      ...thresholds,
      [key]: value,
    });
  };

  const getCompletenessLabel = (percentage: number) => {
    if (percentage >= 95) return { text: 'Excellent', variant: 'default' as const };
    if (percentage >= 85) return { text: 'Good', variant: 'default' as const };
    if (percentage >= 70) return { text: 'Fair', variant: 'secondary' as const };
    return { text: 'Poor', variant: 'destructive' as const };
  };

  const getAccuracyLabel = (meters: number) => {
    if (meters <= 5) return { text: 'Very High', variant: 'default' as const };
    if (meters <= 10) return { text: 'High', variant: 'default' as const };
    if (meters <= 25) return { text: 'Medium', variant: 'secondary' as const };
    return { text: 'Low', variant: 'destructive' as const };
  };

  const completenessLabel = getCompletenessLabel(thresholds.dataCompletenessPercentage);
  const accuracyLabel = thresholds.gpsAccuracyMeters 
    ? getAccuracyLabel(thresholds.gpsAccuracyMeters)
    : null;

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Quality Thresholds
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Completeness */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="completeness">Data Completeness Percentage</Label>
            <div className="flex items-center gap-2">
              <Badge variant={completenessLabel.variant}>
                {completenessLabel.text}
              </Badge>
              <span className="text-sm font-medium">
                {thresholds.dataCompletenessPercentage}%
              </span>
            </div>
          </div>
          <Slider
            id="completeness"
            min={50}
            max={100}
            step={5}
            value={[thresholds.dataCompletenessPercentage]}
            onValueChange={([value]) => 
              handleThresholdChange('dataCompletenessPercentage', value)
            }
            disabled={disabled}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        <Separator />

        {/* Required Fields */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Required Fields Complete</Label>
            <p className="text-xs text-muted-foreground">
              All mandatory fields must be filled
            </p>
          </div>
          <Switch
            checked={thresholds.requiredFieldsComplete}
            onCheckedChange={(value) => 
              handleThresholdChange('requiredFieldsComplete', value)
            }
            disabled={disabled}
          />
        </div>

        <Separator />

        {/* Media Attachments */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Require Media Attachments</Label>
            <p className="text-xs text-muted-foreground">
              Photos or videos must be attached
            </p>
          </div>
          <Switch
            checked={thresholds.hasMediaAttachments || false}
            onCheckedChange={(value) => 
              handleThresholdChange('hasMediaAttachments', value)
            }
            disabled={disabled}
          />
        </div>

        <Separator />

        {/* GPS Accuracy */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="gpsAccuracy">GPS Accuracy Threshold (meters)</Label>
              <p className="text-xs text-muted-foreground">
                Maximum allowed GPS accuracy deviation
              </p>
            </div>
            <div className="flex items-center gap-2">
              {accuracyLabel && (
                <Badge variant={accuracyLabel.variant}>
                  {accuracyLabel.text}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Switch
              checked={thresholds.gpsAccuracyMeters !== undefined}
              onCheckedChange={(enabled) => 
                handleThresholdChange(
                  'gpsAccuracyMeters', 
                  enabled ? 10 : undefined
                )
              }
              disabled={disabled}
            />
            {thresholds.gpsAccuracyMeters !== undefined && (
              <div className="flex-1 space-y-2">
                <Slider
                  id="gpsAccuracy"
                  min={1}
                  max={50}
                  step={1}
                  value={[thresholds.gpsAccuracyMeters]}
                  onValueChange={([value]) => 
                    handleThresholdChange('gpsAccuracyMeters', value)
                  }
                  disabled={disabled}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1m</span>
                  <span>{thresholds.gpsAccuracyMeters}m</span>
                  <span>50m</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Assessor Reputation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="reputation">Assessor Reputation Score</Label>
              <p className="text-xs text-muted-foreground">
                Minimum reputation score required (1-100)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Switch
              checked={thresholds.assessorReputationScore !== undefined}
              onCheckedChange={(enabled) => 
                handleThresholdChange(
                  'assessorReputationScore', 
                  enabled ? 70 : undefined
                )
              }
              disabled={disabled}
            />
            {thresholds.assessorReputationScore !== undefined && (
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={thresholds.assessorReputationScore}
                    onChange={(e) => 
                      handleThresholdChange(
                        'assessorReputationScore', 
                        parseInt(e.target.value) || 70
                      )
                    }
                    disabled={disabled}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Time Since Submission */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="timeLimit">Time Since Submission (minutes)</Label>
              <p className="text-xs text-muted-foreground">
                Maximum time elapsed since submission
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Switch
              checked={thresholds.timeSinceSubmission !== undefined}
              onCheckedChange={(enabled) => 
                handleThresholdChange(
                  'timeSinceSubmission', 
                  enabled ? 60 : undefined
                )
              }
              disabled={disabled}
            />
            {thresholds.timeSinceSubmission !== undefined && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={5}
                  max={1440}
                  value={thresholds.timeSinceSubmission}
                  onChange={(e) => 
                    handleThresholdChange(
                      'timeSinceSubmission', 
                      parseInt(e.target.value) || 60
                    )
                  }
                  disabled={disabled}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Batch Size Limit */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="batchSize">Maximum Batch Size</Label>
              <p className="text-xs text-muted-foreground">
                Maximum number of items to auto-approve in one batch
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Switch
              checked={thresholds.maxBatchSize !== undefined}
              onCheckedChange={(enabled) => 
                handleThresholdChange(
                  'maxBatchSize', 
                  enabled ? 10 : undefined
                )
              }
              disabled={disabled}
            />
            {thresholds.maxBatchSize !== undefined && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={thresholds.maxBatchSize}
                  onChange={(e) => 
                    handleThresholdChange(
                      'maxBatchSize', 
                      parseInt(e.target.value) || 10
                    )
                  }
                  disabled={disabled}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">items</span>
              </div>
            )}
          </div>
        </div>

        {/* Validation Warnings */}
        {thresholds.dataCompletenessPercentage < 70 && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-700">
              Low completeness threshold may result in poor quality auto-approvals
            </span>
          </div>
        )}

        {thresholds.gpsAccuracyMeters && thresholds.gpsAccuracyMeters > 25 && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-700">
              High GPS accuracy threshold may allow inaccurate location data
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QualityThresholdSettings;