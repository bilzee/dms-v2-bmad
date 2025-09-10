'use client';

import { useState, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BarChart3, Download, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useDrillDownFilters } from '@/hooks/useDrillDownFilters';

// Epic 10: Dynamic imports for performance optimization - Lazy load heavy monitoring components
const DetailedAssessmentView = dynamic(
  () => import('@/components/features/monitoring/DetailedAssessmentView').then(mod => ({ default: mod.DetailedAssessmentView })),
  { 
    loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>,
    ssr: false 
  }
);

const DetailedResponseView = dynamic(
  () => import('@/components/features/monitoring/DetailedResponseView').then(mod => ({ default: mod.DetailedResponseView })),
  { 
    loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>,
    ssr: false 
  }
);

const DetailedIncidentView = dynamic(
  () => import('@/components/features/monitoring/DetailedIncidentView').then(mod => ({ default: mod.DetailedIncidentView })),
  { 
    loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>,
    ssr: false 
  }
);

const DetailedEntityView = dynamic(
  () => import('@/components/features/monitoring/DetailedEntityView').then(mod => ({ default: mod.DetailedEntityView })),
  { 
    loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>,
    ssr: false 
  }
);

const DrillDownFilters = dynamic(
  () => import('@/components/features/monitoring/DrillDownFilters').then(mod => ({ default: mod.DrillDownFilters })),
  { 
    loading: () => <div className="h-16 bg-gray-100 rounded animate-pulse" />,
    ssr: false 
  }
);

const HistoricalComparisonChart = dynamic(
  () => import('@/components/features/monitoring/HistoricalComparisonChart').then(mod => ({ default: mod.HistoricalComparisonChart })),
  { 
    loading: () => <div className="h-64 bg-gray-100 rounded animate-pulse" />,
    ssr: false 
  }
);

const DataExportModal = dynamic(
  () => import('@/components/features/monitoring/DataExportModal').then(mod => ({ default: mod.DataExportModal })),
  { 
    loading: () => null,
    ssr: false 
  }
);

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