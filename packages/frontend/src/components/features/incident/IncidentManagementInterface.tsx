'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AlertCircle, 
  Filter, 
  Search, 
  RefreshCw, 
  Eye, 
  Plus, 
  MapPin, 
  Calendar,
  Users,
  Activity,
  Zap,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { 
  useIncidentStore,
  useIncidentData, 
  useIncidentFilters, 
  useIncidentSelection,
  useIncidentPreview,
  useIncidentForms 
} from '@/stores/incident.store';
import { 
  IncidentType, 
  IncidentSeverity, 
  IncidentStatus 
} from '@dms/shared';
import { format, formatDistanceToNow } from 'date-fns';
import IncidentCreationForm from './IncidentCreationForm';
import IncidentStatusTracker from './IncidentStatusTracker';
import IncidentEntityLinker from './IncidentEntityLinker';

interface IncidentManagementInterfaceProps {
  className?: string;
  coordinatorId: string;
  coordinatorName: string;
}

const SeverityBadge: React.FC<{ severity: IncidentSeverity }> = ({ severity }) => {
  const variants = {
    MINOR: 'bg-green-100 text-green-800 border-green-200',
    MODERATE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    SEVERE: 'bg-orange-100 text-orange-800 border-orange-200',
    CATASTROPHIC: 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <Badge variant="outline" className={`${variants[severity]} border`}>
      {severity}
    </Badge>
  );
};

const StatusBadge: React.FC<{ status: IncidentStatus }> = ({ status }) => {
  const variants = {
    ACTIVE: 'bg-red-100 text-red-800 border-red-200',
    CONTAINED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    RESOLVED: 'bg-green-100 text-green-800 border-green-200'
  };

  const icons = {
    ACTIVE: <Zap className="h-3 w-3" />,
    CONTAINED: <Clock className="h-3 w-3" />,
    RESOLVED: <CheckCircle2 className="h-3 w-3" />
  };

  return (
    <Badge variant="outline" className={`${variants[status]} border flex items-center gap-1`}>
      {icons[status]}
      {status}
    </Badge>
  );
};

