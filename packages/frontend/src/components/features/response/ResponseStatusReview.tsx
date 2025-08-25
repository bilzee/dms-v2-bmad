"use client";

import { useState, useEffect } from "react";
import { RapidResponse, VerificationStatus, ResponseType } from "@dms/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Filter, Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { CoordinatorFeedback } from "./CoordinatorFeedback";
import { ResponseAttentionIndicators } from "./ResponseAttentionIndicators";

interface ResponseStatusReviewProps {
  responses: RapidResponse[];
  onResponseSelect: (response: RapidResponse) => void;
  onResubmissionRequest: (responseId: string) => void;
  isOffline?: boolean;
}

interface FilterState {
  verificationStatus?: VerificationStatus;
  responseType?: ResponseType;
  dateRange?: { start: Date; end: Date };
  requiresAttention?: boolean;
  searchTerm: string;
}

export function ResponseStatusReview({
  responses,
  onResponseSelect,
  onResubmissionRequest,
  isOffline = false
}: ResponseStatusReviewProps) {
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: ""
  });
  const [selectedResponse, setSelectedResponse] = useState<RapidResponse | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");

  // Filter responses based on current filters
  const filteredResponses = responses.filter(response => {
    if (filters.verificationStatus && response.verificationStatus !== filters.verificationStatus) {
      return false;
    }
    
    if (filters.responseType && response.responseType !== filters.responseType) {
      return false;
    }
    
    if (filters.requiresAttention && !response.requiresAttention) {
      return false;
    }
    
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      return (
        response.responderName.toLowerCase().includes(searchLower) ||
        response.responseType.toLowerCase().includes(searchLower) ||
        response.id.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Group responses by verification status for tabs
  const groupedResponses = {
    all: filteredResponses,
    pending: filteredResponses.filter(r => r.verificationStatus === VerificationStatus.PENDING),
    verified: filteredResponses.filter(r => r.verificationStatus === VerificationStatus.VERIFIED),
    rejected: filteredResponses.filter(r => r.verificationStatus === VerificationStatus.REJECTED),
    attention: filteredResponses.filter(r => r.requiresAttention),
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.VERIFIED:
        return "default";
      case VerificationStatus.PENDING:
        return "secondary";
      case VerificationStatus.REJECTED:
        return "destructive";
      case VerificationStatus.AUTO_VERIFIED:
        return "outline";
      default:
        return "secondary";
    }
  };

  // Get status icon
  const getStatusIcon = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.VERIFIED:
        return <CheckCircle className="h-4 w-4" />;
      case VerificationStatus.PENDING:
        return <Clock className="h-4 w-4" />;
      case VerificationStatus.REJECTED:
        return <XCircle className="h-4 w-4" />;
      case VerificationStatus.AUTO_VERIFIED:
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleResponseClick = (response: RapidResponse) => {
    setSelectedResponse(response);
    onResponseSelect(response);
  };

  return (
    <div className="space-y-6">
      {/* Header with attention indicators */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Response Status Review</h1>
          <p className="text-muted-foreground">
            Track verification status and manage feedback for your responses
          </p>
        </div>
        <ResponseAttentionIndicators responses={responses} />
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search responses..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="pl-9"
              />
            </div>

            {/* Verification Status Filter */}
            <Select
              value={filters.verificationStatus || ""}
              onValueChange={(value) => 
                setFilters(prev => ({ 
                  ...prev, 
                  verificationStatus: value ? value as VerificationStatus : undefined 
                }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value={VerificationStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={VerificationStatus.VERIFIED}>Verified</SelectItem>
                <SelectItem value={VerificationStatus.REJECTED}>Rejected</SelectItem>
                <SelectItem value={VerificationStatus.AUTO_VERIFIED}>Auto-Verified</SelectItem>
              </SelectContent>
            </Select>

            {/* Response Type Filter */}
            <Select
              value={filters.responseType || ""}
              onValueChange={(value) => 
                setFilters(prev => ({ 
                  ...prev, 
                  responseType: value ? value as ResponseType : undefined 
                }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value={ResponseType.HEALTH}>Health</SelectItem>
                <SelectItem value={ResponseType.WASH}>WASH</SelectItem>
                <SelectItem value={ResponseType.SHELTER}>Shelter</SelectItem>
                <SelectItem value={ResponseType.FOOD}>Food</SelectItem>
                <SelectItem value={ResponseType.SECURITY}>Security</SelectItem>
                <SelectItem value={ResponseType.POPULATION}>Population</SelectItem>
              </SelectContent>
            </Select>

            {/* Attention Filter */}
            <Button
              variant={filters.requiresAttention ? "default" : "outline"}
              onClick={() => 
                setFilters(prev => ({ 
                  ...prev, 
                  requiresAttention: !prev.requiresAttention 
                }))
              }
              className="whitespace-nowrap"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Needs Attention
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Response Lists */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            All ({groupedResponses.all.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({groupedResponses.pending.length})
          </TabsTrigger>
          <TabsTrigger value="verified">
            Verified ({groupedResponses.verified.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({groupedResponses.rejected.length})
          </TabsTrigger>
          <TabsTrigger value="attention">
            <AlertCircle className="h-4 w-4 mr-1" />
            Attention ({groupedResponses.attention.length})
          </TabsTrigger>
        </TabsList>

        {Object.entries(groupedResponses).map(([key, responses]) => (
          <TabsContent key={key} value={key} className="space-y-4">
            {responses.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="text-muted-foreground mb-2">No responses found</div>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your filters to see more results
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {responses.map((response) => (
                    <Card 
                      key={response.id}
                      data-testid={`response-card-${response.id}`}
                      className={`cursor-pointer transition-colors hover:bg-accent ${
                        response.requiresAttention ? 'border-orange-500' : ''
                      } ${
                        selectedResponse?.id === response.id ? 'bg-accent' : ''
                      }`}
                      onClick={() => handleResponseClick(response)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">
                                {response.responseType}
                              </Badge>
                              <Badge variant={getStatusBadgeVariant(response.verificationStatus)}>
                                <span className="flex items-center gap-1">
                                  {getStatusIcon(response.verificationStatus)}
                                  {response.verificationStatus}
                                </span>
                              </Badge>
                              {response.requiresAttention && (
                                <Badge variant="destructive">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Attention
                                </Badge>
                              )}
                            </div>
                            
                            <h3 className="font-semibold">
                              Response ID: {response.id.slice(-8)}
                            </h3>
                            
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div>Responder: {response.responderName}</div>
                              <div>Planned: {new Date(response.plannedDate).toLocaleDateString()}</div>
                              {response.deliveredDate && (
                                <div>Delivered: {new Date(response.deliveredDate).toLocaleDateString()}</div>
                              )}
                              {response.feedbackCount && response.feedbackCount > 0 && (
                                <div className="flex items-center gap-1 text-orange-600">
                                  <AlertCircle className="h-3 w-3" />
                                  {response.feedbackCount} feedback item(s)
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {response.verificationStatus === VerificationStatus.REJECTED && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onResubmissionRequest(response.id);
                              }}
                            >
                              Resubmit
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Selected Response Feedback Details */}
      {selectedResponse && (
        <CoordinatorFeedback 
          responseId={selectedResponse.id}
          onClose={() => setSelectedResponse(null)}
        />
      )}

      {/* Offline Indicator */}
      {isOffline && (
        <div className="fixed bottom-4 right-4">
          <Badge variant="outline" className="bg-background">
            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse" />
            Offline Mode
          </Badge>
        </div>
      )}
    </div>
  );
}