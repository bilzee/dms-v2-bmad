'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin,
  Users,
  Link,
  Unlink,
  Search,
  Filter,
  AlertTriangle,
  Building,
  Home,
  Plus,
  X,
  Map,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { 
  useIncidentData,
  useIncidentForms,
  useIncidentActions
} from '@/stores/incident.store';
import { 
  IncidentType, 
  IncidentSeverity, 
  IncidentStatus 
} from '@dms/shared';
import { format, formatDistanceToNow } from 'date-fns';

interface IncidentEntityLinkerProps {
  coordinatorId: string;
  coordinatorName: string;
  className?: string;
}

interface Entity {
  id: string;
  name: string;
  type: 'CAMP' | 'COMMUNITY';
  lga: string;
  ward: string;
  latitude: number;
  longitude: number;
  population: number;
  isLinked: boolean;
  linkDate?: Date;
  impactLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface IncidentWithEntities {
  id: string;
  name: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  linkedEntityCount: number;
  totalImpact: number;
}

export default function IncidentEntityLinker({
  coordinatorId,
  coordinatorName,
  className,
}: IncidentEntityLinkerProps) {
  const [selectedIncidentId, setSelectedIncidentId] = React.useState<string>('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [entityTypeFilter, setEntityTypeFilter] = React.useState<'ALL' | 'CAMP' | 'COMMUNITY'>('ALL');
  const [lgaFilter, setLgaFilter] = React.useState<string>('ALL');
  const [showLinkDialog, setShowLinkDialog] = React.useState(false);
  const [selectedEntities, setSelectedEntities] = React.useState<string[]>([]);
  const [activeTab, setActiveTab] = React.useState('entities');

  const { incidents, incidentStats } = useIncidentData();
  const { entityLinkingForm } = useIncidentForms();
  const { 
    linkEntitiesToIncident,
    unlinkEntityFromIncident,
    fetchIncidentDetail
  } = useIncidentActions();

  // Mock entity data - would come from entity store in real implementation
  const [allEntities] = React.useState<Entity[]>([
    {
      id: '1',
      name: 'Maiduguri Camp A',
      type: 'CAMP',
      lga: 'Maiduguri',
      ward: 'Bolori Ward',
      latitude: 11.8311,
      longitude: 13.1506,
      population: 15000,
      isLinked: true,
      linkDate: new Date(Date.now() - 86400000),
      impactLevel: 'HIGH'
    },
    {
      id: '2',
      name: 'Bama Community Center',
      type: 'COMMUNITY',
      lga: 'Bama',
      ward: 'Central Ward',
      latitude: 11.5204,
      longitude: 13.6896,
      population: 8500,
      isLinked: false,
      impactLevel: 'MEDIUM'
    },
    {
      id: '3',
      name: 'Monguno Camp B',
      type: 'CAMP',
      lga: 'Monguno',
      ward: 'Town Ward',
      latitude: 12.6743,
      longitude: 13.6092,
      population: 12000,
      isLinked: true,
      linkDate: new Date(Date.now() - 172800000),
      impactLevel: 'HIGH'
    },
    {
      id: '4',
      name: 'Konduga Village',
      type: 'COMMUNITY',
      lga: 'Konduga',
      ward: 'Konduga Ward',
      latitude: 11.8833,
      longitude: 13.4167,
      population: 5200,
      isLinked: false,
      impactLevel: 'LOW'
    },
    {
      id: '5',
      name: 'Dikwa Settlement',
      type: 'COMMUNITY',
      lga: 'Dikwa',
      ward: 'Dikwa Ward',
      latitude: 12.0333,
      longitude: 13.9167,
      population: 7800,
      isLinked: false,
      impactLevel: 'MEDIUM'
    }
  ]);

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId);

  const filteredEntities = allEntities.filter(entity => {
    const matchesSearch = entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entity.lga.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entity.ward.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = entityTypeFilter === 'ALL' || entity.type === entityTypeFilter;
    const matchesLGA = lgaFilter === 'ALL' || entity.lga === lgaFilter;
    
    return matchesSearch && matchesType && matchesLGA;
  });

  const linkedEntities = filteredEntities.filter(entity => entity.isLinked);
  const availableEntities = filteredEntities.filter(entity => !entity.isLinked);
  const uniqueLGAs = [...new Set(allEntities.map(e => e.lga))];

  const getImpactBadgeColor = (impact: string) => {
    switch (impact) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    // Haversine formula for calculating distance between two points
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleEntityToggle = (entityId: string, checked: boolean) => {
    if (checked) {
      setSelectedEntities(prev => [...prev, entityId]);
    } else {
      setSelectedEntities(prev => prev.filter(id => id !== entityId));
    }
  };

  const handleLinkEntities = async () => {
    if (!selectedIncidentId || selectedEntities.length === 0) return;

    try {
      await linkEntitiesToIncident(selectedIncidentId, selectedEntities);
      setSelectedEntities([]);
      setShowLinkDialog(false);
      // Update local state to reflect changes
      // In real implementation, this would refresh from the backend
    } catch (error) {
      console.error('Failed to link entities:', error);
    }
  };

  const handleUnlinkEntity = async (entityId: string) => {
    if (!selectedIncidentId) return;

    try {
      await unlinkEntityFromIncident(selectedIncidentId, entityId);
      // Update local state to reflect changes
    } catch (error) {
      console.error('Failed to unlink entity:', error);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Incident-Entity Relationships</h2>
          <p className="text-muted-foreground">
            Manage affected entity relationships and assess geographic impact
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {linkedEntities.length} Linked
          </Badge>
          <Badge variant="outline">
            {availableEntities.length} Available
          </Badge>
        </div>
      </div>

      {/* Incident Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Select Incident
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedIncidentId} onValueChange={setSelectedIncidentId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an incident to manage entity relationships..." />
            </SelectTrigger>
            <SelectContent>
              {incidents.map((incident) => (
                <SelectItem key={incident.id} value={incident.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{incident.name}</span>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge variant="outline" className="text-xs">
                        {incident.affectedEntityCount} entities
                      </Badge>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedIncident && (
        <>
          {/* Incident Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  {selectedIncident.name}
                </div>
                <Button 
                  onClick={() => setShowLinkDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Link Entities
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span> {selectedIncident.type}
                </div>
                <div>
                  <span className="font-medium">Severity:</span> {selectedIncident.severity}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {selectedIncident.status}
                </div>
                <div>
                  <span className="font-medium">Linked Entities:</span> {linkedEntities.length}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="entities">Entity Management</TabsTrigger>
              <TabsTrigger value="map">Geographic View</TabsTrigger>
              <TabsTrigger value="analytics">Impact Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="entities" className="space-y-4">
              {/* Search and Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search entities by name, LGA, or ward..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Select value={entityTypeFilter} onValueChange={(value: any) => setEntityTypeFilter(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Types</SelectItem>
                          <SelectItem value="CAMP">Camps Only</SelectItem>
                          <SelectItem value="COMMUNITY">Communities Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Select value={lgaFilter} onValueChange={setLgaFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All LGAs</SelectItem>
                          {uniqueLGAs.map(lga => (
                            <SelectItem key={lga} value={lga}>{lga}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Button variant="outline" className="w-full">
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Linked Entities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="h-5 w-5 text-green-600" />
                    Linked Entities ({linkedEntities.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {linkedEntities.length === 0 ? (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        No entities are currently linked to this incident. Use the &quot;Link Entities&quot; button to add affected entities.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      {linkedEntities.map((entity) => (
                        <Card key={entity.id} className="border-green-200 bg-green-50/50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="flex items-center gap-2">
                                    {entity.type === 'CAMP' ? (
                                      <Building className="h-4 w-4 text-blue-600" />
                                    ) : (
                                      <Home className="h-4 w-4 text-purple-600" />
                                    )}
                                    <span className="font-medium">{entity.name}</span>
                                  </div>
                                  <Badge variant="outline">
                                    {entity.type}
                                  </Badge>
                                  {entity.impactLevel && (
                                    <Badge 
                                      variant="outline" 
                                      className={getImpactBadgeColor(entity.impactLevel)}
                                    >
                                      {entity.impactLevel} Impact
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {entity.lga} LGA, {entity.ward}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {entity.population.toLocaleString()} population
                                  </div>
                                  <div>
                                    Linked {entity.linkDate && formatDistanceToNow(entity.linkDate, { addSuffix: true })}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnlinkEntity(entity.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Unlink className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Available Entities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Available Entities ({availableEntities.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {availableEntities.map((entity) => (
                      <Card key={entity.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                  {entity.type === 'CAMP' ? (
                                    <Building className="h-4 w-4 text-blue-600" />
                                  ) : (
                                    <Home className="h-4 w-4 text-purple-600" />
                                  )}
                                  <span className="font-medium">{entity.name}</span>
                                </div>
                                <Badge variant="outline">
                                  {entity.type}
                                </Badge>
                                {entity.impactLevel && (
                                  <Badge 
                                    variant="outline" 
                                    className={getImpactBadgeColor(entity.impactLevel)}
                                  >
                                    Potential {entity.impactLevel} Impact
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {entity.lga} LGA, {entity.ward}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {entity.population.toLocaleString()} population
                                </div>
                                <div>
                                  {/* Distance calculation would go here */}
                                  Est. impact zone
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedEntities([entity.id]);
                                  setShowLinkDialog(true);
                                }}
                                className="flex items-center gap-2"
                              >
                                <Link className="h-4 w-4" />
                                Link
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="map">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5" />
                    Geographic Impact Visualization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-64 bg-gray-100 rounded border-2 border-dashed">
                    <div className="text-center">
                      <Map className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500">Interactive map would be implemented here</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Showing incident location and affected entity relationships
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Impact Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>High Impact Entities</span>
                        <Badge className="bg-red-100 text-red-800">
                          {linkedEntities.filter(e => e.impactLevel === 'HIGH').length}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Medium Impact Entities</span>
                        <Badge className="bg-yellow-100 text-yellow-800">
                          {linkedEntities.filter(e => e.impactLevel === 'MEDIUM').length}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Low Impact Entities</span>
                        <Badge className="bg-green-100 text-green-800">
                          {linkedEntities.filter(e => e.impactLevel === 'LOW').length}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Population Impact
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Total Affected Population</span>
                        <Badge variant="outline">
                          {linkedEntities.reduce((sum, e) => sum + e.population, 0).toLocaleString()}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Camps Affected</span>
                        <Badge variant="outline">
                          {linkedEntities.filter(e => e.type === 'CAMP').length}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Communities Affected</span>
                        <Badge variant="outline">
                          {linkedEntities.filter(e => e.type === 'COMMUNITY').length}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Link Entities Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Link Entities to Incident</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {availableEntities.map((entity) => (
              <div key={entity.id} className="flex items-center space-x-3 p-3 border rounded">
                <Checkbox
                  id={`link-entity-${entity.id}`}
                  checked={selectedEntities.includes(entity.id)}
                  onCheckedChange={(checked) => handleEntityToggle(entity.id, !!checked)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {entity.type === 'CAMP' ? (
                      <Building className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Home className="h-4 w-4 text-purple-600" />
                    )}
                    <span className="font-medium">{entity.name}</span>
                    <Badge variant="outline">{entity.type}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {entity.lga} LGA • {entity.population.toLocaleString()} population
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedEntities.length} entities selected
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleLinkEntities}
                disabled={selectedEntities.length === 0}
              >
                Link {selectedEntities.length} Entities
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}