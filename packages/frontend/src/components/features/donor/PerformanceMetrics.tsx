'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line
} from 'recharts';
import { TrendingUp, TrendingDown, Target, Users, Clock, CheckCircle } from 'lucide-react';

interface PerformanceMetricsProps {
  metrics: {
    onTimeDeliveryRate: number;
    quantityAccuracyRate: number;
    performanceScore: number;
    totalCommitments: number;
    completedDeliveries: number;
    beneficiariesHelped: number;
    responseTypesServed: string[];
    lastUpdated: Date;
  };
  trends?: {
    onTimeDeliveryRate: number;
    quantityAccuracyRate: number;
    performanceScore: number;
  };
  className?: string;
}

export function PerformanceMetrics({ metrics, trends, className }: PerformanceMetricsProps) {
  // Format data for charts
  const performanceData = [
    { name: 'On-Time Delivery', value: metrics.onTimeDeliveryRate, color: '#22c55e' },
    { name: 'Quantity Accuracy', value: metrics.quantityAccuracyRate, color: '#3b82f6' },
    { name: 'Overall Performance', value: metrics.performanceScore, color: '#f59e0b' },
  ];

  const responseTypeData = metrics.responseTypesServed.map((type, index) => ({
    name: type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
    value: Math.floor(Math.random() * 100) + 50, // Mock data - replace with real distribution
    color: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'][index % 6],
  }));

  const getTrendIcon = (trend: number) => {
    if (trend > 2) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < -2) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <div className="w-4 h-4" />; // Neutral/no significant trend
  };

  const getTrendColor = (trend: number) => {
    if (trend > 2) return 'text-green-600';
    if (trend < -2) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">{metrics.onTimeDeliveryRate}%</div>
              {trends && (
                <div className="flex items-center space-x-1">
                  {getTrendIcon(trends.onTimeDeliveryRate)}
                  <span className={`text-xs ${getTrendColor(trends.onTimeDeliveryRate)}`}>
                    {trends.onTimeDeliveryRate > 0 ? '+' : ''}{trends.onTimeDeliveryRate.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.completedDeliveries} of {metrics.totalCommitments} commitments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quantity Accuracy</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">{metrics.quantityAccuracyRate}%</div>
              {trends && (
                <div className="flex items-center space-x-1">
                  {getTrendIcon(trends.quantityAccuracyRate)}
                  <span className={`text-xs ${getTrendColor(trends.quantityAccuracyRate)}`}>
                    {trends.quantityAccuracyRate > 0 ? '+' : ''}{trends.quantityAccuracyRate.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Average across all deliveries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">{metrics.performanceScore}</div>
              {trends && (
                <div className="flex items-center space-x-1">
                  {getTrendIcon(trends.performanceScore)}
                  <span className={`text-xs ${getTrendColor(trends.performanceScore)}`}>
                    {trends.performanceScore > 0 ? '+' : ''}{trends.performanceScore.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.beneficiariesHelped.toLocaleString()} beneficiaries helped
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Key performance metrics breakdown
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value: number) => [`${value}%`, 'Performance']}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px' 
                }}
              />
              <Bar 
                dataKey="value" 
                fill="#3B82F6"
                radius={[4, 4, 0, 0]}
              >
                {performanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Response Types Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Response Types Served</CardTitle>
          <p className="text-sm text-muted-foreground">
            Distribution of response types across your deliveries
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={responseTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {responseTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [value, 'Deliveries']}
                  labelStyle={{ color: '#374151' }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="space-y-3">
              {responseTypeData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <Badge variant="secondary">{item.value} deliveries</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
          <p className="text-sm text-muted-foreground">
            Overall impact and effectiveness metrics
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.totalCommitments}</div>
              <p className="text-xs text-muted-foreground">Total Commitments</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.completedDeliveries}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {metrics.beneficiariesHelped.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Beneficiaries</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {metrics.responseTypesServed.length}
              </div>
              <p className="text-xs text-muted-foreground">Response Types</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-center text-xs text-muted-foreground">
        <Clock className="w-3 h-3 inline mr-1" />
        Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}