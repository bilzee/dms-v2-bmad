'use client';

import React, { useState } from 'react';
import { type RapidResponse, ResponseStatus } from '@dms/shared';
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
import { 
  CheckCircleIcon, 
  ClockIcon, 
  MapPinIcon,
  UserGroupIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

interface DeliveryStatusTransitionProps {
  response: RapidResponse;
  onStartConversion: () => void;
  isCapturingGPS: boolean;
  className?: string;
}

export function DeliveryStatusTransition({
  response,
  onStartConversion,
  isCapturingGPS,
  className,
}: DeliveryStatusTransitionProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleConfirmStart = () => {
    setShowConfirmation(false);
    onStartConversion();
  };

  // Calculate planned items summary
  const plannedItemsCount = response.otherItemsDelivered?.length || 0;
  const totalQuantity = response.otherItemsDelivered?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status Transition Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-blue-600" />
            Response Conversion Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Current Status */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <ClockIcon className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium">Current Status</div>
                  <div className="text-sm text-gray-600">Response is currently planned</div>
                </div>
              </div>
              <Badge variant="secondary">{response.status}</Badge>
            </div>

            {/* Arrow Indicator */}
            <div className="flex justify-center">
              <div className="text-2xl text-gray-400">↓</div>
            </div>

            {/* Target Status */}
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium">Target Status</div>
                  <div className="text-sm text-gray-600">After conversion completion</div>
                </div>
              </div>
              <Badge className="bg-green-600 hover:bg-green-700">{ResponseStatus.DELIVERED}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response Details Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Response Plan Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <div className="font-medium">Planned Date</div>
                  <div className="text-sm text-gray-600">
                    {new Date(response.plannedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(response.plannedDate).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <UserGroupIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <div className="font-medium">Responder</div>
                  <div className="text-sm text-gray-600">{response.responderName}</div>
                  {response.donorName && (
                    <div className="text-sm text-gray-500">Donor: {response.donorName}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPinIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <div className="font-medium">Response Type</div>
                  <div className="text-sm text-gray-600">{response.responseType}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <div className="font-medium">Planned Items</div>
                  <div className="text-sm text-gray-600">
                    {plannedItemsCount} items ({totalQuantity} total units)
                  </div>
                  {plannedItemsCount > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Click &ldquo;Start Conversion&rdquo; to review and adjust quantities
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Planned Items Preview */}
      {plannedItemsCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Planned Items Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {response.otherItemsDelivered.map((item, index) => (
                <div 
                  key={index}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{item.item}</div>
                    <div className="text-sm text-gray-500">{item.unit}</div>
                  </div>
                  <div className="font-mono text-right">
                    <div className="text-lg font-medium">{item.quantity}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversion Warnings/Requirements */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h4 className="font-medium text-orange-800">Before Starting Conversion</h4>
            <ul className="space-y-2 text-sm text-orange-700">
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                Ensure you have access to actual delivery information
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                GPS location will be captured for delivery verification
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                You&rsquo;ll be able to adjust quantities and add additional items
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                Photos and documentation can be added for evidence
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                Conversion cannot be undone once completed
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* GPS Status Indicator */}
      {isCapturingGPS && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <div>
                <div className="font-medium text-blue-800">Capturing GPS Location</div>
                <div className="text-sm text-blue-600">Getting your current location for delivery verification...</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start Conversion Button */}
      <div className="flex justify-center">
        <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <DialogTrigger asChild>
            <Button 
              size="lg"
              disabled={isCapturingGPS}
              className="px-8 py-3 text-lg"
            >
              {isCapturingGPS ? 'Capturing Location...' : 'Start Conversion'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Conversion Start</DialogTitle>
              <DialogDescription className="space-y-3">
                <p>
                  You are about to start converting this planned response to delivery documentation.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm space-y-1">
                    <div><strong>Response:</strong> {response.responseType}</div>
                    <div><strong>Planned Date:</strong> {new Date(response.plannedDate).toLocaleDateString()}</div>
                    <div><strong>Planned Items:</strong> {plannedItemsCount} items</div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Once started, you&rsquo;ll review the planned items and document the actual delivery details.
                </p>
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmStart}>
                Yes, Start Conversion
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}