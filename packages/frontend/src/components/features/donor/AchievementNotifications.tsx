'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Trophy, 
  Star,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface AchievementNotification {
  id: string;
  achievementId: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  earnedAt: Date;
  responseId?: string;
  verificationId?: string;
  isRead: boolean;
  showConfetti?: boolean;
}

interface AchievementNotificationsProps {
  donorId?: string;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  maxVisible?: number;
  autoHideAfter?: number; // seconds
}

export function AchievementNotifications({
  donorId,
  position = 'top-right',
  maxVisible = 3,
  autoHideAfter = 10
}: AchievementNotificationsProps) {
  const [notifications, setNotifications] = useState<AchievementNotification[]>([]);
  const [confettiActive, setConfettiActive] = useState<string | null>(null);

  // Position classes
  const getPositionClasses = () => {
    const base = 'fixed z-50 space-y-2 w-80 max-w-sm';
    switch (position) {
      case 'top-right': return `${base} top-4 right-4`;
      case 'bottom-right': return `${base} bottom-4 right-4`;
      case 'top-left': return `${base} top-4 left-4`;
      case 'bottom-left': return `${base} bottom-4 left-4`;
      default: return `${base} top-4 right-4`;
    }
  };

  // Listen for achievement events
  useEffect(() => {
    const handleAchievementEarned = (event: CustomEvent) => {
      const { achievements, responseId, verificationId } = event.detail;
      
      const newNotifications = achievements.map((achievement: any) => ({
        id: `${achievement.id}-${Date.now()}`,
        achievementId: achievement.id,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.badgeIcon || '🏆',
        category: achievement.category,
        earnedAt: new Date(achievement.unlockedAt),
        responseId,
        verificationId,
        isRead: false,
        showConfetti: achievement.category === 'IMPACT' || achievement.type?.includes('MILESTONE')
      }));

      setNotifications(prev => [...newNotifications, ...prev].slice(0, maxVisible));
      
      // Trigger confetti for major achievements
      const majorAchievement = newNotifications.find(n => n.showConfetti);
      if (majorAchievement) {
        setConfettiActive(majorAchievement.id);
        setTimeout(() => setConfettiActive(null), 3000);
      }
    };

    // Add event listener
    window.addEventListener('donor-achievement-earned', handleAchievementEarned as EventListener);

    return () => {
      window.removeEventListener('donor-achievement-earned', handleAchievementEarned as EventListener);
    };
  }, [maxVisible]);

  // Auto-hide notifications
  useEffect(() => {
    if (autoHideAfter > 0) {
      const timer = setTimeout(() => {
        setNotifications(prev => prev.slice(0, -1));
      }, autoHideAfter * 1000);

      return () => clearTimeout(timer);
    }
  }, [notifications, autoHideAfter]);

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  };

  const viewVerificationDetails = (responseId?: string) => {
    if (responseId) {
      // Navigate to response verification details
      window.open(`/dashboard/monitoring/responses/${responseId}`, '_blank');
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={getPositionClasses()}>
      {/* Confetti Effect */}
      {confettiActive && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="animate-bounce">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Notification Cards */}
      {notifications.map((notification) => (
        <Card 
          key={notification.id}
          className={`transform transition-all duration-300 ease-in-out ${
            notification.id === confettiActive ? 'scale-105 shadow-lg' : 'hover:shadow-md'
          } ${!notification.isRead ? 'border-yellow-300 bg-yellow-50' : 'bg-white'}`}
          onClick={() => markAsRead(notification.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                {/* Achievement Icon */}
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-lg ${
                    notification.id === confettiActive ? 'animate-pulse' : ''
                  }`}>
                    {notification.icon}
                  </div>
                </div>

                {/* Achievement Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <Trophy className="w-4 h-4 text-yellow-600" />
                    <h3 className="font-semibold text-gray-900 text-sm">
                      Achievement Unlocked!
                    </h3>
                  </div>
                  
                  <h4 className="font-medium text-gray-800 mb-1">
                    {notification.title}
                  </h4>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {notification.description}
                  </p>

                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="outline" 
                      className="text-xs bg-yellow-100 border-yellow-300"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      {notification.category}
                    </Badge>
                    
                    <span className="text-xs text-gray-500">
                      {notification.earnedAt.toLocaleDateString()}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 mt-3">
                    {notification.responseId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          viewVerificationDetails(notification.responseId);
                        }}
                        className="text-xs"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Dismiss Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissNotification(notification.id);
                }}
                className="flex-shrink-0 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Helper function to trigger achievement notifications
export const triggerAchievementNotification = (
  achievements: any[],
  responseId?: string,
  verificationId?: string
) => {
  const event = new CustomEvent('donor-achievement-earned', {
    detail: {
      achievements,
      responseId,
      verificationId,
      timestamp: new Date().toISOString()
    }
  });
  
  window.dispatchEvent(event);
};