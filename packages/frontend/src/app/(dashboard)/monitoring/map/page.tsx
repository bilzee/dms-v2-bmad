'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Map, Layers, Globe, MapPin, Activity, BarChart3 } from 'lucide-react';
import LeafletMap from '@/components/features/monitoring/LeafletMap';

interface MapEntityData {
  id: string;
  name: string;
  type: 'CAMP' | 'COMMUNITY';
  longitude: number;
  latitude: number;
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
    captureMethod: 'GPS' | 'MANUAL' | 'MAP_SELECT';
  };
  assessmentCount: number;
  responseCount: number;
  lastActivity: Date;
  statusSummary: {
    pendingAssessments: number;
    verifiedAssessments: number;
    activeResponses: number;
    completedResponses: number;
  };
}

interface MapAssessmentData {
  id: string;
  entityName: string;
  entityType: 'CAMP' | 'COMMUNITY';
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
    captureMethod: 'GPS' | 'MANUAL' | 'MAP_SELECT';
  };
  assessmentCount: number;
  totalAssessments: number;
}

interface MapResponseData {
  id: string;
  entityName: string;
  entityType: 'CAMP' | 'COMMUNITY';
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
    captureMethod: 'GPS' | 'MANUAL' | 'MAP_SELECT';
  };
  responseCount: number;
  totalResponses: number;
}

interface MapOverview {
  entities: MapEntityData[];
  assessments: MapAssessmentData[];
  responses: MapResponseData[];
  totalEntities: number;
  totalAssessments: number;
  totalResponses: number;
  activeResponses: number;
  boundingBox: {
    northEast: { latitude: number; longitude: number };
    southWest: { latitude: number; longitude: number };
  };
}

interface LayerVisibility {
  entities: boolean;
  assessments: boolean;
  responses: boolean;
}

export default function InteractiveMap() {
  const [mapData, setMapData] = useState<MapOverview | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'degraded' | 'offline'>('connected');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshInterval] = useState(25000); // 25 seconds - established pattern
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    entities: true,
    assessments: true,
    responses: true,
  });

  const fetchMapData = async () => {
    try {
      const [entitiesResponse, assessmentsResponse, responsesResponse] = await Promise.all([
        fetch('/api/v1/monitoring/map/entities'),
        fetch('/api/v1/monitoring/map/assessments'),
        fetch('/api/v1/monitoring/map/responses')
      ]);
      
      const entitiesData = await entitiesResponse.json();
      const assessmentsData = await assessmentsResponse.json();
      const responsesData = await responsesResponse.json();
      
      if (entitiesData.success && assessmentsData.success && responsesData.success) {
        // Use bounding box from entities data (since assessments and responses are now aggregated)
        const boundingBox = entitiesData.meta.boundingBox;
        
        // Use actual counts from the API responses
        const totalAssessments = assessmentsData.data.length; // 80 individual assessments
        const totalResponses = responsesData.data.length; // 25 individual responses
        
        // Calculate active responses from the responses data
        const activeResponses = responsesData.data.filter((r: any) => 
          r.status === 'IN_PROGRESS' || r.status === 'PLANNED'
        ).length;
        
        setMapData({
          entities: entitiesData.data,
          assessments: assessmentsData.data,
          responses: responsesData.data,
          totalEntities: entitiesData.meta.totalEntities,
          totalAssessments,
          totalResponses,
          activeResponses, // Add active responses count
          boundingBox,
        });
        setConnectionStatus(entitiesData.meta.connectionStatus);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch map data:', error);
      setConnectionStatus('offline');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
    
    const interval = setInterval(fetchMapData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getConnectionBadgeVariant = (status: string) => {
    switch (status) {
      case 'connected': return 'default';
      case 'degraded': return 'secondary';
      case 'offline': return 'destructive';
      default: return 'outline';
    }
  };

  const toggleLayer = (layer: keyof LayerVisibility) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  };


  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Interactive Mapping</h2>
            <p className="text-muted-foreground">Loading geographic visualization data...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-100 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-64 bg-gray-100 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!mapData) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Interactive Mapping</h2>
            <p className="text-muted-foreground">Unable to load geographic data</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Failed to fetch geographic mapping data. Please check your connection and try refreshing.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Interactive Mapping</h2>
          <p className="text-muted-foreground">
            Geographic visualization of affected entities with aggregated assessment and response counts
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={getConnectionBadgeVariant(connectionStatus)} className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {connectionStatus.toUpperCase()}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMapData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Map Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entities</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mapData.totalEntities}</div>
            <p className="text-xs text-muted-foreground">
              Camps and communities with GPS coordinates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mapData.totalAssessments || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total assessments across all entities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mapData.totalResponses || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total responses across all entities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coverage Area</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                Math.abs(mapData.boundingBox.northEast.latitude - mapData.boundingBox.southWest.latitude) *
                Math.abs(mapData.boundingBox.northEast.longitude - mapData.boundingBox.southWest.longitude) * 111
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Approx. square kilometers covered
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Map Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Map Layer Controls
          </CardTitle>
          <CardDescription>
            Toggle visibility of entity markers. Assessment and response counts are displayed as badges on entity markers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={layerVisibility.entities ? "default" : "outline"}
              size="sm"
              onClick={() => toggleLayer('entities')}
              className="flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              Entity Markers ({mapData.totalEntities})
            </Button>
            <Button
              variant={layerVisibility.assessments ? "default" : "outline"}
              size="sm"
              onClick={() => toggleLayer('assessments')}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Assessment Counts ({mapData.totalAssessments || 0})
            </Button>
            <Button
              variant={layerVisibility.responses ? "default" : "outline"}
              size="sm"
              onClick={() => toggleLayer('responses')}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Response Counts ({mapData.totalResponses || 0})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Geographic Visualization
          </CardTitle>
          <CardDescription>
            Interactive map showing affected entities with assessment and response counts displayed as badges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeafletMap mapData={mapData} layerVisibility={layerVisibility} />
        </CardContent>
      </Card>

      {/* Map Status Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
        <div className="flex items-center gap-4">
          <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          <span>Auto-refresh every {refreshInterval / 1000} seconds</span>
          <span>Map center: {mapData ? 
            [(mapData.boundingBox.northEast.latitude + mapData.boundingBox.southWest.latitude) / 2,
             (mapData.boundingBox.northEast.longitude + mapData.boundingBox.southWest.longitude) / 2]
             .map(coord => coord.toFixed(3)).join(', ') : 
            '12.000, 14.000'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Layers active: {Object.values(layerVisibility).filter(Boolean).length}/3</span>
          <Badge variant="outline" className="text-xs">
            Connection: {connectionStatus}
          </Badge>
        </div>
      </div>
    </div>
  );
}