'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  MapPin, 
  Calendar,
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  FileText,
  Star,
  Award,
  ArrowRight,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { RapidResponse, RapidAssessment, ResponseType } from '@dms/shared';
import { format, differenceInDays, differenceInHours, isAfter, isBefore } from 'date-fns';

interface TimelineEvent {
  id: string;
  type: 'ASSESSMENT' | 'PLANNING' | 'APPROVAL' | 'DELIVERY' | 'VERIFICATION' | 'FEEDBACK';
  title: string;
  description: string;
  timestamp: Date;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'DELAYED' | 'MISSED';
  actor: string;
  metadata?: any;
}

interface PerformanceMetric {
  metric: string;
  value: number;
  unit: string;
  benchmark?: number;
  status: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
  description: string;
}

interface ResponderPerformance {
  responseTime: number; // hours from assessment to planned delivery
  deliveryAccuracy: number; // percentage
  beneficiaryServed: number;
  completenessScore: number; // percentage
  qualityScore: number; // 1-10
  overallRating: number; // 1-5 stars
}

interface ResponseAccountabilityTrackerProps {
  response: RapidResponse;
  assessment?: RapidAssessment;
  onVerificationComplete?: (verified: boolean) => void;
  onNotesChange?: (notes: string) => void;
  className?: string;
}

