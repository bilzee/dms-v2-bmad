'use client';

import React from 'react';
import { AchievementBadges } from '@/components/features/donor/AchievementBadges';
import { AchievementLeaderboard } from '@/components/features/donor/AchievementLeaderboard';
import { AchievementNotifications } from '@/components/features/donor/AchievementNotifications';
import { ConnectionStatusHeader } from '@/components/shared/ConnectionStatusHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, Trophy, Target } from 'lucide-react';

export default function DonorAchievementsPage() {
  return (
    <div className="p-6 space-y-6">
      <ConnectionStatusHeader />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Award className="w-8 h-8 mr-3 text-yellow-600" />
            Achievement Center
          </h1>
          <p className="text-gray-600 mt-1">
            Track your verified delivery achievements and compare with other donors
          </p>
        </div>
      </div>

      {/* Achievement Tabs */}
      <Tabs defaultValue="my-achievements" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-achievements" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            My Achievements
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Leaderboard
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-achievements" className="space-y-6">
          <AchievementBadges />
        </TabsContent>
        
        <TabsContent value="leaderboard" className="space-y-6">
          <AchievementLeaderboard />
        </TabsContent>
      </Tabs>

      {/* Achievement Notifications */}
      <AchievementNotifications />
    </div>
  );
}