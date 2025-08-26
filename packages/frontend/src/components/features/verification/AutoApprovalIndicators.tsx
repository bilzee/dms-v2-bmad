'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  Settings,
  BarChart3,
  Timer,
  Target,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { VerificationStatus, AutoApprovalStatsResponse } from '@dms/shared';
import { format } from 'date-fns';

interface AutoApprovalIndicatorsProps {
  className?: string;
  stats?: AutoApprovalStatsResponse['data'];
  onViewConfiguration?: () => void;
  onViewDetailedStats?: () => void;
}

export const AutoApprovalIndicators: React.FC<AutoApprovalIndicatorsProps> = ({
  className,
  stats,
  onViewConfiguration,
  onViewDetailedStats,
}) => {
  if (!stats) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          Auto-approval statistics not available
        </CardContent>
      </Card>
    );
  }

  const approvalRate = stats.autoApprovalRate;
  const processingTime = stats.averageProcessingTime;

  const getRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProcessingTimeColor = (time: number) => {
    if (time <= 5) return 'text-green-600';
    if (time <= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">
                  Auto-Approved
                </p>
                <p className="text-2xl font-bold">{stats.totalAutoApproved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className={cn('w-5 h-5', getRateColor(approvalRate))} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">
                  Approval Rate
                </p>
                <p className={cn('text-2xl font-bold', getRateColor(approvalRate))}>
                  {approvalRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Timer className={cn('w-5 h-5', getProcessingTimeColor(processingTime))} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">
                  Avg Processing
                </p>
                <p className={cn('text-2xl font-bold', getProcessingTimeColor(processingTime))}>
                  {processingTime.toFixed(1)}s
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-orange-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">
                  Overrides
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.overridesCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicators */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">
            Auto-Approval Performance
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {stats.timeRange}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewDetailedStats}
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              Details
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewConfiguration}
            >
              <Settings className="w-4 h-4 mr-1" />
              Configure
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Approval Rate Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Auto-Approval Rate</span>
              <span className={getRateColor(approvalRate)}>
                {approvalRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={approvalRate} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Target: 70%</span>
              <span>
                {approvalRate >= 70 ? 'Above target' : 'Below target'}
              </span>
            </div>
          </div>

          {/* Processing Time Indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing Speed</span>
              <span className={getProcessingTimeColor(processingTime)}>
                {processingTime.toFixed(1)}s avg
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-full h-2">
                <div 
                  className={cn(
                    'h-2 rounded-full transition-all',
                    processingTime <= 5 ? 'bg-green-500' : 
                    processingTime <= 15 ? 'bg-yellow-500' : 'bg-red-500'
                  )}
                  style={{ width: `${Math.min(100, (processingTime / 30) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {processingTime <= 5 ? 'Fast' : processingTime <= 15 ? 'Normal' : 'Slow'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rule Performance */}
      {stats.rulePerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Rule Performance ({stats.rulePerformance.length} rules)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.rulePerformance.map((rule, index) => (
                <div
                  key={rule.ruleId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Rule {rule.ruleId.substring(0, 8)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {rule.applicationsCount} applications
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        rule.successRate >= 90 ? 'default' :
                        rule.successRate >= 70 ? 'secondary' : 'destructive'
                      }
                    >
                      {rule.successRate.toFixed(1)}% success
                    </Badge>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all',
                          rule.successRate >= 90 ? 'bg-green-500' :
                          rule.successRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        )}
                        style={{ width: `${rule.successRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Indicators for Individual Items */}
      <div className="text-xs text-muted-foreground">
        Last updated: {format(new Date(), 'MMM dd, yyyy HH:mm:ss')}
      </div>
    </div>
  );
};

// Status Badge Component for individual verification items
interface AutoApprovalStatusBadgeProps {
  status: VerificationStatus;
  autoApprovedAt?: Date;
  ruleId?: string;
  overriddenAt?: Date;
  className?: string;
}

export const AutoApprovalStatusBadge: React.FC<AutoApprovalStatusBadgeProps> = ({
  status,
  autoApprovedAt,
  ruleId,
  overriddenAt,
  className,
}) => {
  const getStatusConfig = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.AUTO_VERIFIED:
        return {
          variant: 'default' as const,
          icon: Zap,
          label: 'Auto-Verified',
          color: 'text-green-600',
        };
      case VerificationStatus.VERIFIED:
        return {
          variant: 'default' as const,
          icon: CheckCircle2,
          label: 'Verified',
          color: 'text-blue-600',
        };
      case VerificationStatus.PENDING:
        return {
          variant: 'secondary' as const,
          icon: Clock,
          label: 'Pending',
          color: 'text-yellow-600',
        };
      case VerificationStatus.REJECTED:
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          label: 'Rejected',
          color: 'text-red-600',
        };
      default:
        return {
          variant: 'outline' as const,
          icon: AlertTriangle,
          label: 'Unknown',
          color: 'text-gray-600',
        };
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  const tooltipContent = (
    <div className="space-y-1 text-xs">
      <div>Status: {config.label}</div>
      {autoApprovedAt && (
        <div>Auto-approved: {format(autoApprovedAt, 'MMM dd, HH:mm')}</div>
      )}
      {ruleId && (
        <div>Rule ID: {ruleId.substring(0, 8)}...</div>
      )}
      {overriddenAt && (
        <div>Overridden: {format(overriddenAt, 'MMM dd, HH:mm')}</div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className={cn('flex items-center gap-1', className)}>
            <IconComponent className="w-3 h-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Visual indicator for auto-approval filtering/sorting
interface AutoApprovalFilterIndicatorProps {
  showAutoApproved: boolean;
  onToggle: (show: boolean) => void;
  autoApprovedCount: number;
  totalCount: number;
}

export const AutoApprovalFilterIndicator: React.FC<AutoApprovalFilterIndicatorProps> = ({
  showAutoApproved,
  onToggle,
  autoApprovedCount,
  totalCount,
}) => {
  return (
    <Button
      variant={showAutoApproved ? 'default' : 'outline'}
      size="sm"
      onClick={() => onToggle(!showAutoApproved)}
      className="flex items-center gap-2"
    >
      <Zap className="w-4 h-4" />
      Auto-Approved
      <Badge variant="secondary" className="ml-1">
        {autoApprovedCount}/{totalCount}
      </Badge>
    </Button>
  );
};

export default AutoApprovalIndicators;