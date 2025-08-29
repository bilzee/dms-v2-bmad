'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssessmentQueue, QueueSummary, PriorityQueueVisualization, PriorityRuleManager } from '@/components/features/sync';
import { SampleDataService } from '@/lib/services/SampleDataService';
import { useSyncStore } from '@/stores/sync.store';
import { Plus, Trash2, RefreshCw, Database } from 'lucide-react';

export default function QueuePage() {
  const router = useRouter();
  const { 
    queue, 
    filteredQueue, 
    currentFilters, 
    isLoading, 
    error, 
    loadQueue, 
    updateFilters, 
    retryQueueItem, 
    removeQueueItem,
    clearError 
  } = useSyncStore();
  
  const [showSampleDataButtons, setShowSampleDataButtons] = useState(true);
  const [activeTab, setActiveTab] = useState('queue');
  const sampleDataService = new SampleDataService();

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleAddSampleData = async () => {
    try {
      await sampleDataService.addSampleQueueData();
      await loadQueue(); // Refresh the data
    } catch (error) {
      console.error('Failed to add sample data:', error);
    }
  };

  const handleClearSampleData = async () => {
    try {
      await sampleDataService.clearSampleData();
      await loadQueue(); // Refresh the data
    } catch (error) {
      console.error('Failed to clear sample data:', error);
    }
  };

  const handleSimulateProcessing = async () => {
    try {
      await sampleDataService.simulateQueueProcessing();
      await loadQueue(); // Refresh the data
    } catch (error) {
      console.error('Failed to simulate processing:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sync Queue Management
          </h1>
          <p className="text-gray-600">
            Monitor and manage offline assessment queue items
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            ← Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Sample Data Controls (for testing) */}
      {showSampleDataButtons && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-800 mb-1">Development Mode</h3>
              <p className="text-xs text-blue-600">Add sample data to test queue functionality</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddSampleData}
                className="flex items-center gap-2 text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                <Database className="w-4 h-4" />
                Add Sample Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSimulateProcessing}
                className="flex items-center gap-2 text-green-700 border-green-300 hover:bg-green-100"
              >
                <RefreshCw className="w-4 h-4" />
                Simulate Processing
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSampleData}
                className="flex items-center gap-2 text-red-700 border-red-300 hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4" />
                Clear Data
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSampleDataButtons(false)}
                className="text-gray-500"
              >
                ×
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Queue Summary Widget - only show on queue tab */}
      {activeTab === 'queue' && (
        <div className="mb-8">
          <QueueSummary className="max-w-2xl" />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-sm font-medium">Error:</span>
              <span className="text-red-700 text-sm">{error}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Main Content with Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0">
            <TabsTrigger value="queue" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-6 py-3">
              Sync Queue
            </TabsTrigger>
            <TabsTrigger value="priority" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-6 py-3">
              Priority View
            </TabsTrigger>
            <TabsTrigger value="rules" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-6 py-3">
              Priority Rules
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="queue" className="mt-0 border-t-0">
            <AssessmentQueue
              items={filteredQueue}
              isLoading={isLoading}
              onRetry={retryQueueItem}
              onRemove={removeQueueItem}
              onFilterChange={updateFilters}
              currentFilters={currentFilters}
            />
          </TabsContent>
          
          <TabsContent value="priority" className="mt-0 border-t-0 p-6">
            <PriorityQueueVisualization />
          </TabsContent>
          
          <TabsContent value="rules" className="mt-0 border-t-0 p-6">
            <PriorityRuleManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Additional Actions - only show refresh on queue tab */}
      {activeTab === 'queue' && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => loadQueue()}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </Button>
        </div>
      )}
    </div>
  );
}