'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  RapidResponse, 
  PartialDeliveryUpdateRequest, 
  PartialDeliveryResponse,
  ResponseType,
  ResponseStatus,
  VerificationStatus,
  SyncStatus,
  FoodResponseData
} from '@dms/shared';
import { PartialDeliveryForm } from '@/components/features/response/PartialDeliveryForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PartialDeliveryPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [response, setResponse] = useState<RapidResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const responseId = params.id as string;

  // Load response data
  useEffect(() => {
    async function loadResponse() {
      if (!responseId) return;

      try {
        setIsLoading(true);
        setError(null);

        // First try to get existing partial delivery data
        const trackingResponse = await fetch(`/api/v1/responses/${responseId}/tracking`);
        
        if (trackingResponse.ok) {
          // Response has existing partial delivery data
          const trackingData = await trackingResponse.json();
          setResponse(trackingData.data || trackingData);
          return;
        }

        // No partial delivery data exists, get basic response data
        // In a real implementation, this would be a separate endpoint
        const mockResponse: RapidResponse = {
          id: responseId,
          responseType: ResponseType.FOOD,
          status: ResponseStatus.IN_PROGRESS,
          plannedDate: new Date('2024-08-20'),
          affectedEntityId: 'entity-1',
          assessmentId: 'assessment-1',
          responderId: 'responder-1',
          responderName: 'John Doe',
          verificationStatus: VerificationStatus.PENDING,
          syncStatus: SyncStatus.SYNCED,
          requiresAttention: false,
          data: {
            foodItemsDelivered: [
              { item: 'Rice', quantity: 100, unit: 'kg' },
              { item: 'Cooking Oil', quantity: 20, unit: 'liters' },
            ],
            householdsServed: 50,
            personsServed: 200,
            nutritionSupplementsProvided: 0,
          } as FoodResponseData,
          otherItemsDelivered: [
            { item: 'Rice', quantity: 100, unit: 'kg' },
            { item: 'Cooking Oil', quantity: 20, unit: 'liters' },
            { item: 'Blankets', quantity: 50, unit: 'pieces' },
            { item: 'Water Containers', quantity: 30, unit: 'pieces' },
          ],
          deliveryEvidence: [],
          createdAt: new Date('2024-08-15'),
          updatedAt: new Date('2024-08-20'),
        };

        setResponse(mockResponse);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load response data';
        setError(errorMessage);
        toast({
          title: "Loading Failed",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadResponse();
  }, [responseId, toast]);

  // Handle partial delivery save
  const handleSave = async (data: PartialDeliveryUpdateRequest) => {
    try {
      const response = await fetch(`/api/v1/responses/${responseId}/partial`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          partialDeliveryTimestamp: data.partialDeliveryTimestamp.toISOString(),
          estimatedCompletionDate: data.estimatedCompletionDate?.toISOString(),
          followUpTasks: data.followUpTasks.map(task => ({
            ...task,
            estimatedDate: task.estimatedDate.toISOString(),
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save partial delivery data');
      }

      const responseData: PartialDeliveryResponse = await response.json();
      
      toast({
        title: "Saved Successfully",
        description: `Partial delivery data saved. Overall completion: ${responseData.trackingMetrics.totalPercentageComplete.toFixed(1)}%`,
      });

      // Update local state
      setResponse(responseData.data);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save partial delivery data';
      throw new Error(errorMessage);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.back();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading response data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !response) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-red-600 mt-1" />
                <div>
                  <h3 className="font-medium text-red-800 mb-2">Failed to Load Response</h3>
                  <p className="text-red-700 mb-4">
                    {error || 'Response not found or could not be loaded.'}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => window.location.reload()}
                    >
                      Try Again
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.back()}
                    >
                      Go Back
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Partial Delivery Tracking
              </h1>
              <p className="text-gray-600 mt-1">
                Response ID: {responseId} • {response.responseType} Response
              </p>
            </div>
          </div>
        </div>

        {/* Response Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Response Summary</CardTitle>
            <CardDescription>
              Overview of the planned response and current delivery status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Response Details</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Type: <span className="font-medium">{response.responseType}</span></div>
                  <div>Status: <span className="font-medium">{response.status}</span></div>
                  <div>Responder: <span className="font-medium">{response.responderName}</span></div>
                  <div>Planned Date: <span className="font-medium">
                    {new Date(response.plannedDate).toLocaleDateString()}
                  </span></div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Planned Items</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {response.otherItemsDelivered.slice(0, 3).map((item, index) => (
                    <div key={index}>
                      {item.quantity} {item.unit} of {item.item}
                    </div>
                  ))}
                  {response.otherItemsDelivered.length > 3 && (
                    <div className="text-gray-500">
                      +{response.otherItemsDelivered.length - 3} more items
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Current Status</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {response.partialDeliveryData ? (
                    <>
                      <div>Overall Completion: <span className="font-medium text-blue-600">
                        {response.partialDeliveryData.totalPercentageComplete.toFixed(1)}%
                      </span></div>
                      <div>Follow-up Required: <span className="font-medium text-orange-600">
                        {response.partialDeliveryData.followUpRequired ? 'Yes' : 'No'}
                      </span></div>
                      <div>Last Updated: <span className="font-medium">
                        {new Date(response.partialDeliveryData.partialDeliveryTimestamp).toLocaleDateString()}
                      </span></div>
                    </>
                  ) : (
                    <div className="text-gray-500">No partial delivery data yet</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Partial Delivery Form */}
        <PartialDeliveryForm
          response={response}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}