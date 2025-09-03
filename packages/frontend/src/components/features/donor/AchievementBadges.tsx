'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Award, 
  Trophy, 
  Star, 
  Target, 
  Users, 
  Calendar,
  TrendingUp,
  Zap,
  Heart,
  CheckCircle,
  Clock
} from 'lucide-react';

interface Achievement {
  id: string;
  donorId: string;
  type: string;
  title: string;
  description: string;
  earnedAt: Date;
  category: 'delivery' | 'accuracy' | 'impact' | 'consistency';
  badgeIcon: string;
  isRecent: boolean;
}

interface NextAchievement {
  type: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  category: 'delivery' | 'accuracy' | 'impact' | 'consistency';
  estimatedCompletion: string;
}

interface AchievementStats {
  total: number;
  recent: number;
  byCategory: {
    delivery: number;
    accuracy: number;
    impact: number;
    consistency: number;
  };
}

export function AchievementBadges() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [nextAchievements, setNextAchievements] = useState<NextAchievement[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAchievements = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/v1/donors/achievements');
        const result = await response.json();

        if (result.success) {
          setAchievements(result.data.achievements.map((a: any) => ({
            ...a,
            earnedAt: new Date(a.earnedAt)
          })));
          setNextAchievements(result.data.nextAchievements);
          setStats(result.data.stats);
        } else {
          setError(result.message || 'Failed to fetch achievements');
        }
      } catch (err) {
        setError('Failed to fetch achievements');
        console.error('Error fetching achievements:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'delivery': return <Target className="w-4 h-4" />;
      case 'accuracy': return <CheckCircle className="w-4 h-4" />;
      case 'impact': return <Heart className="w-4 h-4" />;
      case 'consistency': return <TrendingUp className="w-4 h-4" />;
      default: return <Award className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'delivery': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'accuracy': return 'bg-green-100 text-green-800 border-green-200';
      case 'impact': return 'bg-red-100 text-red-800 border-red-200';
      case 'consistency': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgressColor = (progress: number, target: number) => {
    const percentage = (progress / target) * 100;
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading achievements...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Achievement Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <p className="text-sm text-gray-600">Total Achievements</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.recent}</div>
              <p className="text-sm text-gray-600">Recent (30 days)</p>
            </CardContent>
          </Card>

          {Object.entries(stats.byCategory).map(([category, count]) => (
            <Card key={category}>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-1">
                  {getCategoryIcon(category)}
                </div>
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <p className="text-sm text-gray-600 capitalize">{category}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              All Achievements
            </Button>
            {['delivery', 'accuracy', 'impact', 'consistency'].map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="capitalize"
              >
                {getCategoryIcon(category)}
                <span className="ml-1">{category}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Earned Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="w-5 h-5 mr-2" />
            Earned Achievements
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {selectedCategory === 'all' 
              ? `Showing all ${filteredAchievements.length} achievements`
              : `Showing ${filteredAchievements.length} ${selectedCategory} achievements`
            }
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.map((achievement) => (
              <Card key={achievement.id} className="relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-2xl">{achievement.badgeIcon}</div>
                    <div className="flex flex-col items-end">
                      <Badge 
                        variant="outline" 
                        className={`${getCategoryColor(achievement.category)} mb-1`}
                      >
                        {getCategoryIcon(achievement.category)}
                        <span className="ml-1 capitalize">{achievement.category}</span>
                      </Badge>
                      {achievement.isRecent && (
                        <Badge variant="secondary" className="text-xs">
                          New!
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {achievement.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {achievement.description}
                  </p>
                  
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="w-3 h-3 mr-1" />
                    Earned {achievement.earnedAt.toLocaleDateString()}
                  </div>
                </CardContent>
                
                {achievement.isRecent && (
                  <div className="absolute top-0 right-0 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-green-500">
                    <div className="absolute -top-4 -right-1 text-white text-xs">
                      <Star className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {filteredAchievements.length === 0 && (
            <div className="text-center py-8">
              <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                {selectedCategory === 'all' 
                  ? "No achievements earned yet. Keep making deliveries to unlock your first badge!"
                  : `No ${selectedCategory} achievements yet. Keep working towards your goals!`
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Achievements (Progress Towards) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Progress Towards Next Achievements
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Track your progress towards unlocking new achievements
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {nextAchievements.map((next, index) => {
              const progressPercentage = (next.progress / next.target) * 100;
              
              return (
                <Card key={index} className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {next.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {next.description}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={getCategoryColor(next.category)}
                        >
                          {getCategoryIcon(next.category)}
                          <span className="ml-1 capitalize">{next.category}</span>
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {next.progress}/{next.target}
                        </div>
                        <div className="text-xs text-gray-500">
                          {progressPercentage.toFixed(0)}% complete
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{progressPercentage.toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={progressPercentage} 
                        className="h-2"
                      />
                    </div>
                    
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      Estimated completion: {next.estimatedCompletion}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Achievement Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Tips to Earn More Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <Target className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-medium text-blue-900">Delivery Excellence</h3>
                  <p className="text-sm text-blue-800">
                    Focus on timely deliveries and accurate quantities to unlock delivery and accuracy achievements.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <Heart className="w-5 h-5 text-red-600 mt-1" />
                <div>
                  <h3 className="font-medium text-red-900">Maximize Impact</h3>
                  <p className="text-sm text-red-800">
                    Increase the number of beneficiaries helped per delivery to earn impact-focused achievements.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                <div>
                  <h3 className="font-medium text-green-900">Maintain Quality</h3>
                  <p className="text-sm text-green-800">
                    Consistent high-quality deliveries over time will unlock valuable consistency achievements.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <TrendingUp className="w-5 h-5 text-purple-600 mt-1" />
                <div>
                  <h3 className="font-medium text-purple-900">Stay Active</h3>
                  <p className="text-sm text-purple-800">
                    Regular participation and meeting commitments will help you unlock milestone achievements.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}