const TypeBadge: React.FC<{ type: IncidentType }> = ({ type }) => {
  const variants = {
    FLOOD: 'bg-blue-100 text-blue-800 border-blue-200',
    FIRE: 'bg-red-100 text-red-800 border-red-200',
    LANDSLIDE: 'bg-orange-100 text-orange-800 border-orange-200',
    CYCLONE: 'bg-purple-100 text-purple-800 border-purple-200',
    CONFLICT: 'bg-gray-100 text-gray-800 border-gray-200',
    EPIDEMIC: 'bg-pink-100 text-pink-800 border-pink-200',
    EARTHQUAKE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    WILDFIRE: 'bg-red-200 text-red-900 border-red-300',
    OTHER: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  return (
    <Badge variant="outline" className={`${variants[type]} border`}>
      {type}
    </Badge>
  );
};

export const IncidentManagementInterface: React.FC<IncidentManagementInterfaceProps> = ({
  className,
  coordinatorId,
  coordinatorName,
}) => {
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  
  const { incidents, incidentStats, pagination, isLoading, error } = useIncidentData();
  const { 
    filters, 
    sortBy, 
    sortOrder, 
    searchTerm,
    setFilters, 
    setSorting, 
    setSearchTerm 
  } = useIncidentFilters();
  const { 
    selectedIncidentIds, 
    toggleIncidentSelection, 
    selectAllVisible, 
    clearSelection, 
    getSelectedCount 
  } = useIncidentSelection();
  const { 
    isPreviewOpen, 
    previewIncident, 
    openPreview, 
    closePreview,
    isLoadingDetail 
  } = useIncidentPreview();
  const { 
    creationForm,
    statusUpdateForm,
    entityLinkingForm,
    openCreationForm 
  } = useIncidentForms();
  const { 
    fetchIncidents, 
    setPage,
    refreshStats 
  } = useIncidentStore();

  // Initialize data on mount
  React.useEffect(() => {
    fetchIncidents();
    refreshStats();
  }, [fetchIncidents, refreshStats]);

  // Handle search with debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(debouncedSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [debouncedSearch, setSearchTerm]);

  const handleSort = (column: 'priority' | 'date' | 'type' | 'status' | 'severity') => {
    const newOrder = sortBy === column && sortOrder === 'desc' ? 'asc' : 'desc';
    setSorting(column, newOrder);
  };

  const handleSelectAll = () => {
    if (selectedIncidentIds.length === incidents.length) {
      clearSelection();
    } else {
      selectAllVisible();
    }
  };

  const handlePreview = async (incidentId: string) => {
    await openPreview(incidentId);
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return '↕️';
    return sortOrder === 'desc' ? '↓' : '↑';
  };

  if (error) {
    return (
      <Card className={cn('border-destructive', className)}>
        <CardContent className="flex items-center gap-2 p-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">Failed to load incident management data: {error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchIncidents()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Incident Management</h1>
          <p className="text-muted-foreground">
            Coordinate multi-phase incident responses and track status progression
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => openCreationForm()}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Incident
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              fetchIncidents();
              refreshStats();
            }} 
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Incidents</p>
                <p className="text-2xl font-bold">{incidentStats.totalIncidents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-red-600">{incidentStats.activeIncidents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold text-orange-600">{incidentStats.highPriorityIncidents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recently Updated</p>
                <p className="text-2xl font-bold">{incidentStats.recentlyUpdated}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="timeline">Status Timeline</TabsTrigger>
          <TabsTrigger value="entities">Entity Relations</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search incidents by name, type, or location..."
                    value={debouncedSearch}
                    onChange={(e) => setDebouncedSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>

              {/* Advanced Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select
                    value={filters.status?.[0] || 'all'}
                    onValueChange={(value) => {
                      if (value === 'all') {
                        setFilters({ status: undefined });
                      } else {
                        setFilters({ status: [value as IncidentStatus] });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {Object.values(IncidentStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Severity</label>
                  <Select
                    value={filters.severity?.[0] || 'all'}
                    onValueChange={(value) => {
                      if (value === 'all') {
                        setFilters({ severity: undefined });
                      } else {
                        setFilters({ severity: [value as IncidentSeverity] });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Severities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      {Object.values(IncidentSeverity).map((severity) => (
                        <SelectItem key={severity} value={severity}>
                          {severity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <Select
                    value={filters.type?.[0] || 'all'}
                    onValueChange={(value) => {
                      if (value === 'all') {
                        setFilters({ type: undefined });
                      } else {
                        setFilters({ type: [value as IncidentType] });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.values(IncidentType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Sort by</label>
                  <Select
                    value={`${sortBy}_${sortOrder}`}
                    onValueChange={(value) => {
                      const [column, order] = value.split('_');
                      setSorting(column as any, order as 'asc' | 'desc');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date_desc">Newest First</SelectItem>
                      <SelectItem value="date_asc">Oldest First</SelectItem>
                      <SelectItem value="severity_desc">Severity (High to Low)</SelectItem>
                      <SelectItem value="priority_desc">Priority (High to Low)</SelectItem>
                      <SelectItem value="status_asc">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Incident List */}
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/4" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : incidents.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No incidents found matching your criteria.</p>
                <Button 
                  onClick={() => openCreationForm()}
                  variant="outline"
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Incident
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <Card key={incident.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold">{incident.name}</h3>
                          <TypeBadge type={incident.type} />
                          <SeverityBadge severity={incident.severity} />
                          <StatusBadge status={incident.status} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Created {formatDistanceToNow(new Date(incident.date), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{incident.affectedEntityCount} affected entities</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            <span>{incident.assessmentCount} assessments</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              Updated {formatDistanceToNow(new Date(incident.lastUpdated), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(incident.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline">
          <IncidentStatusTracker 
            coordinatorId={coordinatorId}
            coordinatorName={coordinatorName}
          />
        </TabsContent>

        <TabsContent value="entities">
          <IncidentEntityLinker 
            coordinatorId={coordinatorId}
            coordinatorName={coordinatorName}
          />
        </TabsContent>
      </Tabs>

      {/* Incident Creation Form */}
      {creationForm.isOpen && (
        <IncidentCreationForm
          coordinatorId={coordinatorId}
          coordinatorName={coordinatorName}
          initialData={creationForm.initialData}
          fromAssessmentId={creationForm.fromAssessmentId}
        />
      )}

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={closePreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Incident Details</DialogTitle>
          </DialogHeader>
          {isLoadingDetail ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : previewIncident ? (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">{previewIncident.name}</h3>
                    <TypeBadge type={previewIncident.type} />
                    <SeverityBadge severity={previewIncident.severity} />
                    <StatusBadge status={previewIncident.status} />
                  </div>
                  {previewIncident.description && (
                    <p className="text-muted-foreground">{previewIncident.description}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Date:</span> {format(new Date(previewIncident.date), 'PPP')}
                </div>
                <div>
                  <span className="font-medium">Source:</span> {previewIncident.source || 'Manual Entry'}
                </div>
                <div>
                  <span className="font-medium">Affected Entities:</span> {previewIncident.affectedEntityCount}
                </div>
                <div>
                  <span className="font-medium">Action Items:</span> {previewIncident.actionItems?.length || 0}
                </div>
              </div>

              {previewIncident.coordinates && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {previewIncident.coordinates.latitude.toFixed(6)}, {previewIncident.coordinates.longitude.toFixed(6)}
                  </span>
                </div>
              )}

              {/* Timeline would go here */}
              {previewIncident.timeline && previewIncident.timeline.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Recent Activity</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {previewIncident.timeline.slice(0, 5).map((event) => (
                      <div key={event.id} className="text-sm border-l-2 border-muted pl-4 py-1">
                        <div className="font-medium">{event.description}</div>
                        <div className="text-muted-foreground">
                          {event.coordinatorName} • {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};