"use client";

import { useState, useEffect } from "react";
import { useResponseStore } from "@/stores/response.store";
import { ResponseStatusReview } from "@/components/features/response/ResponseStatusReview";
import { ResponseResubmission } from "@/components/features/response/ResponseResubmission";
import { RapidResponse, Feedback } from "@dms/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function StatusReviewPage() {
  const {
    responses,
    isLoading,
    error,
    loadStatusReview,
    loadFeedback,
    submitResubmission,
    clearError,
  } = useResponseStore();

  const [selectedResponse, setSelectedResponse] = useState<RapidResponse | null>(null);
  const [showResubmission, setShowResubmission] = useState(false);
  const [resubmissionData, setResubmissionData] = useState<{
    response: RapidResponse;
    feedback: Feedback[];
  } | null>(null);
  const [isSubmittingResubmission, setIsSubmittingResubmission] = useState(false);

  // Load status review data on mount
  useEffect(() => {
    loadStatusReview();
  }, [loadStatusReview]);

  // Handle response selection
  const handleResponseSelect = (response: RapidResponse) => {
    setSelectedResponse(response);
  };

  // Handle resubmission request
  const handleResubmissionRequest = async (responseId: string) => {
    try {
      const response = responses.find(r => r.id === responseId);
      if (!response) return;

      // Load feedback data for the response
      const feedbackData = await loadFeedback(responseId);
      
      setResubmissionData({
        response,
        feedback: feedbackData.feedback || [],
      });
      setShowResubmission(true);
    } catch (error) {
      console.error("Failed to load resubmission data:", error);
    }
  };

  // Handle resubmission submission
  const handleResubmissionSubmit = async (data: any) => {
    if (!resubmissionData) return;
    
    setIsSubmittingResubmission(true);
    try {
      await submitResubmission(resubmissionData.response.id, data);
      
      // Close resubmission form and refresh data
      setShowResubmission(false);
      setResubmissionData(null);
      await loadStatusReview(); // Refresh the list
      
    } catch (error) {
      console.error("Resubmission failed:", error);
      // Error is handled by the store
    } finally {
      setIsSubmittingResubmission(false);
    }
  };

  // Handle resubmission cancel
  const handleResubmissionCancel = () => {
    setShowResubmission(false);
    setResubmissionData(null);
  };

  // Handle refresh
  const handleRefresh = () => {
    clearError();
    loadStatusReview();
  };

  // Show loading state
  if (isLoading && responses.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading response status review...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error && responses.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-600 mb-4">Failed to load status review data</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {showResubmission && resubmissionData ? (
        <div className="space-y-6">
          {/* Back button */}
          <Button 
            variant="ghost" 
            onClick={handleResubmissionCancel}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Status Review
          </Button>

          <ResponseResubmission
            response={resubmissionData.response}
            feedback={resubmissionData.feedback}
            onSubmit={handleResubmissionSubmit}
            onCancel={handleResubmissionCancel}
            isSubmitting={isSubmittingResubmission}
          />
        </div>
      ) : (
        <ResponseStatusReview
          responses={responses}
          onResponseSelect={handleResponseSelect}
          onResubmissionRequest={handleResubmissionRequest}
        />
      )}

      {/* Error notification */}
      {error && (
        <div className="fixed bottom-4 right-4 max-w-md">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearError}
                  className="text-red-800 hover:text-red-900"
                >
                  ×
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}