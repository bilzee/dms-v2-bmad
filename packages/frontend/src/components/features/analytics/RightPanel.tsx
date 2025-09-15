'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface RightPanelProps {}

export function RightPanel({}: RightPanelProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Key Metrics</CardTitle>
        <CardDescription>
          Important KPIs and real-time statistics
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[calc(100%-120px)] overflow-y-auto">
        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-blue-50">
            <h4 className="font-medium mb-1">Assessment Metrics</h4>
            <div className="text-2xl font-bold text-blue-600">--</div>
            <p className="text-xs text-gray-600">Real-time assessment data will be displayed here</p>
          </div>
          
          <div className="p-4 border rounded-lg bg-green-50">
            <h4 className="font-medium mb-1">Response Metrics</h4>
            <div className="text-2xl font-bold text-green-600">--</div>
            <p className="text-xs text-gray-600">Response tracking metrics will be displayed here</p>
          </div>
          
          <div className="p-4 border rounded-lg bg-orange-50">
            <h4 className="font-medium mb-1">Performance Metrics</h4>
            <div className="text-2xl font-bold text-orange-600">--</div>
            <p className="text-xs text-gray-600">System performance metrics will be displayed here</p>
          </div>
          
          <div className="p-4 border rounded-lg bg-purple-50">
            <h4 className="font-medium mb-1">Alert Summary</h4>
            <div className="text-2xl font-bold text-purple-600">--</div>
            <p className="text-xs text-gray-600">Critical alerts and notifications will be displayed here</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}