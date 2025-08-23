'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormLabel, FormMessage } from '@/components/ui/form';

interface DeliveryTimelinePlannerProps {
  initialDate?: Date;
  travelTimeToLocation?: number; // minutes
  onTimelineUpdate: (timeline: {
    plannedDate: Date;
    estimatedDeliveryTime?: number;
    notes?: string;
  }) => void;
  className?: string;
}

interface TimelineData {
  plannedDate: Date;
  plannedTime: string;
  estimatedTravelTime: number; // minutes
  estimatedDeliveryDuration: number; // minutes
  contingencyBuffer: number; // minutes
  notes: string;
}

export function DeliveryTimelinePlanner({
  initialDate = new Date(),
  travelTimeToLocation = 0,
  onTimelineUpdate,
  className,
}: DeliveryTimelinePlannerProps) {
  const [timeline, setTimeline] = useState<TimelineData>({
    plannedDate: initialDate,
    plannedTime: formatTimeForInput(new Date()),
    estimatedTravelTime: travelTimeToLocation,
    estimatedDeliveryDuration: 60, // 1 hour default
    contingencyBuffer: 30, // 30 minutes default
    notes: '',
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update parent when timeline changes - avoid infinite loops by removing callback dependency
  useEffect(() => {
    const combinedDateTime = combineDateTime(timeline.plannedDate, timeline.plannedTime);
    const totalEstimatedTime = timeline.estimatedTravelTime + timeline.estimatedDeliveryDuration + timeline.contingencyBuffer;

    onTimelineUpdate({
      plannedDate: combinedDateTime,
      estimatedDeliveryTime: totalEstimatedTime,
      notes: timeline.notes,
    });
  }, [timeline]); // Remove onTimelineUpdate from dependencies to prevent infinite loops

  // Update travel time when prop changes (from GPS calculation) - prevent unnecessary updates
  useEffect(() => {
    if (travelTimeToLocation !== timeline.estimatedTravelTime && travelTimeToLocation > 0) {
      setTimeline(prev => ({
        ...prev,
        estimatedTravelTime: travelTimeToLocation,
      }));
    }
  }, [travelTimeToLocation]); // Only update when travelTimeToLocation actually changes

  // Handle field updates
  const updateTimeline = (field: keyof TimelineData, value: any) => {
    setTimeline(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validation
  const validateField = (field: keyof TimelineData, value: any): string | null => {
    switch (field) {
      case 'plannedDate':
        if (value < new Date().setHours(0, 0, 0, 0)) {
          return 'Planned date cannot be in the past';
        }
        break;
      case 'plannedTime':
        if (!value || value.trim() === '') {
          return 'Planned time is required';
        }
        break;
      case 'estimatedTravelTime':
        if (value < 0) {
          return 'Travel time cannot be negative';
        }
        break;
      case 'estimatedDeliveryDuration':
        if (value <= 0) {
          return 'Delivery duration must be positive';
        }
        break;
      case 'contingencyBuffer':
        if (value < 0) {
          return 'Contingency buffer cannot be negative';
        }
        break;
    }
    return null;
  };

  // Handle field blur for validation
  const handleFieldBlur = (field: keyof TimelineData, value: any) => {
    const error = validateField(field, value);
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  // Calculate estimated arrival time
  const getEstimatedArrivalTime = () => {
    const startTime = combineDateTime(timeline.plannedDate, timeline.plannedTime);
    const arrivalTime = new Date(startTime.getTime() + timeline.estimatedTravelTime * 60000);
    return arrivalTime;
  };

  // Calculate estimated completion time
  const getEstimatedCompletionTime = () => {
    const arrivalTime = getEstimatedArrivalTime();
    const completionTime = new Date(
      arrivalTime.getTime() + 
      timeline.estimatedDeliveryDuration * 60000 + 
      timeline.contingencyBuffer * 60000
    );
    return completionTime;
  };

  // Preset time options
  const timePresets = [
    { label: 'Early Morning', time: '06:00', description: 'Good for avoiding traffic' },
    { label: 'Morning', time: '08:00', description: 'Standard business hours' },
    { label: 'Late Morning', time: '10:00', description: 'After rush hour' },
    { label: 'Afternoon', time: '14:00', description: 'Post lunch delivery' },
    { label: 'Late Afternoon', time: '16:00', description: 'Before evening traffic' },
  ];

  // Duration presets
  const durationPresets = [
    { label: 'Quick (30 min)', duration: 30 },
    { label: 'Standard (1 hour)', duration: 60 },
    { label: 'Extended (2 hours)', duration: 120 },
    { label: 'Full Day (4 hours)', duration: 240 },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Delivery Timeline Planning</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm"
        >
          {showAdvanced ? 'Simple View' : 'Advanced Planning'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Input Fields */}
        <div className="space-y-4">
          {/* Date Selection */}
          <div className="space-y-2">
            <FormLabel htmlFor="plannedDate">Planned Delivery Date</FormLabel>
            <Input
              id="plannedDate"
              type="date"
              value={formatDateForInput(timeline.plannedDate)}
              onChange={(e) => updateTimeline('plannedDate', new Date(e.target.value))}
              onBlur={(e) => handleFieldBlur('plannedDate', new Date(e.target.value))}
              min={formatDateForInput(new Date())}
              className="w-full"
            />
            {errors.plannedDate && <FormMessage>{errors.plannedDate}</FormMessage>}
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <FormLabel htmlFor="plannedTime">Planned Start Time</FormLabel>
            <div className="flex gap-2">
              <Input
                id="plannedTime"
                type="time"
                value={timeline.plannedTime}
                onChange={(e) => updateTimeline('plannedTime', e.target.value)}
                onBlur={(e) => handleFieldBlur('plannedTime', e.target.value)}
                className="flex-1"
              />
            </div>
            {errors.plannedTime && <FormMessage>{errors.plannedTime}</FormMessage>}
            
            {/* Time Presets */}
            <div className="flex flex-wrap gap-1">
              {timePresets.map(preset => (
                <button
                  key={preset.time}
                  type="button"
                  onClick={() => updateTimeline('plannedTime', preset.time)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
                  title={preset.description}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Travel Time */}
          <div className="space-y-2">
            <FormLabel htmlFor="travelTime">Estimated Travel Time (minutes)</FormLabel>
            <div className="flex items-center gap-2">
              <Input
                id="travelTime"
                type="number"
                value={timeline.estimatedTravelTime}
                onChange={(e) => updateTimeline('estimatedTravelTime', parseInt(e.target.value) || 0)}
                onBlur={(e) => handleFieldBlur('estimatedTravelTime', parseInt(e.target.value) || 0)}
                min="0"
                className="flex-1"
              />
              <span className="text-sm text-gray-500">min</span>
              {travelTimeToLocation > 0 && timeline.estimatedTravelTime !== travelTimeToLocation && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateTimeline('estimatedTravelTime', travelTimeToLocation)}
                  className="text-xs whitespace-nowrap"
                >
                  Use GPS: {travelTimeToLocation}min
                </Button>
              )}
            </div>
            {errors.estimatedTravelTime && <FormMessage>{errors.estimatedTravelTime}</FormMessage>}
          </div>

          {/* Delivery Duration */}
          <div className="space-y-2">
            <FormLabel htmlFor="deliveryDuration">Estimated Delivery Duration</FormLabel>
            <div className="flex items-center gap-2">
              <Input
                id="deliveryDuration"
                type="number"
                value={timeline.estimatedDeliveryDuration}
                onChange={(e) => updateTimeline('estimatedDeliveryDuration', parseInt(e.target.value) || 60)}
                onBlur={(e) => handleFieldBlur('estimatedDeliveryDuration', parseInt(e.target.value) || 60)}
                min="1"
                className="flex-1"
              />
              <span className="text-sm text-gray-500">min</span>
            </div>
            {errors.estimatedDeliveryDuration && <FormMessage>{errors.estimatedDeliveryDuration}</FormMessage>}
            
            {/* Duration Presets */}
            <div className="flex flex-wrap gap-1">
              {durationPresets.map(preset => (
                <button
                  key={preset.duration}
                  type="button"
                  onClick={() => updateTimeline('estimatedDeliveryDuration', preset.duration)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Fields */}
          {showAdvanced && (
            <div className="space-y-4">
              {/* Contingency Buffer */}
              <div className="space-y-2">
                <FormLabel htmlFor="contingencyBuffer">Contingency Buffer (minutes)</FormLabel>
                <div className="flex items-center gap-2">
                  <Input
                    id="contingencyBuffer"
                    type="number"
                    value={timeline.contingencyBuffer}
                    onChange={(e) => updateTimeline('contingencyBuffer', parseInt(e.target.value) || 0)}
                    onBlur={(e) => handleFieldBlur('contingencyBuffer', parseInt(e.target.value) || 0)}
                    min="0"
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-500">min</span>
                </div>
                <p className="text-xs text-gray-600">
                  Extra time to account for delays, traffic, or unexpected circumstances
                </p>
                {errors.contingencyBuffer && <FormMessage>{errors.contingencyBuffer}</FormMessage>}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <FormLabel htmlFor="timelineNotes">Timeline Notes</FormLabel>
                <textarea
                  id="timelineNotes"
                  value={timeline.notes}
                  onChange={(e) => updateTimeline('notes', e.target.value)}
                  placeholder="Special instructions, route preferences, contact details..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Timeline Visualization */}
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Timeline Summary</h4>
            
            <div className="space-y-3">
              {/* Departure */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">
                  🚛
                </div>
                <div>
                  <p className="font-medium">Departure</p>
                  <p className="text-sm text-gray-600">
                    {combineDateTime(timeline.plannedDate, timeline.plannedTime).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Travel */}
              {timeline.estimatedTravelTime > 0 && (
                <div className="flex items-center gap-3 ml-4">
                  <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs">
                    🚗
                  </div>
                  <div>
                    <p className="text-sm">Travel ({timeline.estimatedTravelTime} min)</p>
                  </div>
                </div>
              )}

              {/* Arrival */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm">
                  📍
                </div>
                <div>
                  <p className="font-medium">Arrival</p>
                  <p className="text-sm text-gray-600">
                    {getEstimatedArrivalTime().toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Delivery */}
              <div className="flex items-center gap-3 ml-4">
                <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">
                  📦
                </div>
                <div>
                  <p className="text-sm">Delivery ({timeline.estimatedDeliveryDuration} min)</p>
                </div>
              </div>

              {/* Completion */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm">
                  ✅
                </div>
                <div>
                  <p className="font-medium">Estimated Completion</p>
                  <p className="text-sm text-gray-600">
                    {getEstimatedCompletionTime().toLocaleString()}
                  </p>
                  {showAdvanced && timeline.contingencyBuffer > 0 && (
                    <p className="text-xs text-gray-500">
                      Includes {timeline.contingencyBuffer} min buffer
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Total Time */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Total Time Required</span>
                <span className="font-semibold text-lg text-blue-600">
                  {timeline.estimatedTravelTime + timeline.estimatedDeliveryDuration + timeline.contingencyBuffer} min
                </span>
              </div>
              {showAdvanced && (
                <div className="text-xs text-gray-600 mt-1">
                  Travel: {timeline.estimatedTravelTime}min + 
                  Delivery: {timeline.estimatedDeliveryDuration}min + 
                  Buffer: {timeline.contingencyBuffer}min
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  updateTimeline('plannedDate', tomorrow);
                }}
                className="w-full justify-start"
              >
                📅 Schedule for Tomorrow
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  updateTimeline('estimatedDeliveryDuration', 60);
                  updateTimeline('contingencyBuffer', 30);
                }}
                className="w-full justify-start"
              >
                ⏰ Use Standard Timing
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  updateTimeline('plannedTime', '08:00');
                  updateTimeline('estimatedDeliveryDuration', 120);
                  updateTimeline('contingencyBuffer', 60);
                }}
                className="w-full justify-start"
              >
                🌅 Plan Full Day Response
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTimeForInput(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

function combineDateTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}