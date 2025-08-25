'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { 
  Bell, 
  BellRing, 
  Check, 
  Clock, 
  MessageSquare, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Feedback } from '@dms/shared';
import { useAuth } from '@/hooks/useAuth';
import { format, formatDistanceToNow } from 'date-fns';

interface FeedbackNotificationProps {
  feedback: Feedback[];
  assessmentId?: string;
  className?: string;
  showAll?: boolean;
  onMarkAsRead?: (feedbackId: string) => void;
  onMarkAsResolved?: (feedbackId: string) => void;
}

interface NotificationStats {
  total: number;
  unread: number;
  unresolved: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

const FEEDBACK_TYPE_CONFIG = {
  REJECTION: {
    label: 'Rejection',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-200',
    iconColor: 'text-red-600',
  },
  CLARIFICATION_REQUEST: {
    label: 'Clarification',
    icon: MessageSquare,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    iconColor: 'text-blue-600',
  },
  APPROVAL_NOTE: {
    label: 'Approval',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-200',
    iconColor: 'text-green-600',
  },
} as const;

const PRIORITY_CONFIG = {
  LOW: { label: 'Low', color: 'bg-green-50 text-green-700 border-green-200' },
  NORMAL: { label: 'Normal', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  HIGH: { label: 'High', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  URGENT: { label: 'Urgent', color: 'bg-red-50 text-red-700 border-red-200' },
} as const;

const REASON_CONFIG = {
  DATA_QUALITY: 'Data Quality Issues',
  MISSING_INFO: 'Missing Information',
  VALIDATION_ERROR: 'Validation Error',
  INSUFFICIENT_EVIDENCE: 'Insufficient Evidence',
  OTHER: 'Other',
} as const;

export const FeedbackNotification: React.FC<FeedbackNotificationProps> = ({
  feedback,
  assessmentId,
  className,
  showAll = false,
  onMarkAsRead,
  onMarkAsResolved,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const { user } = useAuth();

  // Filter feedback if assessmentId is provided
  const filteredFeedback = React.useMemo(() => {
    if (!assessmentId) return feedback;
    return feedback.filter(f => f.targetId === assessmentId && f.targetType === 'ASSESSMENT');
  }, [feedback, assessmentId]);

  // Calculate notification stats
  const stats: NotificationStats = React.useMemo(() => {
    return filteredFeedback.reduce((acc, f) => {
      acc.total++;
      if (!f.isRead) acc.unread++;
      if (!f.isResolved) acc.unresolved++;
      
      acc.byType[f.feedbackType] = (acc.byType[f.feedbackType] || 0) + 1;
      acc.byPriority[f.priority] = (acc.byPriority[f.priority] || 0) + 1;
      
      return acc;
    }, {
      total: 0,
      unread: 0,
      unresolved: 0,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
    });
  }, [filteredFeedback]);

  // Sort feedback by priority and date
  const sortedFeedback = React.useMemo(() => {
    return [...filteredFeedback].sort((a, b) => {
      // Sort by resolved status first (unresolved first)
      if (a.isResolved !== b.isResolved) {
        return a.isResolved ? 1 : -1;
      }
      
      // Then by priority
      const priorityOrder = { URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Finally by date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredFeedback]);

  const handleMarkAsRead = async (feedbackId: string) => {
    if (!user || processingId) return;
    
    setProcessingId(feedbackId);
    
    try {
      const response = await fetch(`/api/v1/feedback/${feedbackId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      onMarkAsRead?.(feedbackId);
      
      toast({
        title: 'Marked as Read',
        description: 'Feedback has been marked as read.',
        variant: 'default',
      });

    } catch (error) {
      console.error('Failed to mark feedback as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark feedback as read.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAsResolved = async (feedbackId: string) => {
    if (!user || processingId) return;
    
    setProcessingId(feedbackId);
    
    try {
      const response = await fetch(`/api/v1/feedback/${feedbackId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      onMarkAsResolved?.(feedbackId);
      
      toast({
        title: 'Marked as Resolved',
        description: 'Feedback has been marked as resolved.',
        variant: 'default',
      });

    } catch (error) {
      console.error('Failed to mark feedback as resolved:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark feedback as resolved.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const renderFeedbackItem = (feedbackItem: Feedback) => {
    const typeConfig = FEEDBACK_TYPE_CONFIG[feedbackItem.feedbackType];
    const TypeIcon = typeConfig.icon;
    const priorityConfig = PRIORITY_CONFIG[feedbackItem.priority];
    const reasonLabel = REASON_CONFIG[feedbackItem.reason];

    return (
      <div
        key={feedbackItem.id}
        className={cn(
          'p-4 rounded-lg border transition-colors',
          !feedbackItem.isRead && 'bg-blue-50 border-blue-200',
          feedbackItem.isResolved && 'opacity-60'
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-full', typeConfig.color)}>
            <TypeIcon className={cn('h-4 w-4', typeConfig.iconColor)} />
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={typeConfig.color}>
                  {typeConfig.label}
                </Badge>
                <Badge variant="outline" className={priorityConfig.color}>
                  {priorityConfig.label}
                </Badge>
                {!feedbackItem.isRead && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    New
                  </Badge>
                )}
                {feedbackItem.isResolved && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                    Resolved
                  </Badge>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(feedbackItem.createdAt), { addSuffix: true })}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">
                {reasonLabel}
              </div>
              <div className="text-sm text-muted-foreground">
                From: {feedbackItem.coordinatorName}
              </div>
            </div>

            <div className="text-sm leading-relaxed">
              {feedbackItem.comments}
            </div>

            <div className="flex items-center gap-2 pt-2">
              {!feedbackItem.isRead && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkAsRead(feedbackItem.id)}
                  disabled={processingId === feedbackItem.id}
                >
                  {processingId === feedbackItem.id ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Eye className="h-3 w-3 mr-1" />
                  )}
                  Mark as Read
                </Button>
              )}
              
              {!feedbackItem.isResolved && feedbackItem.requiresResponse && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkAsResolved(feedbackItem.id)}
                  disabled={processingId === feedbackItem.id}
                >
                  {processingId === feedbackItem.id ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  Mark as Resolved
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (stats.total === 0) {
    return (
      <div className={cn('text-center py-4', className)}>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span className="text-sm">No feedback notifications</span>
        </div>
      </div>
    );
  }

  if (showAll) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Feedback ({stats.total})
          </h3>
          
          <div className="flex items-center gap-2">
            {stats.unread > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {stats.unread} Unread
              </Badge>
            )}
            {stats.unresolved > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                {stats.unresolved} Unresolved
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {sortedFeedback.map(renderFeedbackItem)}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            {stats.unread > 0 ? (
              <BellRing className="h-4 w-4 mr-2" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            Feedback ({stats.total})
            {stats.unread > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {stats.unread > 9 ? '9+' : stats.unread}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Assessment Feedback
            </DialogTitle>
            <DialogDescription>
              Feedback and notifications for assessment verification
            </DialogDescription>
          </DialogHeader>

          {/* Stats Summary */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.unread}</div>
                  <div className="text-xs text-muted-foreground">Unread</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{stats.unresolved}</div>
                  <div className="text-xs text-muted-foreground">Unresolved</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {stats.byPriority.URGENT || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Urgent</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-3">
              {sortedFeedback.map(renderFeedbackItem)}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeedbackNotification;