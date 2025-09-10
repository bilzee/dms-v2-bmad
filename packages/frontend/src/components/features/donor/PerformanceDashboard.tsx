'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PerformanceMetrics } from './PerformanceMetrics';
import { PerformanceTrends } from './PerformanceTrends';
import { ImpactVisualization } from './ImpactVisualization';
import { AchievementBadges } from './AchievementBadges';
import { 
  Download, 
  Calendar,
  Filter,
  RefreshCw,
  TrendingUp,
  Award,
  Target,
  Users
} from 'lucide-react';

interface PerformanceDashboardProps {
  className?: string;
}

export function PerformanceDashboard({ className }: PerformanceDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'30' | '90' | '365' | 'all'>('90');
  const [selectedResponseType, setSelectedResponseType] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'impact' | 'achievements'>('overview');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data - in real implementation, this would come from API calls
  const mockMetrics = {
    onTimeDeliveryRate: 87.5,
    quantityAccuracyRate: 92.3,
    performanceScore: 89.2,
    totalCommitments: 24,
    completedDeliveries: 21,
    beneficiariesHelped: 1250,
    responseTypesServed: ['MEDICAL_SUPPLIES', 'FOOD_WATER', 'SHELTER'],
    lastUpdated: new Date(),
  };

  const mockTrends = {
    onTimeDeliveryRate: 2.3,
    quantityAccuracyRate: -1.2,
    performanceScore: 1.8,
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'json') => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        format,
        period: selectedPeriod,
        includeHistory: 'true',
        includeAchievements: 'true',
        includeImpact: 'true',
      });

      const response = await fetch(`/api/v1/donors/performance/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `donor-performance-${selectedPeriod}days.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      // In a real app, show error toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    // Mock refresh - in real implementation, refetch data
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 75) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
          <p className="text-gray-600">Track your delivery performance and impact metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Select value="csv" onValueChange={(value) => handleExport(value as 'csv' | 'pdf' | 'json')}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Export" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <Download className="w-4 h-4 mr-2" />
                CSV
              </SelectItem>
              <SelectItem value="pdf">
                <Download className="w-4 h-4 mr-2" />
                PDF
              </SelectItem>
              <SelectItem value="json">
                <Download className="w-4 h-4 mr-2" />
                JSON
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Performance Score Highlight */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-2">Overall Performance Score</h2>
              <div className="flex items-center space-x-3">
                <div className="text-4xl font-bold">{mockMetrics.performanceScore}</div>
                <Badge className={`${getScoreColor(mockMetrics.performanceScore)} border`}>
                  {getScoreLabel(mockMetrics.performanceScore)}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Based on delivery performance, accuracy, and impact metrics
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Trend (90 days)</div>
              <div className="flex items-center text-green-600 font-medium">
                <TrendingUp className="w-4 h-4 mr-1" />
                +1.8%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Time Period:</span>
              <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Response Type:</span>
              <Select value={selectedResponseType} onValueChange={setSelectedResponseType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="MEDICAL_SUPPLIES">Medical Supplies</SelectItem>
                  <SelectItem value="FOOD_WATER">Food & Water</SelectItem>
                  <SelectItem value="SHELTER">Shelter</SelectItem>
                  <SelectItem value="TRANSPORTATION">Transportation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Location:</span>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="northern">Northern Districts</SelectItem>
                  <SelectItem value="coastal">Coastal Areas</SelectItem>
                  <SelectItem value="mountain">Mountain Communities</SelectItem>
                  <SelectItem value="urban">Urban Centers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b">
        {[
          { key: 'overview', label: 'Overview', icon: Target },
          { key: 'trends', label: 'Trends', icon: TrendingUp },
          { key: 'impact', label: 'Impact', icon: Users },
          { key: 'achievements', label: 'Achievements', icon: Award },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'overview' && (
          <PerformanceMetrics 
            metrics={mockMetrics} 
            trends={mockTrends}
          />
        )}
        
        {activeTab === 'trends' && (
          <PerformanceTrends 
            period={selectedPeriod === 'all' ? '365' : selectedPeriod as any}
            responseType={selectedResponseType}
          />
        )}
        
        {activeTab === 'impact' && (
          <ImpactVisualization 
            period={selectedPeriod}
            responseType={selectedResponseType}
            region={selectedLocation}
          />
        )}
        
        {activeTab === 'achievements' && (
          <AchievementBadges />
        )}
      </div>
    </div>
  );
}