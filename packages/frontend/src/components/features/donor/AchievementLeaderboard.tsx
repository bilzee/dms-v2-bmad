'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Trophy, 
  Crown, 
  Medal, 
  Star,
  TrendingUp,
  Users,
  Shield,
  Target,
  Heart,
  Eye,
  EyeOff
} from 'lucide-react';

interface LeaderboardEntry {
  donorId: string;
  donorName: string;
  donorOrganization: string;
  achievements: number;
  verifiedDeliveries: number;
  verificationRate: number;
  totalBeneficiaries: number;
  score: number;
  recentAchievements: Array<{
    title: string;
    icon: string;
    earnedAt: Date;
  }>;
  isCurrentUser: boolean;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  currentUserRank: number | null;
  metadata: {
    category: string;
    timeframe: string;
    totalParticipants: number;
    generatedAt: string;
  };
}

export function AchievementLeaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [category, setCategory] = useState<string>('OVERALL');
  const [timeframe, setTimeframe] = useState<string>('90');
  const [includePrivate, setIncludePrivate] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        category,
        timeframe,
        includePrivate: includePrivate.toString(),
        limit: '20'
      });

      const response = await fetch(`/api/v1/donors/leaderboard?${params}`);
      const result = await response.json();

      if (result.success) {
        setData({
          ...result.data,
          leaderboard: result.data.leaderboard.map((entry: any) => ({
            ...entry,
            recentAchievements: entry.recentAchievements.map((achievement: any) => ({
              ...achievement,
              earnedAt: new Date(achievement.earnedAt)
            }))
          }))
        });
      } else {
        setError(result.message || 'Failed to fetch leaderboard');
      }
    } catch (err) {
      setError('Failed to fetch leaderboard data');
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [category, timeframe, includePrivate]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <div className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-600">#{rank}</div>;
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'VERIFICATION': return <Shield className="w-4 h-4" />;
      case 'DELIVERY': return <Target className="w-4 h-4" />;
      case 'IMPACT': return <Heart className="w-4 h-4" />;
      default: return <Trophy className="w-4 h-4" />;
    }
  };

  const getCategoryDescription = (cat: string) => {
    switch (cat) {
      case 'VERIFICATION': return 'Ranked by verification success rate';
      case 'DELIVERY': return 'Ranked by verified delivery count';
      case 'IMPACT': return 'Ranked by beneficiaries helped';
      default: return 'Ranked by overall achievement score';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading leaderboard...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchLeaderboard} className="mt-2">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Leaderboard Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-6 md:items-center">
            {/* Category Selection */}
            <div className="flex flex-wrap gap-2">
              {['OVERALL', 'VERIFICATION', 'DELIVERY', 'IMPACT'].map(cat => (
                <Button
                  key={cat}
                  variant={category === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategory(cat)}
                >
                  {getCategoryIcon(cat)}
                  <span className="ml-1 capitalize">{cat.toLowerCase()}</span>
                </Button>
              ))}
            </div>

            {/* Timeframe Selection */}
            <div className="flex flex-wrap gap-2">
              {[
                { value: '30', label: '30 Days' },
                { value: '90', label: '90 Days' },
                { value: 'year', label: 'This Year' },
                { value: 'all', label: 'All Time' }
              ].map(option => (
                <Button
                  key={option.value}
                  variant={timeframe === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeframe(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            {/* Privacy Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="include-private"
                checked={includePrivate}
                onCheckedChange={setIncludePrivate}
              />
              <label htmlFor="include-private" className="text-sm text-gray-700 flex items-center">
                {includePrivate ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
                Show All
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="w-5 h-5 mr-2" />
            Achievement Leaderboard
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {getCategoryDescription(category)} • {data?.metadata.totalParticipants} participants
          </p>
        </CardHeader>

        <CardContent>
          {/* Current User Rank (if not in top entries) */}
          {data?.currentUserRank && data.currentUserRank > 20 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-blue-600 font-bold">
                    #{data.currentUserRank}
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">Your Rank</p>
                    <p className="text-xs text-blue-700">
                      {data.currentUserRank - 20} positions to reach top 20
                    </p>
                  </div>
                </div>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          )}

          {/* Leaderboard Entries */}
          <div className="space-y-2">
            {data?.leaderboard.map((entry, index) => {
              const rank = index + 1;
              const isTopThree = rank <= 3;
              
              return (
                <Card 
                  key={entry.donorId} 
                  className={`transition-all ${
                    entry.isCurrentUser 
                      ? 'border-blue-300 bg-blue-50' 
                      : isTopThree 
                        ? 'border-yellow-200 bg-yellow-50' 
                        : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      {/* Rank and Donor Info */}
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex items-center justify-center w-10 h-10">
                          {getRankIcon(rank)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {entry.donorName}
                            </h3>
                            {entry.isCurrentUser && (
                              <Badge variant="secondary" className="text-xs">You</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {entry.donorOrganization}
                          </p>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-gray-900">{entry.score}</div>
                          <div className="text-xs text-gray-600">Score</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="font-bold text-blue-600">{entry.achievements}</div>
                          <div className="text-xs text-gray-600">Badges</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="font-bold text-green-600">{entry.verifiedDeliveries}</div>
                          <div className="text-xs text-gray-600">Verified</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="font-bold text-purple-600">{entry.verificationRate}%</div>
                          <div className="text-xs text-gray-600">Rate</div>
                        </div>

                        {category === 'IMPACT' && (
                          <div className="text-center">
                            <div className="font-bold text-red-600">{entry.totalBeneficiaries}</div>
                            <div className="text-xs text-gray-600">Helped</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recent Achievements */}
                    {entry.recentAchievements.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-xs font-medium text-gray-700">Recent:</span>
                          <div className="flex space-x-1">
                            {entry.recentAchievements.slice(0, 3).map((achievement, idx) => (
                              <Badge 
                                key={idx}
                                variant="outline" 
                                className="text-xs bg-yellow-50 border-yellow-200"
                                title={`${achievement.title} - ${achievement.earnedAt.toLocaleDateString()}`}
                              >
                                {achievement.icon}
                              </Badge>
                            ))}
                            {entry.recentAchievements.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{entry.recentAchievements.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Empty State */}
          {data?.leaderboard.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                No participants found for the selected criteria
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Try adjusting the timeframe or category filters
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard Information */}
      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <h3 className="font-medium text-gray-900 mb-2">How the Leaderboard Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-800 mb-1">Scoring System</h4>
                <ul className="space-y-1 text-left">
                  <li>• Verification Rate: 30% weight</li>
                  <li>• Verified Deliveries: 40% weight</li>
                  <li>• Achievement Count: 30% weight</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-1">Privacy Controls</h4>
                <ul className="space-y-1 text-left">
                  <li>• Participation is optional</li>
                  <li>• Toggle visibility in your profile</li>
                  <li>• Only verified achievements count</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Last updated: {data?.metadata.generatedAt ? new Date(data.metadata.generatedAt).toLocaleString() : 'Unknown'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}