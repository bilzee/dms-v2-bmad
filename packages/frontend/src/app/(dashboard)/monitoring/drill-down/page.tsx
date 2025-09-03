'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BarChart3, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DetailedAssessmentView } from '@/components/features/monitoring/DetailedAssessmentView';
import { DetailedResponseView } from '@/components/features/monitoring/DetailedResponseView';
import { DetailedIncidentView } from '@/components/features/monitoring/DetailedIncidentView';
import { DetailedEntityView } from '@/components/features/monitoring/DetailedEntityView';
import { DrillDownFilters } from '@/components/features/monitoring/DrillDownFilters';
import { HistoricalComparisonChart } from '@/components/features/monitoring/HistoricalComparisonChart';
import { DataExportModal } from '@/components/features/monitoring/DataExportModal';
import { useDrillDownFilters } from '@/hooks/useDrillDownFilters';

export default function DrillDownPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('assessments');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'assessments' | 'responses' | 'incidents' | 'entities'>('assessments');
  
  const {
    filters,
    updateFilters,
    clearFilters,
    hasActiveFilters,
    getShareableUrl,
  } = useDrillDownFilters();

  const handleDrillDown = (id: string) => {
    console.log(`Drilling down into ${activeTab} item:`, id);
    // Would navigate to detailed individual record view
  };

  const handleExport = (type: string) => {
    setExportType(type as typeof exportType);
    setShowExportModal(true);
  };

  const getTabFilters = () => {
    // Convert general filters to tab-specific format
    const baseFilters = {
      incidentIds: filters.incidentIds,
      entityIds: filters.entityIds,
      timeframe: filters.timeframe,
    };

    switch (activeTab) {
      case 'assessments':
        return {
          ...baseFilters,
          assessmentTypes: filters.dataTypes,
          verificationStatus: filters.statusFilters,
        };
      case 'responses':
        return {
          ...baseFilters,
          responseTypes: filters.dataTypes,
          status: filters.statusFilters,
        };
      case 'incidents':
        return {
          ...baseFilters,
          types: filters.dataTypes,
          statuses: filters.statusFilters,
        };
      case 'entities':
        return {
          ...baseFilters,
          entityTypes: filters.dataTypes,
        };
      default:
        return baseFilters;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Monitoring
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Drill-Down Analysis</h2>
            <p className="text-muted-foreground">
              Detailed data exploration with filtering, export, and historical comparison
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigator.share({ url: getShareableUrl() })}>
            Share Filters
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport(activeTab)}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      <DrillDownFilters
        dataType={activeTab as 'assessments' | 'responses' | 'incidents' | 'entities'}
        onFiltersChange={updateFilters}
        onClearFilters={clearFilters}
        initialFilters={filters}
      />

      {/* Main Drill-Down Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="entities">Entities</TabsTrigger>
        </TabsList>

        <TabsContent value="assessments" className="space-y-4">
          <DetailedAssessmentView
            filters={getTabFilters()}
            onDrillDown={handleDrillDown}
            onExport={handleExport}
          />
          <HistoricalComparisonChart 
            dataType="assessments"
            timeRange="30d"
            onMetricSelect={(metric) => console.log('Selected metric:', metric)}
          />
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          <DetailedResponseView
            filters={getTabFilters()}
            onDrillDown={handleDrillDown}
            onExport={handleExport}
          />
          <HistoricalComparisonChart 
            dataType="responses"
            timeRange="30d"
            onMetricSelect={(metric) => console.log('Selected metric:', metric)}
          />
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <DetailedIncidentView
            filters={getTabFilters()}
            onDrillDown={handleDrillDown}
            onExport={handleExport}
          />
        </TabsContent>

        <TabsContent value="entities" className="space-y-4">
          <DetailedEntityView
            filters={getTabFilters()}
            onDrillDown={handleDrillDown}
            onExport={handleExport}
          />
          <HistoricalComparisonChart 
            dataType="entities"
            timeRange="30d"
            onMetricSelect={(metric) => console.log('Selected metric:', metric)}
          />
        </TabsContent>
      </Tabs>

      {/* Export Modal */}
      <DataExportModal
        dataType={exportType}
        filters={getTabFilters()}
        open={showExportModal}
        onOpenChange={setShowExportModal}
      />
    </div>
  );
}