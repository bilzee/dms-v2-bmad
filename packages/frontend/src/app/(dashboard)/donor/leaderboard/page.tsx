'use client';

import React from 'react';
import { AchievementLeaderboard } from '@/components/features/donor/AchievementLeaderboard';
import { AchievementNotifications } from '@/components/features/donor/AchievementNotifications';
import { ConnectionStatusHeader } from '@/components/shared/ConnectionStatusHeader';
import { Trophy } from 'lucide-react';

export default function DonorLeaderboardPage() {
  return (
    <div className="p-6 space-y-6">
      <ConnectionStatusHeader />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Trophy className="w-8 h-8 mr-3 text-yellow-600" />
            Achievement Leaderboard
          </h1>
          <p className="text-gray-600 mt-1">
            Compare your verified delivery achievements with other donors
          </p>
        </div>
      </div>

      {/* Leaderboard */}
      <AchievementLeaderboard />

      {/* Achievement Notifications */}
      <AchievementNotifications />
    </div>
  );
}