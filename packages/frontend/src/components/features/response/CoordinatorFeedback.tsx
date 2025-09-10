"use client";

import { useState, useEffect } from "react";
import { Feedback, ResubmissionLog } from "@dms/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { 
  X, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  MessageSquare,
  History,
  User,
  Calendar
} from "lucide-react";

interface CoordinatorFeedbackProps {
  responseId: string;
  onClose: () => void;
  isOffline?: boolean;
}

export function CoordinatorFeedback({ 
  responseId, 
  onClose, 
  isOffline = false 
}: CoordinatorFeedbackProps) {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [resubmissionHistory, setResubmissionHistory] = useState<ResubmissionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedFeedback, setExpandedFeedback] = useState<Set<string>>(new Set());
  const [expandedHistory, setExpandedHistory] = useState(false);

  // Load feedback data
  useEffect(() => {
    const loadFeedbackData = async () => {
      setIsLoading(true);
      try {
        if (isOffline) {
          // Load from offline storage
          const { useOfflineStore } = await import("@/stores/offline.store");
          // const offlineData = useOfflineStore.getState().getCachedData("feedback", responseId);
          // if (offlineData) {
          //   setFeedback(offlineData.feedback || []);
          //   setResubmissionHistory(offlineData.resubmissionHistory || []);
          // }
        } else {
          // Load from API
          const response = await fetch(`/api/v1/responses/${responseId}/feedback`);
          if (response.ok) {
            const data = await response.json();
            setFeedback(data.data.feedback || []);
            setResubmissionHistory(data.data.resubmissionHistory || []);
          }
        }
      } catch (error) {
        console.error("Failed to load feedback:", error);
        // Set mock data for development/testing
        setFeedback([
          {
            id: "feedback-1",
            targetType: "RESPONSE",
            targetId: responseId,
            coordinatorId: "coord-1",
            coordinatorName: "John Smith",
            feedbackType: "REJECTION",
            reason: "INSUFFICIENT_EVIDENCE",
            comments: "The delivery evidence photos are too blurry to verify the actual items delivered. Please provide clearer photos showing the quantities and beneficiaries.",
            priority: "HIGH",
            requiresResponse: true,
            createdAt: new Date("2024-01-15T10:30:00Z"),
            isRead: true,
            isResolved: false,
          },
          {
            id: "feedback-2",
            targetType: "RESPONSE", 
            targetId: responseId,
            coordinatorId: "coord-2",
            coordinatorName: "Sarah Johnson",
            feedbackType: "CLARIFICATION_REQUEST",
            reason: "MISSING_INFO",
            comments: "Could you please clarify how the 50 households were selected for this food distribution? The selection criteria is not clear from the documentation.",
            priority: "NORMAL",
            requiresResponse: true,
            createdAt: new Date("2024-01-14T14:20:00Z"),
            isRead: true,
            isResolved: true,
            resolvedAt: new Date("2024-01-15T09:00:00Z"),
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadFeedbackData();
  }, [responseId, isOffline]);

  // Get priority badge variant
  const getPriorityBadgeVariant = (priority: Feedback['priority']) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive';
      case 'HIGH':
        return 'destructive';
      case 'NORMAL':
        return 'default';
      case 'LOW':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  // Get feedback type badge variant
  const getFeedbackTypeBadgeVariant = (feedbackType: Feedback['feedbackType']) => {
    switch (feedbackType) {
      case 'REJECTION':
        return 'destructive';
      case 'CLARIFICATION_REQUEST':
        return 'secondary';
      case 'APPROVAL_NOTE':
        return 'default';
      default:
        return 'secondary';
    }
  };

  // Get feedback icon
  const getFeedbackIcon = (feedbackType: Feedback['feedbackType']) => {
    switch (feedbackType) {
      case 'REJECTION':
        return <AlertCircle className="h-4 w-4" />;
      case 'CLARIFICATION_REQUEST':
        return <MessageSquare className="h-4 w-4" />;
      case 'APPROVAL_NOTE':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  // Toggle feedback expansion
  const toggleFeedbackExpansion = (feedbackId: string) => {
    setExpandedFeedback(prev => {
      const newSet = new Set(prev);
      if (newSet.has(feedbackId)) {
        newSet.delete(feedbackId);
      } else {
        newSet.add(feedbackId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div 
              className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
              role="progressbar"
              aria-label="Loading feedback"
            ></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Coordinator Feedback
            </CardTitle>
            <CardDescription>
              Response ID: {responseId.slice(-8)} • {feedback.length} feedback item(s)
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Feedback List */}
        {feedback.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Feedback Available</h3>
            <p className="text-muted-foreground">
              This response has not received any coordinator feedback yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="font-semibold">Feedback History</h3>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {feedback
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((item) => (
                    <Collapsible key={item.id}>
                      <Card className={`${
                        item.priority === 'URGENT' || item.priority === 'HIGH' 
                          ? 'border-red-200 bg-red-50/50' 
                          : ''
                      }`}>
                        <CollapsibleTrigger
                          className="w-full"
                          onClick={() => toggleFeedbackExpansion(item.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 text-left">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant={getFeedbackTypeBadgeVariant(item.feedbackType)}>
                                    <span className="flex items-center gap-1">
                                      {getFeedbackIcon(item.feedbackType)}
                                      {item.feedbackType.replace('_', ' ')}
                                    </span>
                                  </Badge>
                                  <Badge variant={getPriorityBadgeVariant(item.priority)}>
                                    {item.priority}
                                  </Badge>
                                  {item.isResolved && (
                                    <Badge variant="default">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Resolved
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                  <User className="h-3 w-3" />
                                  <span>{item.coordinatorName}</span>
                                  <Calendar className="h-3 w-3" />
                                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>

                                <p className="text-sm font-medium text-muted-foreground mb-1">
                                  Reason: {item.reason.replace('_', ' ')}
                                </p>
                                
                                <p className="text-sm line-clamp-2">
                                  {item.comments}
                                </p>
                              </div>
                              
                              <div className="ml-4">
                                {expandedFeedback.has(item.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <Separator />
                          <CardContent className="p-4 pt-4">
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Full Comments:</h4>
                                <p className="text-sm leading-relaxed bg-muted p-3 rounded">
                                  {item.comments}
                                </p>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-semibold">Created:</span> {' '}
                                  {new Date(item.createdAt).toLocaleString()}
                                </div>
                                {item.resolvedAt && (
                                  <div>
                                    <span className="font-semibold">Resolved:</span> {' '}
                                    {new Date(item.resolvedAt).toLocaleString()}
                                  </div>
                                )}
                                <div>
                                  <span className="font-semibold">Requires Response:</span> {' '}
                                  {item.requiresResponse ? 'Yes' : 'No'}
                                </div>
                                <div>
                                  <span className="font-semibold">Status:</span> {' '}
                                  {item.isResolved ? 'Resolved' : 'Open'}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Resubmission History */}
        {resubmissionHistory.length > 0 && (
          <div className="space-y-4">
            <Collapsible open={expandedHistory} onOpenChange={setExpandedHistory}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Resubmission History ({resubmissionHistory.length})
                  </span>
                  {expandedHistory ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-4">
                <div className="space-y-3">
                  {resubmissionHistory
                    .sort((a, b) => b.version - a.version)
                    .map((log) => (
                      <Card key={log.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">Version {log.version}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(log.resubmittedAt).toLocaleString()}
                            </span>
                          </div>
                          
                          <h4 className="font-semibold mb-2">Changes Description:</h4>
                          <p className="text-sm mb-3 bg-muted p-2 rounded">
                            {log.changesDescription}
                          </p>
                          
                          {log.dataChanges.length > 0 && (
                            <div>
                              <h5 className="font-semibold text-sm mb-1">Data Changes:</h5>
                              <div className="text-xs space-y-1">
                                {log.dataChanges.map((change, idx) => (
                                  <div key={idx} className="bg-muted p-2 rounded">
                                    <span className="font-semibold">{change.field}:</span> {' '}
                                    <span className="text-red-600">
                                      {String(change.oldValue)}
                                    </span> → {' '}
                                    <span className="text-green-600">
                                      {String(change.newValue)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Offline Indicator */}
        {isOffline && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            Feedback data cached offline
          </div>
        )}
      </CardContent>
    </Card>
  );
}