// Timeline Component
const DeliveryTimeline: React.FC<{
  events: TimelineEvent[];
  plannedDate: Date;
  deliveredDate?: Date;
}> = ({ events, plannedDate, deliveredDate }) => {
  const sortedEvents = events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const getStatusColor = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500';
      case 'IN_PROGRESS': return 'bg-blue-500';
      case 'DELAYED': return 'bg-yellow-500';
      case 'MISSED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'ASSESSMENT': return <FileText className="h-4 w-4 text-white" />;
      case 'PLANNING': return <Target className="h-4 w-4 text-white" />;
      case 'APPROVAL': return <CheckCircle className="h-4 w-4 text-white" />;
      case 'DELIVERY': return <MapPin className="h-4 w-4 text-white" />;
      case 'VERIFICATION': return <Activity className="h-4 w-4 text-white" />;
      case 'FEEDBACK': return <Star className="h-4 w-4 text-white" />;
      default: return <Clock className="h-4 w-4 text-white" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        <div className="space-y-4">
          {sortedEvents.map((event, index) => (
            <div key={event.id} className="relative flex items-start gap-4">
              {/* Timeline dot */}
              <div className={cn(
                'flex items-center justify-center w-12 h-12 rounded-full border-4 border-white shadow-sm z-10',
                getStatusColor(event.status)
              )}>
                {getStatusIcon(event.type)}
              </div>

              {/* Event content */}
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{event.title}</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      event.status === 'COMPLETED' ? 'default' :
                      event.status === 'IN_PROGRESS' ? 'secondary' :
                      event.status === 'DELAYED' ? 'outline' : 'destructive'
                    }>
                      {event.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(event.timestamp, 'MMM dd, HH:mm')}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                
                <div className="flex items-center text-xs text-muted-foreground">
                  <Users className="h-3 w-3 mr-1" />
                  {event.actor}
                </div>

                {/* Next event arrow */}
                {index < sortedEvents.length - 1 && (
                  <div className="flex items-center mt-3 text-xs text-muted-foreground">
                    <ArrowRight className="h-3 w-3 mr-1" />
                    <span>
                      {differenceInHours(
                        new Date(sortedEvents[index + 1].timestamp), 
                        new Date(event.timestamp)
                      )}h to next event
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Summary */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Duration</span>
              <p className="font-medium">
                {differenceInDays(
                  deliveredDate || new Date(), 
                  sortedEvents[0]?.timestamp || new Date()
                )} days
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Events</span>
              <p className="font-medium">{sortedEvents.length}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Completed</span>
              <p className="font-medium">
                {sortedEvents.filter(e => e.status === 'COMPLETED').length}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Issues</span>
              <p className="font-medium">
                {sortedEvents.filter(e => e.status === 'DELAYED' || e.status === 'MISSED').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Performance Metrics Component
const PerformanceMetricsDisplay: React.FC<{
  metrics: PerformanceMetric[];
  responderPerformance: ResponderPerformance;
}> = ({ metrics, responderPerformance }) => {
  const getMetricColor = (status: PerformanceMetric['status']) => {
    switch (status) {
      case 'EXCELLENT': return 'text-green-600';
      case 'GOOD': return 'text-blue-600';
      case 'NEEDS_IMPROVEMENT': return 'text-yellow-600';
      case 'POOR': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getMetricIcon = (status: PerformanceMetric['status']) => {
    switch (status) {
      case 'EXCELLENT': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'GOOD': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'NEEDS_IMPROVEMENT': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'POOR': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          'h-4 w-4',
          i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
        )}
      />
    ));
  };

  const performanceData = [
    { name: 'Response Time', value: responderPerformance.responseTime, color: '#3b82f6' },
    { name: 'Accuracy', value: responderPerformance.deliveryAccuracy, color: '#10b981' },
    { name: 'Completeness', value: responderPerformance.completenessScore, color: '#f59e0b' },
    { name: 'Quality', value: responderPerformance.qualityScore * 10, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6">
      {/* Overall Performance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Responder Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Overall Rating</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {renderStars(responderPerformance.overallRating)}
              </div>
              <span className="text-sm text-muted-foreground">
                {responderPerformance.overallRating}/5
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-lg font-bold text-blue-600">
                {responderPerformance.responseTime}h
              </p>
              <p className="text-xs text-muted-foreground">Response Time</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-lg font-bold text-green-600">
                {responderPerformance.deliveryAccuracy}%
              </p>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-lg font-bold text-yellow-600">
                {responderPerformance.completenessScore}%
              </p>
              <p className="text-xs text-muted-foreground">Completeness</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-lg font-bold text-purple-600">
                {responderPerformance.beneficiaryServed}
              </p>
              <p className="text-xs text-muted-foreground">Beneficiaries</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getMetricIcon(metric.status)}
                  <div>
                    <p className="font-medium">{metric.metric}</p>
                    <p className="text-sm text-muted-foreground">{metric.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn('font-bold', getMetricColor(metric.status))}>
                    {metric.value} {metric.unit}
                  </p>
                  {metric.benchmark && (
                    <p className="text-xs text-muted-foreground">
                      Benchmark: {metric.benchmark} {metric.unit}
                    </p>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {metric.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Impact Assessment Component
const ImpactAssessment: React.FC<{
  response: RapidResponse;
  assessment?: RapidAssessment;
}> = ({ response, assessment }) => {
  // Mock impact data - in real implementation, this would be calculated from actual delivery data
  const impactMetrics = {
    beneficiariesServed: 230,
    itemsDelivered: 85,
    costEfficiency: 92, // percentage
    responseEffectiveness: 87, // percentage
  };

  const impactData = [
    { 
      name: 'Immediate Impact', 
      value: 85, 
      description: 'Direct relief provided to affected population' 
    },
    { 
      name: 'Resource Utilization', 
      value: impactMetrics.costEfficiency, 
      description: 'Efficient use of donated resources' 
    },
    { 
      name: 'Response Effectiveness', 
      value: impactMetrics.responseEffectiveness, 
      description: 'Overall delivery effectiveness score' 
    }
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Response Impact Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-blue-600">
                {impactMetrics.beneficiariesServed}
              </p>
              <p className="text-sm text-muted-foreground">People Served</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Target className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-green-600">
                {impactMetrics.itemsDelivered}
              </p>
              <p className="text-sm text-muted-foreground">Items Delivered</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-yellow-600">
                {impactMetrics.costEfficiency}%
              </p>
              <p className="text-sm text-muted-foreground">Cost Efficiency</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Award className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-purple-600">
                {impactMetrics.responseEffectiveness}%
              </p>
              <p className="text-sm text-muted-foreground">Effectiveness</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={impactData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {impactData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const ResponseAccountabilityTracker: React.FC<ResponseAccountabilityTrackerProps> = ({
  response,
  assessment,
  onVerificationComplete,
  onNotesChange,
  className,
}) => {
  const [accountabilityNotes, setAccountabilityNotes] = React.useState('');
  const [accountabilityVerified, setAccountabilityVerified] = React.useState(false);

  // Mock timeline events - in real implementation, these would come from API
  const timelineEvents: TimelineEvent[] = [
    {
      id: '1',
      type: 'ASSESSMENT',
      title: 'Initial Assessment Completed',
      description: 'Rapid assessment conducted and submitted for verification',
      timestamp: assessment?.date || new Date(response.createdAt),
      status: 'COMPLETED',
      actor: assessment?.assessorName || 'Unknown Assessor',
    },
    {
      id: '2',
      type: 'PLANNING',
      title: 'Response Planning',
      description: 'Response plan created and resources allocated',
      timestamp: new Date(response.createdAt),
      status: 'COMPLETED',
      actor: response.responderName,
    },
    {
      id: '3',
      type: 'APPROVAL',
      title: 'Response Approved',
      description: 'Response plan approved by coordinator',
      timestamp: new Date(response.plannedDate.getTime() - 24 * 60 * 60 * 1000), // 1 day before planned
      status: 'COMPLETED',
      actor: 'System Coordinator',
    },
    {
      id: '4',
      type: 'DELIVERY',
      title: 'Delivery Executed',
      description: response.deliveredDate ? 'Response delivered to affected entity' : 'Delivery in progress',
      timestamp: response.deliveredDate || response.plannedDate,
      status: response.deliveredDate ? 'COMPLETED' : 
              isAfter(new Date(), response.plannedDate) ? 'DELAYED' : 'IN_PROGRESS',
      actor: response.responderName,
    },
    {
      id: '5',
      type: 'VERIFICATION',
      title: 'Verification Review',
      description: 'Delivery verification and quality assessment',
      timestamp: new Date(),
      status: 'IN_PROGRESS',
      actor: 'Current User',
    },
  ];

  // Mock performance metrics
  const performanceMetrics: PerformanceMetric[] = [
    {
      metric: 'Response Time',
      value: assessment ? differenceInHours(new Date(response.plannedDate), new Date(assessment.date)) : 48,
      unit: 'hours',
      benchmark: 72,
      status: 'GOOD',
      description: 'Time from assessment to planned delivery',
    },
    {
      metric: 'Delivery Timeliness',
      value: response.deliveredDate 
        ? differenceInHours(new Date(response.deliveredDate), new Date(response.plannedDate))
        : 0,
      unit: 'hours delay',
      benchmark: 0,
      status: response.deliveredDate && differenceInHours(new Date(response.deliveredDate), new Date(response.plannedDate)) <= 24 
        ? 'GOOD' : 'NEEDS_IMPROVEMENT',
      description: 'Delivery time relative to planned schedule',
    },
    {
      metric: 'Beneficiaries Served',
      value: 230,
      unit: 'people',
      benchmark: 250,
      status: 'GOOD',
      description: 'Number of beneficiaries reached',
    },
    {
      metric: 'Resource Efficiency',
      value: 92,
      unit: '%',
      benchmark: 85,
      status: 'EXCELLENT',
      description: 'Efficient utilization of donated resources',
    },
  ];

  const responderPerformance: ResponderPerformance = {
    responseTime: assessment ? differenceInHours(new Date(response.plannedDate), new Date(assessment.date)) : 48,
    deliveryAccuracy: 87,
    beneficiaryServed: 230,
    completenessScore: 85,
    qualityScore: 8.2,
    overallRating: 4,
  };

  // Handle verification completion
  const handleVerificationComplete = () => {
    setAccountabilityVerified(true);
    onVerificationComplete?.(true);
  };

  // Handle notes change
  React.useEffect(() => {
    onNotesChange?.(accountabilityNotes);
  }, [accountabilityNotes, onNotesChange]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Delivery Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Delivery Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DeliveryTimeline
            events={timelineEvents}
            plannedDate={new Date(response.plannedDate)}
            deliveredDate={response.deliveredDate ? new Date(response.deliveredDate) : undefined}
          />
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <PerformanceMetricsDisplay
        metrics={performanceMetrics}
        responderPerformance={responderPerformance}
      />

      {/* Impact Assessment */}
      <ImpactAssessment response={response} assessment={assessment} />

      {/* Accountability Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Accountability Review Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={accountabilityNotes}
            onChange={(e) => setAccountabilityNotes(e.target.value)}
            placeholder="Add notes about responder performance, timeline adherence, impact assessment, and overall accountability..."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Verification Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {accountabilityVerified ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Accountability has been verified</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  <span>Review accountability metrics and verify delivery impact</span>
                </>
              )}
            </div>
            
            {!accountabilityVerified && (
              <Button onClick={handleVerificationComplete}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify Accountability
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResponseAccountabilityTracker;