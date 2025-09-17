'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface HistoricalData {
  date: Date;
  metrics: Record<string, number>;
}

interface TrendData {
  metric: string;
  change: number;
  direction: 'up' | 'down' | 'stable';
}

interface HistoricalComparisonChartProps {
  dataType: 'assessments' | 'responses' | 'incidents' | 'entities';
  timeRange?: '1w' | '3m' | '6m' | '9m' | '1y';
  metricTypes?: string[];
  onMetricSelect?: (metric: string) => void;
}

export function HistoricalComparisonChart({
  dataType,
  timeRange = '3m',
  metricTypes = [],
  onMetricSelect,
}: HistoricalComparisonChartProps) {
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [currentData, setCurrentData] = useState<HistoricalData | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [chartType, setChartType] = useState<'line' | 'area'>('line');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1w' | '3m' | '6m' | '9m' | '1y'>(timeRange);
  const hasInitializedMetrics = useRef(false);

  const fetchHistoricalData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('timeRange', selectedTimeRange);
      if (metricTypes.length > 0) {
        searchParams.append('metricTypes', metricTypes.join(','));
      }
      
      console.log(`Fetching historical data for ${dataType} with params:`, searchParams.toString());
      
      const response = await fetch(`/api/v1/monitoring/historical/${dataType}?${searchParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log(`Historical data response for ${dataType}:`, data);
      
      if (data.success) {
        const formattedHistorical = data.data.historical.map((item: any) => ({
          ...item,
          date: new Date(item.date),
        }));
        const formattedCurrent = {
          ...data.data.current,
          date: new Date(data.data.current.date),
        };
        
        setHistoricalData(formattedHistorical);
        setCurrentData(formattedCurrent);
        setTrends(data.data.trends);
        setAnalytics(data.data.analytics);
        
        // Auto-select first few metrics for display (only once)
        if (formattedCurrent && selectedMetrics.length === 0 && !hasInitializedMetrics.current) {
          const availableMetrics = Object.keys(formattedCurrent.metrics);
          if (availableMetrics.length > 0) {
            setSelectedMetrics(availableMetrics.slice(0, Math.min(3, availableMetrics.length)));
            hasInitializedMetrics.current = true;
          }
        }
      } else {
        setError(data.message || 'Failed to fetch historical data');
      }
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [dataType, selectedTimeRange, JSON.stringify(metricTypes)]);

  useEffect(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);

  // Update selected time range when prop changes
  useEffect(() => {
    setSelectedTimeRange(timeRange);
  }, [timeRange]);

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down': return <TrendingDown className="h-3 w-3 text-red-600" />;
      case 'stable': return <Minus className="h-3 w-3 text-gray-600" />;
      default: return <Minus className="h-3 w-3 text-gray-600" />;
    }
  };

  const getTrendBadgeVariant = (direction: string) => {
    switch (direction) {
      case 'up': return 'default';
      case 'down': return 'destructive';
      case 'stable': return 'secondary';
      default: return 'outline';
    }
  };

  const formatMetricName = (metric: string) => {
    return metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const getChartColors = () => [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'
  ];

  // Prepare chart data by combining historical and current data
  const chartData = [...historicalData];
  if (currentData) {
    chartData.push(currentData);
  }

  // Format data for Recharts
  const formattedChartData = chartData.map(item => ({
    date: item.date.toLocaleDateString(),
    ...item.metrics,
  }));

  if (isLoading) {
    return (
      <Card data-testid="historical-comparison-loading">
        <CardHeader>
          <CardTitle>Historical Comparison</CardTitle>
          <CardDescription>Loading historical trend data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="historical-comparison-error">
        <CardHeader>
          <CardTitle>Historical Comparison</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4">
            <p className="text-red-600 mb-2">Failed to load historical data</p>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchHistoricalData}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="historical-comparison-chart">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Historical Comparison - {dataType.charAt(0).toUpperCase() + dataType.slice(1)}
            </CardTitle>
            <CardDescription>
              Trend analysis and performance metrics over time
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedTimeRange} onValueChange={(value: '1w' | '3m' | '6m' | '9m' | '1y') => setSelectedTimeRange(value)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1w">1w</SelectItem>
                <SelectItem value="3m">3m</SelectItem>
                <SelectItem value="6m">6m</SelectItem>
                <SelectItem value="9m">9m</SelectItem>
                <SelectItem value="1y">1y</SelectItem>
              </SelectContent>
            </Select>
            <Select value={chartType} onValueChange={(value: 'line' | 'area') => setChartType(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="area">Area</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchHistoricalData}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Trend Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-lg font-bold">{analytics.averageChange || 0}%</div>
              <div className="text-sm font-medium">Average Change</div>
              <div className="text-xs text-muted-foreground">Period over period</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-lg font-bold">{analytics.volatilityScore || 0}</div>
              <div className="text-sm font-medium">Volatility Score</div>
              <div className="text-xs text-muted-foreground">Stability indicator</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-lg font-bold capitalize">{analytics.trendDirection || 'stable'}</div>
              <div className="text-sm font-medium">Overall Trend</div>
              <div className="text-xs text-muted-foreground">General direction</div>
            </div>
          </div>

          {/* Metric Trends */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Metric Trends</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {trends.map((trend, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getTrendIcon(trend.direction)}
                    <span className="text-sm font-medium">{formatMetricName(trend.metric)}</span>
                  </div>
                  <Badge variant={getTrendBadgeVariant(trend.direction)} className="text-xs">
                    {trend.change > 0 ? '+' : ''}{trend.change}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Historical Chart */}
          {formattedChartData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Historical Performance ({timeRange})</h4>
                <div className="flex items-center gap-2">
                  <Select 
                    value={selectedMetrics[0] || ''} 
                    onValueChange={(value) => {
                      setSelectedMetrics([value]);
                      onMetricSelect?.(value);
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select metric" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentData && Object.keys(currentData.metrics).map((metric) => (
                        <SelectItem key={metric} value={metric}>
                          {formatMetricName(metric)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                {chartType === 'line' ? (
                  <LineChart data={formattedChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {selectedMetrics.map((metric, index) => (
                      <Line 
                        key={metric}
                        type="monotone" 
                        dataKey={metric} 
                        stroke={getChartColors()[index % getChartColors().length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name={formatMetricName(metric)}
                      />
                    ))}
                  </LineChart>
                ) : (
                  <AreaChart data={formattedChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {selectedMetrics.map((metric, index) => (
                      <Area 
                        key={metric}
                        type="monotone" 
                        dataKey={metric} 
                        stroke={getChartColors()[index % getChartColors().length]}
                        fill={getChartColors()[index % getChartColors().length]}
                        fillOpacity={0.3}
                        name={formatMetricName(metric)}
                      />
                    ))}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
          
          {/* Period Comparison */}
          {analytics.periodComparison && (
            <div className="p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium text-sm mb-3">Period Comparison</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold">{analytics.periodComparison.currentPeriodAvg}</div>
                  <div className="text-xs text-muted-foreground">Current Period</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{analytics.periodComparison.comparisonPeriodAvg}</div>
                  <div className="text-xs text-muted-foreground">Previous Period</div>
                </div>
                <div>
                  <div className={`text-lg font-bold ${analytics.periodComparison.percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analytics.periodComparison.percentChange > 0 ? '+' : ''}{analytics.periodComparison.percentChange}%
                  </div>
                  <div className="text-xs text-muted-foreground">Change</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}