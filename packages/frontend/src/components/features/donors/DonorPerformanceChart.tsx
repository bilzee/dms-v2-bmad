'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Award,
  Users,
  Package
} from 'lucide-react';
import { Donor, CommitmentStatus } from '@dms/shared';

interface DonorPerformanceChartProps {
  donors: Donor[];
}

export function DonorPerformanceChart({ donors }: DonorPerformanceChartProps) {
  // Calculate performance metrics
  const averagePerformance = donors.length > 0 
    ? Math.round(donors.reduce((sum, donor) => sum + donor.performanceScore, 0) / donors.length)
    : 0;

  const topPerformers = donors
    .filter(d => d.performanceScore >= 90)
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .slice(0, 5);

  const recentlyActive = donors
    .filter(d => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return new Date(d.updatedAt) >= oneWeekAgo;
    })
    .length;

  const performanceDistribution = {
    excellent: donors.filter(d => d.performanceScore >= 90).length,
    good: donors.filter(d => d.performanceScore >= 75 && d.performanceScore < 90).length,
    fair: donors.filter(d => d.performanceScore >= 60 && d.performanceScore < 75).length,
    poor: donors.filter(d => d.performanceScore < 60).length,
  };

  const getPerformanceTrend = (donor: Donor) => {
    // In a real implementation, this would compare current vs historical performance
    // For now, we'll simulate based on performance score
    if (donor.performanceScore >= 85) return 'up';
    if (donor.performanceScore <= 65) return 'down';
    return 'stable';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return <Minus className="h-3 w-3 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-blue-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (donors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Donor Performance</CardTitle>
          <CardDescription>Performance metrics and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No donor data available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Award className="h-5 w-5" />
          <span>Donor Performance</span>
        </CardTitle>
        <CardDescription>
          Performance metrics and trends across all donors
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overview Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{averagePerformance}%</div>
            <p className="text-sm text-gray-600">Average Performance</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{topPerformers.length}</div>
            <p className="text-sm text-gray-600">Top Performers</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{recentlyActive}</div>
            <p className="text-sm text-gray-600">Active This Week</p>
          </div>
        </div>

        {/* Performance Distribution */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Performance Distribution</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Excellent (90-100%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">{performanceDistribution.excellent}</span>
                <div className="w-16">
                  <Progress 
                    value={(performanceDistribution.excellent / donors.length) * 100} 
                    className="h-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Good (75-89%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">{performanceDistribution.good}</span>
                <div className="w-16">
                  <Progress 
                    value={(performanceDistribution.good / donors.length) * 100} 
                    className="h-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>Fair (60-74%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">{performanceDistribution.fair}</span>
                <div className="w-16">
                  <Progress 
                    value={(performanceDistribution.fair / donors.length) * 100} 
                    className="h-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Needs Attention (&lt;60%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">{performanceDistribution.poor}</span>
                <div className="w-16">
                  <Progress 
                    value={(performanceDistribution.poor / donors.length) * 100} 
                    className="h-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center space-x-2">
              <Award className="h-4 w-4 text-yellow-600" />
              <span>Top Performers</span>
            </h4>
            
            <div className="space-y-2">
              {topPerformers.map((donor, index) => {
                const trend = getPerformanceTrend(donor);
                const activeCommitments = donor.commitments.filter(c => 
                  c.status === CommitmentStatus.PLANNED || c.status === CommitmentStatus.IN_PROGRESS
                ).length;

                return (
                  <div 
                    key={donor.id} 
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-6 h-6 bg-yellow-100 text-yellow-600 rounded-full text-xs font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{donor.name}</p>
                        <p className="text-xs text-gray-600">{donor.organization}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-medium">{donor.performanceScore}%</span>
                          {getTrendIcon(trend)}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Package className="h-3 w-3" />
                          <span>{activeCommitments} active</span>
                        </div>
                      </div>
                      <div className="w-16">
                        <Progress 
                          value={donor.performanceScore} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Performance Insights */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="font-medium text-sm text-blue-900 mb-2">Performance Insights</h4>
          <div className="space-y-1 text-xs text-blue-800">
            <p>• {performanceDistribution.excellent} donors are performing excellently (90%+)</p>
            <p>• {performanceDistribution.poor > 0 ? `${performanceDistribution.poor} donors need attention` : 'All donors are performing above 60%'}</p>
            <p>• Average performance is {averagePerformance >= 80 ? 'strong' : averagePerformance >= 70 ? 'good' : 'needs improvement'} at {averagePerformance}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}