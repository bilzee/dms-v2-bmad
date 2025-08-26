'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Package,
  Target,
  Calendar,
  MapPin,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { RapidResponse, RapidAssessment, ResponseType } from '@dms/shared';
import { format, differenceInDays, differenceInHours } from 'date-fns';

interface DeliveryItem {
  itemType: ResponseType;
  plannedQuantity: number;
  actualQuantity: number;
  unit: string;
  variance: number; // Percentage difference
  verified: boolean;
}

interface VarianceFlag {
  type: 'QUANTITY' | 'BENEFICIARY' | 'TIMING' | 'LOCATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  threshold: number;
  actual: number;
}

interface ResponseVerificationMetrics {
  responseId: string;
  plannedItems: DeliveryItem[];
  actualItems: DeliveryItem[];
  plannedBeneficiaries: number;
  actualBeneficiaries: number;
  deliveryCompleteness: number; // Percentage
  varianceFlags: VarianceFlag[];
  verificationNotes: string;
  photosVerified: boolean;
  locationVerified: boolean;
  timestampVerified: boolean;
}

interface DeliveryMetricsValidatorProps {
  response: RapidResponse;
  assessment?: RapidAssessment;
  onVerificationComplete?: (verified: boolean) => void;
  onNotesChange?: (notes: string) => void;
  className?: string;
}

