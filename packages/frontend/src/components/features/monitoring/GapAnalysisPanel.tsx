'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, TrendingDown, AlertTriangle, CheckCircle, Filter } from 'lucide-react';

interface GapAnalysis {
  assessmentType: 'HEALTH' | 'WASH' | 'SHELTER' | 'FOOD' | 'SECURITY';
  totalNeeds: number;
  totalResponses: number;
  fulfillmentRate: number; // 0-100 percentage
  criticalGaps: number;
  affectedEntities: number;
  lastAssessment: Date;
  lastResponse?: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface GapAnalysisPanelProps {
  refreshInterval?: number;
  showFilters?: boolean;
  priorityFilter?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  assessmentTypeFilter?: string | null;
}

export function GapAnalysisPanel({
  refreshInterval = 25000,
  showFilters = true,
  priorityFilter = null,
  assessmentTypeFilter = null
}: GapAnalysisPanelProps) {
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [overallFulfillmentRate, setOverallFulfillmentRate] = useState(0);
  const [criticalGapsCount, setCriticalGapsCount] = useState(0);

  const fetchGapAnalysis = async () => {
    try {
      const searchParams = new URLSearchParams();
      if (priorityFilter) searchParams.append('priority', priorityFilter);
      if (assessmentTypeFilter) searchParams.append('assessmentType', assessmentTypeFilter);
      
      const response = await fetch(`/api/v1/monitoring/situation/gap-analysis?${searchParams}`);
      const data = await response.json();
      
      if (data.success) {
        setGapAnalysis(data.data.map((gap: any) => ({
          ...gap,
          lastAssessment: new Date(gap.lastAssessment),
          lastResponse: gap.lastResponse ? new Date(gap.lastResponse) : undefined,
        })));
        setOverallFulfillmentRate(data.meta.overallFulfillmentRate);
        setCriticalGapsCount(data.meta.criticalGapsCount);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch gap analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGapAnalysis();
    
    const interval = setInterval(fetchGapAnalysis, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, priorityFilter, assessmentTypeFilter]);

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'secondary';
      case 'MEDIUM': return 'outline';
      case 'LOW': return 'default';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600';
      case 'HIGH': return 'text-orange-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getFulfillmentColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    if (rate >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatAssessmentType = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase();
  };

  const formatTimeSince = (date: Date) => {
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Less than 1h';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Gap Analysis Dashboard
          </CardTitle>
          <CardDescription>Loading needs vs response gap analysis...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-2 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            <CardTitle>Gap Analysis Dashboard</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {showFilters && (
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filters
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchGapAnalysis} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        <CardDescription>
          Comparison of needs vs responses by assessment type with critical gap indicators
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Overall Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className={`text-2xl font-bold ${getFulfillmentColor(overallFulfillmentRate)}`}>
                {overallFulfillmentRate}%
              </div>
              <div className="text-sm font-medium">Overall Fulfillment</div>
              <div className="text-xs text-muted-foreground">Across all assessment types</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">{criticalGapsCount}</div>
              <div className="text-sm font-medium">Critical Gaps</div>
              <div className="text-xs text-muted-foreground">Requiring immediate attention</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{gapAnalysis.length}</div>
              <div className="text-sm font-medium">Assessment Types</div>
              <div className="text-xs text-muted-foreground">Currently tracked</div>
            </div>
          </div>

          {/* Gap Analysis by Type */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Gap Analysis by Assessment Type</h4>
            {gapAnalysis.map((gap) => (
              <div key={gap.assessmentType} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h5 className="text-sm font-medium">{formatAssessmentType(gap.assessmentType)}</h5>
                    <Badge variant={getPriorityBadgeVariant(gap.priority)}>
                      {gap.priority}
                    </Badge>
                  </div>
                  <div className={`text-lg font-bold ${getFulfillmentColor(gap.fulfillmentRate)}`}>
                    {gap.fulfillmentRate}%
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div className="text-center">
                    <div className="text-lg font-semibold">{gap.totalNeeds}</div>
                    <div className="text-xs text-muted-foreground">Total Needs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">{gap.totalResponses}</div>
                    <div className="text-xs text-muted-foreground">Responses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-red-600">{gap.criticalGaps}</div>
                    <div className="text-xs text-muted-foreground">Unmet Needs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{gap.affectedEntities}</div>
                    <div className="text-xs text-muted-foreground">Entities</div>
                  </div>
                </div>
                
                <div>
                  <Progress value={gap.fulfillmentRate} className="mb-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Last assessment: {formatTimeSince(gap.lastAssessment)}</span>
                    <span>
                      Last response: {gap.lastResponse ? formatTimeSince(gap.lastResponse) : 'None'}
                    </span>
                  </div>
                </div>

                {gap.priority === 'CRITICAL' && (
                  <div className="flex items-center gap-2 mt-3 p-2 bg-red-50 rounded border border-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700">
                      Critical gap requiring immediate attention
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {gapAnalysis.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No gaps found matching current filters
              </p>
            </div>
          )}

          {/* Footer Information */}
          <div className="border-t pt-3 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              <span>Auto-refresh every {refreshInterval / 1000} seconds</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}