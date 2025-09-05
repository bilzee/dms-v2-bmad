'use client';

import React, { useEffect, useState } from 'react';
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
  ComposedChart,
  Line
} from 'recharts';
import { 
  Users, 
  MapPin, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  Globe,
  Heart,
  Target
} from 'lucide-react';

interface ImpactVisualizationProps {
  period: '30' | '90' | '365' | 'all';
  responseType?: string;
  region?: string;
  className?: string;
}

interface ImpactData {
  totalBeneficiariesHelped: number;
  beneficiariesByResponseType: Record<string, number>;
  geographicImpact: {
    locationsServed: number;
    coverageAreaKm2: number;
    regions: Array<{
      name: string;
      beneficiaries: number;
      deliveries: number;
      responseTypes: string[];
    }>;
  };
  impactOverTime: Array<{
    date: string;
    cumulativeBeneficiaries: number;
    newBeneficiaries: number;
    deliveries: number;
  }>;
  effectivenessMetrics: {
    needFulfillmentRate: number;
    responseTimeHours: number;
    verificationRate: number;
  };
}

interface ImpactInsights {
  mostImpactfulResponseType: string;
  averageBeneficiariesPerDelivery: number;
  impactGrowthRate: number;
}

export function ImpactVisualization({ 
  period, 
  responseType = 'all', 
  region = 'all', 
  className 
}: ImpactVisualizationProps) {
  const [impactData, setImpactData] = useState<ImpactData | null>(null);
  const [insights, setInsights] = useState<ImpactInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImpactData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({
          period,
          ...(responseType !== 'all' && { responseType }),
          ...(region !== 'all' && { region }),
        });

        const response = await fetch(`/api/v1/donors/impact?${params}`);
        const result = await response.json();

        if (result.success) {
          setImpactData(result.data.impact);
          setInsights(result.data.insights);
        } else {
          setError(result.message || 'Failed to fetch impact data');
        }
      } catch (err) {
        setError('Failed to fetch impact metrics');
        console.error('Error fetching impact:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchImpactData();
  }, [period, responseType, region]);

  const formatResponseType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading impact metrics...</p>
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
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!impactData) {
    return null;
  }

  // Prepare chart data
  const responseTypeChartData = Object.entries(impactData.beneficiariesByResponseType).map(([type, count], index) => ({
    name: formatResponseType(type),
    value: count,
    color: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'][index % 6],
  }));

  const regionChartData = impactData.geographicImpact.regions.map((region, index) => ({
    ...region,
    color: ['#3b82f6', '#ef4444', '#22c55e', '#f97316', '#8b5cf6', '#eab308'][index % 6],
  }));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Impact Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Beneficiaries</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {impactData.totalBeneficiariesHelped.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Lives directly impacted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coverage Area</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {impactData.geographicImpact.coverageAreaKm2.toLocaleString()} km²
            </div>
            <p className="text-xs text-muted-foreground">
              {impactData.geographicImpact.locationsServed} locations served
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {impactData.effectivenessMetrics.responseTimeHours.toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground">
              Average commitment to delivery
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verification Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {impactData.effectivenessMetrics.verificationRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Deliveries verified by recipients
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Impact Growth Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Impact Growth Over Time</CardTitle>
          <p className="text-sm text-muted-foreground">
            Cumulative beneficiaries helped and delivery progress
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={impactData.impactOverTime}>
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
                  if (name === 'cumulativeBeneficiaries') return [value.toLocaleString(), 'Total Beneficiaries'];
                  if (name === 'newBeneficiaries') return [value, 'New Beneficiaries'];
                  return [value, 'Deliveries'];
                }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px' 
                }}
              />
              <Legend />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="cumulativeBeneficiaries" 
                stackId="1"
                stroke="#3b82f6" 
                fill="#3b82f6"
                fillOpacity={0.4}
                name="Total Beneficiaries"
              />
              <Bar 
                yAxisId="right"
                dataKey="deliveries" 
                fill="#22c55e"
                name="Deliveries"
                radius={[2, 2, 0, 0]}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Impact by Response Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Impact by Response Type</CardTitle>
            <p className="text-sm text-muted-foreground">
              Beneficiaries helped by different response types
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={responseTypeChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {responseTypeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString(), 'Beneficiaries']}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px' 
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {responseTypeChartData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        {((item.value / impactData.totalBeneficiariesHelped) * 100).toFixed(1)}% of total impact
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{item.value.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">beneficiaries</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Geographic Impact */}
      <Card>
        <CardHeader>
          <CardTitle>Geographic Impact Distribution</CardTitle>
          <p className="text-sm text-muted-foreground">
            Impact across different regions and communities
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={regionChartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString(), 'Beneficiaries']}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px' 
                  }}
                />
                <Bar 
                  dataKey="beneficiaries" 
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                >
                  {regionChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="space-y-4">
              {regionChartData.map((region, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{region.name}</h3>
                    <Badge variant="secondary">{region.deliveries} deliveries</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex items-center text-gray-600">
                        <Users className="w-4 h-4 mr-1" />
                        {region.beneficiaries.toLocaleString()} beneficiaries
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center text-gray-600">
                        <Target className="w-4 h-4 mr-1" />
                        {region.responseTypes.length} response types
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {region.responseTypes.map(formatResponseType).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Effectiveness Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Effectiveness Metrics</CardTitle>
          <p className="text-sm text-muted-foreground">
            Key indicators of delivery effectiveness and impact quality
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {impactData.effectivenessMetrics.needFulfillmentRate.toFixed(1)}%
              </div>
              <p className="font-medium text-blue-900">Need Fulfillment Rate</p>
              <p className="text-sm text-blue-700 mt-1">
                Percentage of assessed needs successfully met
              </p>
            </div>

            <div className="text-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {insights?.averageBeneficiariesPerDelivery || 0}
              </div>
              <p className="font-medium text-green-900">Beneficiaries per Delivery</p>
              <p className="text-sm text-green-700 mt-1">
                Average impact efficiency per delivery
              </p>
            </div>

            <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {insights?.impactGrowthRate.toFixed(1) || 0}%
              </div>
              <p className="font-medium text-purple-900">Impact Growth Rate</p>
              <p className="text-sm text-purple-700 mt-1">
                Growth in beneficiaries helped over time
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Impact Insights */}
      {insights && (
        <Card>
          <CardHeader>
            <CardTitle>Impact Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Heart className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Most Impactful Response Type</p>
                    <p className="text-sm text-blue-800">
                      <strong>{formatResponseType(insights.mostImpactfulResponseType)}</strong> has been your most impactful response type, helping the most beneficiaries.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Target className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Delivery Efficiency</p>
                    <p className="text-sm text-green-800">
                      You&apos;re helping an average of <strong>{insights.averageBeneficiariesPerDelivery}</strong> beneficiaries per delivery, showing excellent resource utilization.
                    </p>
                  </div>
                </div>
              </div>

              {insights.impactGrowthRate > 0 && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-purple-900">Growing Impact</p>
                      <p className="text-sm text-purple-800">
                        Your impact is growing by <strong>{insights.impactGrowthRate.toFixed(1)}%</strong> over the selected period, showing increasing effectiveness.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}