// Variance Indicator Component
const VarianceIndicator: React.FC<{
  planned: number;
  actual: number;
  unit: string;
  label: string;
}> = ({ planned, actual, unit, label }) => {
  const variance = planned > 0 ? ((actual - planned) / planned) * 100 : 0;
  const isPositive = variance >= 0;
  const isSignificant = Math.abs(variance) > 10; // 10% threshold

  const getVarianceColor = () => {
    if (Math.abs(variance) <= 5) return 'text-green-600';
    if (Math.abs(variance) <= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getVarianceIcon = () => {
    if (Math.abs(variance) <= 5) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (Math.abs(variance) <= 15) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {getVarianceIcon()}
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Planned:</span>
          <p className="font-medium">{planned.toLocaleString()} {unit}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Actual:</span>
          <p className="font-medium">{actual.toLocaleString()} {unit}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isPositive ? (
          <TrendingUp className={cn('h-4 w-4', getVarianceColor())} />
        ) : (
          <TrendingDown className={cn('h-4 w-4', getVarianceColor())} />
        )}
        <span className={cn('text-sm font-medium', getVarianceColor())}>
          {isPositive ? '+' : ''}{variance.toFixed(1)}%
        </span>
        {isSignificant && (
          <Badge variant={Math.abs(variance) > 15 ? 'destructive' : 'secondary'} className="text-xs">
            {Math.abs(variance) > 15 ? 'High Variance' : 'Moderate Variance'}
          </Badge>
        )}
      </div>
    </div>
  );
};

// Delivery Completeness Chart
const DeliveryCompletenessChart: React.FC<{
  plannedItems: DeliveryItem[];
  actualItems: DeliveryItem[];
}> = ({ plannedItems, actualItems }) => {
  const chartData = plannedItems.map(planned => {
    const actual = actualItems.find(a => a.itemType === planned.itemType);
    return {
      item: planned.itemType,
      planned: planned.plannedQuantity,
      actual: actual?.actualQuantity || 0,
      completeness: actual 
        ? (actual.actualQuantity / planned.plannedQuantity) * 100 
        : 0
    };
  });

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="item" />
          <YAxis />
          <Tooltip
            formatter={(value, name) => [
              typeof value === 'number' ? value.toFixed(1) : value,
              name === 'planned' ? 'Planned' : name === 'actual' ? 'Actual' : 'Completeness %'
            ]}
          />
          <Legend />
          <Bar dataKey="planned" fill="#94a3b8" name="Planned" />
          <Bar dataKey="actual" fill="#3b82f6" name="Actual" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Beneficiary Analysis
const BeneficiaryAnalysis: React.FC<{
  plannedBeneficiaries: number;
  actualBeneficiaries: number;
}> = ({ plannedBeneficiaries, actualBeneficiaries }) => {
  const variance = plannedBeneficiaries > 0 
    ? ((actualBeneficiaries - plannedBeneficiaries) / plannedBeneficiaries) * 100 
    : 0;

  const pieData = [
    { name: 'Served', value: actualBeneficiaries, color: '#3b82f6' },
    { name: 'Not Served', value: Math.max(0, plannedBeneficiaries - actualBeneficiaries), color: '#e2e8f0' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h4 className="font-medium">Beneficiary Comparison</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-muted-foreground">Planned Beneficiaries</span>
            <span className="font-medium">{plannedBeneficiaries.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span className="text-sm text-muted-foreground">Actual Beneficiaries</span>
            <span className="font-medium">{actualBeneficiaries.toLocaleString()}</span>
          </div>

          <div className={cn(
            'flex items-center justify-between p-3 rounded-lg',
            Math.abs(variance) <= 5 ? 'bg-green-50' :
            Math.abs(variance) <= 15 ? 'bg-yellow-50' : 'bg-red-50'
          )}>
            <span className="text-sm text-muted-foreground">Variance</span>
            <div className="flex items-center gap-2">
              {variance >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium">
                {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Coverage Visualization</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                dataKey="value"
                label={({ name, value, percent }) => 
                  `${name}: ${value} (${(percent * 100).toFixed(1)}%)`
                }
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Timeline Analysis
const TimelineAnalysis: React.FC<{
  response: RapidResponse;
  assessment?: RapidAssessment;
}> = ({ response, assessment }) => {
  const plannedDate = new Date(response.plannedDate);
  const deliveredDate = response.deliveredDate ? new Date(response.deliveredDate) : null;
  const assessmentDate = assessment ? new Date(assessment.date) : null;

  const timeToResponse = assessmentDate 
    ? differenceInDays(plannedDate, assessmentDate)
    : null;
  
  const deliveryDelay = deliveredDate
    ? differenceInHours(deliveredDate, plannedDate)
    : null;

  return (
    <div className="space-y-4">
      <h4 className="font-medium">Timeline Analysis</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Response Time */}
        {timeToResponse !== null && (
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Response Time</span>
            </div>
            <p className="text-lg font-bold">
              {timeToResponse} day{timeToResponse !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              Assessment to planned delivery
            </p>
          </div>
        )}

        {/* Delivery Timeliness */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Delivery Timeliness</span>
          </div>
          <p className="text-lg font-bold">
            {deliveryDelay !== null 
              ? `${deliveryDelay >= 0 ? '+' : ''}${deliveryDelay}h`
              : 'Not delivered'
            }
          </p>
          <p className="text-xs text-muted-foreground">
            Relative to planned time
          </p>
          {deliveryDelay !== null && (
            <Badge 
              variant={
                Math.abs(deliveryDelay) <= 24 ? 'default' :
                Math.abs(deliveryDelay) <= 72 ? 'secondary' : 'destructive'
              } 
              className="text-xs mt-1"
            >
              {Math.abs(deliveryDelay) <= 24 ? 'On Time' :
               Math.abs(deliveryDelay) <= 72 ? 'Delayed' : 'Significantly Delayed'}
            </Badge>
          )}
        </div>

        {/* Delivery Status */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Delivery Status</span>
          </div>
          <Badge variant={response.status === 'DELIVERED' ? 'default' : 'secondary'}>
            {response.status}
          </Badge>
          {response.deliveredDate && (
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(response.deliveredDate), 'MMM dd, yyyy HH:mm')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const DeliveryMetricsValidator: React.FC<DeliveryMetricsValidatorProps> = ({
  response,
  assessment,
  onVerificationComplete,
  onNotesChange,
  className,
}) => {
  const [verificationNotes, setVerificationNotes] = React.useState('');
  const [metricsVerified, setMetricsVerified] = React.useState(false);
  const [customBeneficiaryCount, setCustomBeneficiaryCount] = React.useState<number | null>(null);

  // Mock planned vs actual data - in real implementation, this would come from API
  const plannedItems: DeliveryItem[] = [
    {
      itemType: response.responseType,
      plannedQuantity: 100, // This would come from assessment or response planning
      actualQuantity: 85, // This would come from delivery evidence
      unit: 'units',
      variance: -15,
      verified: false,
    },
  ];

  const actualItems: DeliveryItem[] = plannedItems.map(item => ({
    ...item,
    actualQuantity: item.actualQuantity,
  }));

  // Mock beneficiary data
  const plannedBeneficiaries = 250; // From assessment
  const actualBeneficiaries = customBeneficiaryCount || 230; // From delivery report

  // Calculate overall completeness
  const overallCompleteness = plannedItems.length > 0
    ? plannedItems.reduce((sum, item) => {
        const actual = actualItems.find(a => a.itemType === item.itemType);
        return sum + (actual ? (actual.actualQuantity / item.plannedQuantity) * 100 : 0);
      }, 0) / plannedItems.length
    : 0;

  // Generate variance flags
  const varianceFlags: VarianceFlag[] = [];
  
  plannedItems.forEach(item => {
    const actual = actualItems.find(a => a.itemType === item.itemType);
    if (actual) {
      const variance = Math.abs(actual.actualQuantity - item.plannedQuantity) / item.plannedQuantity * 100;
      if (variance > 15) {
        varianceFlags.push({
          type: 'QUANTITY',
          severity: variance > 30 ? 'HIGH' : 'MEDIUM',
          description: `${item.itemType} delivery variance: ${variance.toFixed(1)}%`,
          threshold: 15,
          actual: variance,
        });
      }
    }
  });

  // Check beneficiary variance
  const beneficiaryVariance = Math.abs(actualBeneficiaries - plannedBeneficiaries) / plannedBeneficiaries * 100;
  if (beneficiaryVariance > 10) {
    varianceFlags.push({
      type: 'BENEFICIARY',
      severity: beneficiaryVariance > 25 ? 'HIGH' : 'MEDIUM',
      description: `Beneficiary count variance: ${beneficiaryVariance.toFixed(1)}%`,
      threshold: 10,
      actual: beneficiaryVariance,
    });
  }

  // Handle verification completion
  const handleVerificationComplete = () => {
    setMetricsVerified(true);
    onVerificationComplete?.(true);
  };

  // Handle notes change
  React.useEffect(() => {
    onNotesChange?.(verificationNotes);
  }, [verificationNotes, onNotesChange]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Completeness</p>
                <p className="text-2xl font-bold">{overallCompleteness.toFixed(1)}%</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <Progress value={overallCompleteness} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Beneficiaries Served</p>
                <p className="text-2xl font-bold">{actualBeneficiaries.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  of {plannedBeneficiaries.toLocaleString()} planned
                </p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Variance Flags</p>
                <p className="text-2xl font-bold">{varianceFlags.length}</p>
                <p className="text-xs text-muted-foreground">
                  {varianceFlags.filter(f => f.severity === 'HIGH').length} high priority
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Items Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Items Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DeliveryCompletenessChart 
            plannedItems={plannedItems} 
            actualItems={actualItems} 
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plannedItems.map((item, index) => {
              const actual = actualItems.find(a => a.itemType === item.itemType);
              return (
                <Card key={index} className="border border-gray-200">
                  <CardContent className="p-4">
                    <VarianceIndicator
                      planned={item.plannedQuantity}
                      actual={actual?.actualQuantity || 0}
                      unit={item.unit}
                      label={item.itemType}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Beneficiary Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Beneficiary Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <BeneficiaryAnalysis
            plannedBeneficiaries={plannedBeneficiaries}
            actualBeneficiaries={actualBeneficiaries}
          />
          
          {/* Custom Beneficiary Count Input */}
          <div className="mt-6 p-4 border rounded-lg bg-gray-50">
            <label className="text-sm font-medium mb-2 block">
              Adjust Actual Beneficiary Count (if delivery report differs)
            </label>
            <Input
              type="number"
              value={customBeneficiaryCount || actualBeneficiaries}
              onChange={(e) => setCustomBeneficiaryCount(parseInt(e.target.value) || null)}
              className="w-48"
              placeholder="Enter actual count"
            />
          </div>
        </CardContent>
      </Card>

      {/* Timeline Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineAnalysis response={response} assessment={assessment} />
        </CardContent>
      </Card>

      {/* Variance Flags */}
      {varianceFlags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Variance Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {varianceFlags.map((flag, index) => (
                <div 
                  key={index}
                  className={cn(
                    'p-4 rounded-lg border flex items-start gap-3',
                    flag.severity === 'HIGH' ? 'bg-red-50 border-red-200' :
                    flag.severity === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-blue-50 border-blue-200'
                  )}
                >
                  <AlertTriangle className={cn(
                    'h-5 w-5 mt-0.5',
                    flag.severity === 'HIGH' ? 'text-red-600' :
                    flag.severity === 'MEDIUM' ? 'text-yellow-600' :
                    'text-blue-600'
                  )} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={
                        flag.severity === 'HIGH' ? 'destructive' :
                        flag.severity === 'MEDIUM' ? 'secondary' : 'default'
                      }>
                        {flag.severity} {flag.type}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{flag.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Threshold: {flag.threshold}% | Actual: {flag.actual.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Metrics Verification Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={verificationNotes}
            onChange={(e) => setVerificationNotes(e.target.value)}
            placeholder="Add notes about the delivery metrics, variances, and overall assessment of the response effectiveness..."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Verification Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {metricsVerified ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Metrics have been verified</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  <span>Review metrics and verify delivery data</span>
                </>
              )}
            </div>
            
            {!metricsVerified && (
              <Button onClick={handleVerificationComplete}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify Metrics
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryMetricsValidator;