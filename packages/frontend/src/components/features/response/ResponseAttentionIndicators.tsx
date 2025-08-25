"use client";

import { useState, useEffect } from "react";
import { RapidResponse, VerificationStatus } from "@dms/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertCircle, 
  Clock, 
  XCircle, 
  Bell, 
  BellRing,
  Calendar,
  User
} from "lucide-react";

interface ResponseAttentionIndicatorsProps {
  responses: RapidResponse[];
  onResponseClick?: (response: RapidResponse) => void;
  showCompact?: boolean;
}

interface AttentionStats {
  totalRequiringAttention: number;
  rejectedResponses: number;
  overdueResponses: number;
  highPriorityFeedback: number;
  urgentFeedback: number;
}

export function ResponseAttentionIndicators({ 
  responses, 
  onResponseClick,
  showCompact = false
}: ResponseAttentionIndicatorsProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate attention statistics
  const stats: AttentionStats = responses.reduce((acc, response) => {
    if (response.requiresAttention) {
      acc.totalRequiringAttention++;
    }
    
    if (response.verificationStatus === VerificationStatus.REJECTED) {
      acc.rejectedResponses++;
    }

    // Calculate overdue responses (example: pending for more than 7 days)
    const daysSinceCreated = Math.floor(
      (new Date().getTime() - new Date(response.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (response.verificationStatus === VerificationStatus.PENDING && daysSinceCreated > 7) {
      acc.overdueResponses++;
    }

    // Mock feedback priority stats (in real implementation, would come from feedback data)
    if (response.feedbackCount && response.feedbackCount > 0) {
      // Simulate high priority feedback count
      acc.highPriorityFeedback += Math.floor(response.feedbackCount * 0.3);
      acc.urgentFeedback += Math.floor(response.feedbackCount * 0.1);
    }

    return acc;
  }, {
    totalRequiringAttention: 0,
    rejectedResponses: 0,
    overdueResponses: 0,
    highPriorityFeedback: 0,
    urgentFeedback: 0,
  });

  // Get responses requiring immediate attention
  const urgentResponses = responses.filter(response => {
    return (
      response.verificationStatus === VerificationStatus.REJECTED ||
      (response.verificationStatus === VerificationStatus.PENDING && 
       Math.floor((new Date().getTime() - new Date(response.createdAt).getTime()) / (1000 * 60 * 60 * 24)) > 7) ||
      response.requiresAttention
    );
  }).slice(0, 5); // Show max 5 urgent items

  // Determine the overall attention level
  const getAttentionLevel = () => {
    if (stats.urgentFeedback > 0 || stats.rejectedResponses > 3) {
      return 'critical';
    } else if (stats.totalRequiringAttention > 5 || stats.overdueResponses > 2) {
      return 'high';
    } else if (stats.totalRequiringAttention > 0) {
      return 'medium';
    }
    return 'none';
  };

  const attentionLevel = getAttentionLevel();

  // Get badge variant based on attention level
  const getBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Get icon based on attention level
  const getAttentionIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <BellRing className="h-4 w-4 animate-bounce" />;
      case 'high':
        return <AlertCircle className="h-4 w-4" />;
      case 'medium':
        return <Bell className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  // If no attention required and compact mode, don't render
  if (showCompact && stats.totalRequiringAttention === 0) {
    return null;
  }

  // Compact display for navigation bar
  if (showCompact) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            {getAttentionIcon(attentionLevel)}
            {stats.totalRequiringAttention > 0 && (
              <Badge 
                variant={getBadgeVariant(attentionLevel)}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {stats.totalRequiringAttention > 99 ? '99+' : stats.totalRequiringAttention}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm">Responses Requiring Attention</h3>
              <p className="text-xs text-muted-foreground">
                {stats.totalRequiringAttention} response(s) need your attention
              </p>
            </div>

            {urgentResponses.length > 0 ? (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {urgentResponses.map((response) => (
                    <Card
                      key={response.id}
                      className="cursor-pointer hover:bg-accent p-2"
                      onClick={() => {
                        onResponseClick?.(response);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {response.responseType}
                            </Badge>
                            {response.verificationStatus === VerificationStatus.REJECTED && (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                          <p className="text-xs font-medium truncate">
                            ID: {response.id.slice(-8)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {response.responderName}
                          </p>
                        </div>
                        <AlertCircle className="h-3 w-3 text-orange-500 flex-shrink-0" />
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                No urgent responses at this time
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Full dashboard display
  return (
    <div className="space-y-4">
      {/* Attention Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requiring Attention */}
        <Card className={`${stats.totalRequiringAttention > 0 ? 'border-orange-200 bg-orange-50/50' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Requiring Attention
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.totalRequiringAttention}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        {/* Rejected Responses */}
        <Card className={`${stats.rejectedResponses > 0 ? 'border-red-200 bg-red-50/50' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Rejected
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.rejectedResponses}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        {/* Overdue Responses */}
        <Card className={`${stats.overdueResponses > 0 ? 'border-yellow-200 bg-yellow-50/50' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Overdue (7+ days)
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.overdueResponses}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        {/* High Priority Feedback */}
        <Card className={`${stats.highPriorityFeedback > 0 ? 'border-purple-200 bg-purple-50/50' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  High Priority
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.highPriorityFeedback}
                </p>
              </div>
              <BellRing className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Response List */}
      {stats.totalRequiringAttention > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Priority Responses
            </CardTitle>
            <CardDescription>
              Responses that require immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {urgentResponses.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No urgent responses at this time
              </p>
            ) : (
              <div className="space-y-3">
                {urgentResponses.map((response) => (
                  <Card 
                    key={response.id}
                    className={`cursor-pointer transition-colors hover:bg-accent ${
                      response.verificationStatus === VerificationStatus.REJECTED 
                        ? 'border-red-200 bg-red-50/25' 
                        : 'border-orange-200 bg-orange-50/25'
                    }`}
                    onClick={() => onResponseClick?.(response)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">
                              {response.responseType}
                            </Badge>
                            <Badge variant={
                              response.verificationStatus === VerificationStatus.REJECTED 
                                ? "destructive" 
                                : "secondary"
                            }>
                              {response.verificationStatus}
                            </Badge>
                            {response.verificationStatus === VerificationStatus.REJECTED && (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Needs Resubmission
                              </Badge>
                            )}
                          </div>
                          
                          <h4 className="font-semibold mb-1">
                            Response ID: {response.id.slice(-8)}
                          </h4>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              <span>{response.responderName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>Created: {new Date(response.createdAt).toLocaleDateString()}</span>
                            </div>
                            {response.feedbackCount && response.feedbackCount > 0 && (
                              <div className="flex items-center gap-2 text-orange-600">
                                <AlertCircle className="h-3 w-3" />
                                <span>{response.feedbackCount} feedback item(s)</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          {/* Urgency indicator */}
                          {response.verificationStatus === VerificationStatus.REJECTED ? (
                            <div className="flex items-center gap-1 text-red-600">
                              <XCircle className="h-4 w-4" />
                              <span className="text-xs font-medium">Action Required</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-orange-600">
                              <Clock className="h-4 w-4" />
                              <span className="text-xs font-medium">Overdue</span>
                            </div>
                          )}
                          
                          {/* Days indicator */}
                          <Badge variant="outline" className="text-xs">
                            {Math.floor(
                              (new Date().getTime() - new Date(response.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                            )} days
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Clear Message */}
      {stats.totalRequiringAttention === 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                All Caught Up!
              </h3>
              <p className="text-sm text-green-700">
                No responses currently require your attention. Great work keeping up with coordinator feedback!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}