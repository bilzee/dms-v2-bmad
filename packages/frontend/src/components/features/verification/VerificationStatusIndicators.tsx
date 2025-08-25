'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { VerificationStatus, AssessmentType } from '@dms/shared';

interface StatusBadgeProps {
  status: VerificationStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const getStatusConfig = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.PENDING:
        return {
          variant: 'secondary' as const,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          label: 'Pending',
          icon: '⏳',
        };
      case VerificationStatus.VERIFIED:
        return {
          variant: 'default' as const,
          color: 'bg-green-100 text-green-800 border-green-200',
          label: 'Verified',
          icon: '✅',
        };
      case VerificationStatus.AUTO_VERIFIED:
        return {
          variant: 'outline' as const,
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          label: 'Auto-Verified',
          icon: '🤖',
        };
      case VerificationStatus.REJECTED:
        return {
          variant: 'destructive' as const,
          color: 'bg-red-100 text-red-800 border-red-200',
          label: 'Rejected',
          icon: '❌',
        };
      default:
        return {
          variant: 'secondary' as const,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          label: 'Unknown',
          icon: '❓',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium transition-all',
        config.color,
        className
      )}
      aria-label={`Verification status: ${config.label}`}
    >
      <span className="text-xs" aria-hidden="true">
        {config.icon}
      </span>
      {config.label}
    </Badge>
  );
};

interface PriorityIndicatorProps {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  className?: string;
}

export const PriorityIndicator: React.FC<PriorityIndicatorProps> = ({ priority, className }) => {
  const getPriorityConfig = (priority: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (priority) {
      case 'HIGH':
        return {
          color: 'bg-red-500',
          label: 'High Priority',
          pulseColor: 'bg-red-400',
        };
      case 'MEDIUM':
        return {
          color: 'bg-yellow-500',
          label: 'Medium Priority',
          pulseColor: 'bg-yellow-400',
        };
      case 'LOW':
        return {
          color: 'bg-green-500',
          label: 'Low Priority',
          pulseColor: 'bg-green-400',
        };
    }
  };

  const config = getPriorityConfig(priority);

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <div
        className={cn(
          'h-3 w-3 rounded-full',
          config.color,
          priority === 'HIGH' && 'animate-pulse'
        )}
        title={config.label}
        aria-label={config.label}
      />
      {priority === 'HIGH' && (
        <div className={cn('absolute inset-0 h-3 w-3 rounded-full animate-ping', config.pulseColor)} />
      )}
    </div>
  );
};

interface AssessmentTypeIndicatorProps {
  type: AssessmentType;
  className?: string;
  showLabel?: boolean;
}

export const AssessmentTypeIndicator: React.FC<AssessmentTypeIndicatorProps> = ({ 
  type, 
  className,
  showLabel = true 
}) => {
  const getTypeConfig = (type: AssessmentType) => {
    switch (type) {
      case AssessmentType.HEALTH:
        return {
          color: 'bg-red-100 text-red-700 border-red-200',
          icon: '🏥',
          label: 'Health',
        };
      case AssessmentType.WASH:
        return {
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          icon: '💧',
          label: 'WASH',
        };
      case AssessmentType.SHELTER:
        return {
          color: 'bg-orange-100 text-orange-700 border-orange-200',
          icon: '🏠',
          label: 'Shelter',
        };
      case AssessmentType.FOOD:
        return {
          color: 'bg-green-100 text-green-700 border-green-200',
          icon: '🍽️',
          label: 'Food',
        };
      case AssessmentType.SECURITY:
        return {
          color: 'bg-purple-100 text-purple-700 border-purple-200',
          icon: '🛡️',
          label: 'Security',
        };
      case AssessmentType.POPULATION:
        return {
          color: 'bg-teal-100 text-teal-700 border-teal-200',
          icon: '👥',
          label: 'Population',
        };
      case AssessmentType.PRELIMINARY:
        return {
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: '📋',
          label: 'Preliminary',
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: '❓',
          label: 'Unknown',
        };
    }
  };

  const config = getTypeConfig(type);

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border',
        config.color,
        className
      )}
      aria-label={`Assessment type: ${config.label}`}
    >
      <span className="text-xs" aria-hidden="true">
        {config.icon}
      </span>
      {showLabel && config.label}
    </Badge>
  );
};

interface NotificationCounterProps {
  count: number;
  type?: 'pending' | 'attention' | 'high-priority';
  className?: string;
}

