'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  AreaChart,
  Area,
  ComposedChart,
  Bar
} from 'recharts';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, TrendingDown, BarChart3, Activity, Calendar } from 'lucide-react';

interface PerformanceTrendsProps {
  period: '30' | '90' | '365';
  responseType?: string;
  className?: string;
}

interface HistoryPoint {
  date: string;
  onTimeDeliveryRate: number;
  quantityAccuracyRate: number;
  performanceScore: number;
  completedDeliveries: number;
  beneficiariesHelped: number;
}

interface TrendAnalysis {
  onTimeDeliveryRate: number;
  quantityAccuracyRate: number;
  performanceScore: number;
  completedDeliveries: number;
  beneficiariesHelped: number;
}

export function PerformanceTrends({ period, responseType, className }: PerformanceTrendsProps) {
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);
  const [trends, setTrends] = useState<TrendAnalysis | null>(null);
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistoryData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({
          period,
          granularity,
        });

        const response = await fetch(`/api/v1/donors/performance/history?${params}`);
        const result = await response.json();

        if (result.success) {
          setHistoryData(result.data.history);
          setTrends(result.data.trends);
        } else {
          setError(result.message || 'Failed to fetch history data');
        }
      } catch (err) {
        setError('Failed to fetch performance history');
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryData();
  }, [period, granularity]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (granularity === 'daily') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    if (granularity === 'weekly') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 2) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < -2) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Activity className="w-4 h-4 text-gray-500" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 2) return 'text-green-600 bg-green-50';
    if (trend < -2) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getRecommendedGranularity = (period: string) => {
    switch (period) {
      case '30':
        return 'daily';
      case '90':
        return 'weekly';
      case '365':
        return 'monthly';
      default:
        return 'monthly';
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading performance trends...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">View:</span>
                <Select value={granularity} onValueChange={(value: any) => setGranularity(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {granularity !== getRecommendedGranularity(period) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setGranularity(getRecommendedGranularity(period) as any)}
                >
                  Use Recommended ({getRecommendedGranularity(period)})
                </Button>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {historyData.length} data points over {period} days
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trend Summary */}
      {trends && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(trends).map(([key, value]) => {
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            return (
              <Card key={key}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{label}</p>
                      <div className={`text-xs px-2 py-1 rounded-md mt-1 ${getTrendColor(value)}`}>
                        <div className="flex items-center space-x-1">
                          {getTrendIcon(value)}
                          <span>{value > 0 ? '+' : ''}{value.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Performance Score Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Score Trend</CardTitle>
          <p className="text-sm text-muted-foreground">
            Overall performance score over time
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                interval="preserveStartEnd"
              />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                labelFormatter={(label) => `Date: ${formatDate(label)}`}
                formatter={(value: number) => [`${value.toFixed(1)}`, 'Performance Score']}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px' 
                }}
              />
              <Area 
                type="monotone" 
                dataKey="performanceScore" 
                stroke="#3b82f6" 
                fill="#3b82f6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Delivery Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Performance Metrics</CardTitle>
          <p className="text-sm text-muted-foreground">
            On-time delivery and quantity accuracy trends
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                interval="preserveStartEnd"
              />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                labelFormatter={(label) => `Date: ${formatDate(label)}`}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}%`, 
                  name === 'onTimeDeliveryRate' ? 'On-Time Delivery' : 'Quantity Accuracy'
                ]}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px' 
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="onTimeDeliveryRate" 
                stroke="#22c55e" 
                strokeWidth={2}
                name="On-Time Delivery"
                dot={{ fill: '#22c55e', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="quantityAccuracyRate" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Quantity Accuracy"
                dot={{ fill: '#f59e0b', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Delivery Volume and Impact */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Volume & Impact</CardTitle>
          <p className="text-sm text-muted-foreground">
            Number of deliveries and beneficiaries helped over time
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                interval="preserveStartEnd"
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                labelFormatter={(label) => `Date: ${formatDate(label)}`}
                formatter={(value: number, name: string) => {
                  if (name === 'completedDeliveries') {
                    return [value, 'Deliveries'];
                  }
                  return [value, 'Beneficiaries'];
                }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px' 
                }}
              />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="completedDeliveries" 
                fill="#3b82f6"
                name="Completed Deliveries"
                radius={[2, 2, 0, 0]}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="beneficiariesHelped" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Beneficiaries Helped"
                dot={{ fill: '#ef4444', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trends && trends.performanceScore > 5 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Excellent Progress:</strong> Your performance score is trending upward by {trends.performanceScore.toFixed(1)}%. Keep up the great work!
                </p>
              </div>
            )}
            
            {trends && trends.onTimeDeliveryRate < -5 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Attention Needed:</strong> On-time delivery rate has decreased by {Math.abs(trends.onTimeDeliveryRate).toFixed(1)}%. Consider reviewing your delivery planning process.
                </p>
              </div>
            )}
            
            {trends && trends.beneficiariesHelped > 10 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Growing Impact:</strong> You&apos;re helping {trends.beneficiariesHelped.toFixed(1)}% more beneficiaries. Your contributions are making a real difference!
                </p>
              </div>
            )}

            {historyData.length > 0 && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Data Coverage:</strong> Analysis based on {historyData.length} data points over the last {period} days with {granularity} granularity.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}