export const NotificationCounter: React.FC<NotificationCounterProps> = ({ 
  count, 
  type = 'pending',
  className 
}) => {
  if (count === 0) return null;

  const getCounterConfig = (type: 'pending' | 'attention' | 'high-priority') => {
    switch (type) {
      case 'pending':
        return {
          color: 'bg-blue-500 text-white',
          label: 'pending assessments',
        };
      case 'attention':
        return {
          color: 'bg-red-500 text-white animate-pulse',
          label: 'assessments requiring attention',
        };
      case 'high-priority':
        return {
          color: 'bg-orange-500 text-white',
          label: 'high priority assessments',
        };
    }
  };

  const config = getCounterConfig(type);

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-xs font-bold',
        config.color,
        className
      )}
      aria-label={`${count} ${config.label}`}
      title={`${count} ${config.label}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};

interface AttentionIndicatorProps {
  requiresAttention: boolean;
  feedbackCount?: number;
  lastFeedbackAt?: Date;
  className?: string;
}

export const AttentionIndicator: React.FC<AttentionIndicatorProps> = ({
  requiresAttention,
  feedbackCount = 0,
  lastFeedbackAt,
  className,
}) => {
  if (!requiresAttention && feedbackCount === 0) return null;

  const getAttentionLevel = () => {
    if (requiresAttention) return 'urgent';
    if (feedbackCount > 0) return 'feedback';
    return 'normal';
  };

  const attentionLevel = getAttentionLevel();

  const getAttentionConfig = (level: string) => {
    switch (level) {
      case 'urgent':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          icon: '⚠️',
          label: 'Requires immediate attention',
          animate: true,
        };
      case 'feedback':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          icon: '💬',
          label: `${feedbackCount} feedback(s) received`,
          animate: false,
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          icon: 'ℹ️',
          label: 'Information available',
          animate: false,
        };
    }
  };

  const config = getAttentionConfig(attentionLevel);
  const timeAgo = lastFeedbackAt ? getTimeAgo(lastFeedbackAt) : '';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs',
        config.color,
        config.bgColor,
        config.animate && 'animate-pulse',
        className
      )}
      title={`${config.label}${timeAgo ? ` (${timeAgo})` : ''}`}
      aria-label={config.label}
    >
      <span className="text-xs" aria-hidden="true">
        {config.icon}
      </span>
      {feedbackCount > 0 && (
        <span className="font-medium">{feedbackCount}</span>
      )}
    </div>
  );
};

// Utility function to get time ago string
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${Math.max(1, diffMinutes)} minute${diffMinutes > 1 ? 's' : ''} ago`;
  }
}

interface StatusChangeAnimationProps {
  oldStatus: VerificationStatus;
  newStatus: VerificationStatus;
  onAnimationComplete?: () => void;
  className?: string;
}

export const StatusChangeAnimation: React.FC<StatusChangeAnimationProps> = ({
  oldStatus,
  newStatus,
  onAnimationComplete,
  className,
}) => {
  const [isAnimating, setIsAnimating] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
      onAnimationComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  if (!isAnimating) {
    return <StatusBadge status={newStatus} className={className} />;
  }

  return (
    <div className={cn('relative inline-block', className)}>
      <div className="transition-all duration-1000 transform scale-110 opacity-0">
        <StatusBadge status={oldStatus} />
      </div>
      <div className="absolute inset-0 transition-all duration-1000 transform scale-100 opacity-100">
        <StatusBadge status={newStatus} />
      </div>
    </div>
  );
};

// Combined status display component
interface AssessmentStatusDisplayProps {
  verificationStatus: VerificationStatus;
  assessmentType: AssessmentType;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  requiresAttention: boolean;
  feedbackCount?: number;
  lastFeedbackAt?: Date;
  className?: string;
  compact?: boolean;
}

export const AssessmentStatusDisplay: React.FC<AssessmentStatusDisplayProps> = ({
  verificationStatus,
  assessmentType,
  priority,
  requiresAttention,
  feedbackCount = 0,
  lastFeedbackAt,
  className,
  compact = false,
}) => {
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <div className="flex items-center gap-1">
        <PriorityIndicator priority={priority} />
        <StatusBadge status={verificationStatus} />
      </div>
      
      {!compact && (
        <AssessmentTypeIndicator type={assessmentType} showLabel={!compact} />
      )}
      
      <AttentionIndicator
        requiresAttention={requiresAttention}
        feedbackCount={feedbackCount}
        lastFeedbackAt={lastFeedbackAt}
      />
    </div>
  );
};