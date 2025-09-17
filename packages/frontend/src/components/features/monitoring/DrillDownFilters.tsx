'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Filter, X, CalendarIcon, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

interface FilterState {
  incidentIds: string[];
  entityIds: string[];
  timeframe?: { start: string; end: string };
  dataTypes: string[];
  statusFilters: string[];
}

interface DrillDownFiltersProps {
  dataType: 'assessments' | 'responses' | 'incidents' | 'entities';
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  initialFilters?: Partial<FilterState>;
}

export function DrillDownFilters({
  dataType,
  onFiltersChange,
  onClearFilters,
  initialFilters = {},
}: DrillDownFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    incidentIds: initialFilters.incidentIds || [],
    entityIds: initialFilters.entityIds || [],
    timeframe: initialFilters.timeframe,
    dataTypes: initialFilters.dataTypes || [],
    statusFilters: initialFilters.statusFilters || [],
  });
  
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialFilters.timeframe?.start ? new Date(initialFilters.timeframe.start) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialFilters.timeframe?.end ? new Date(initialFilters.timeframe.end) : undefined
  );
  const [isOpen, setIsOpen] = useState(false);
  const [incidents, setIncidents] = useState<{ id: string; name: string }[]>([]);
  const [entities, setEntities] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // Fetch incidents and entities for filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      setIsLoadingOptions(true);
      try {
        // Fetch incidents
        const incidentsResponse = await fetch('/api/v1/incidents');
        if (incidentsResponse.ok) {
          const incidentsData = await incidentsResponse.json();
          if (incidentsData.success && incidentsData.data.incidents) {
            setIncidents(incidentsData.data.incidents.map((incident: any) => ({
              id: incident.id,
              name: incident.name
            })));
          }
        }

        // Fetch entities from assessments data
        const assessmentsResponse = await fetch('/api/v1/monitoring/drill-down/assessments');
        if (assessmentsResponse.ok) {
          const assessmentsData = await assessmentsResponse.json();
          if (assessmentsData.success) {
            // Extract unique entities from assessments
            const uniqueEntities = assessmentsData.data.reduce((acc: any[], assessment: any) => {
              if (!acc.find(e => e.name === assessment.entityName)) {
                acc.push({
                  id: assessment.entityName, // Use name as ID since we don't have entity IDs
                  name: assessment.entityName
                });
              }
              return acc;
            }, []);
            setEntities(uniqueEntities);
          }
        }
      } catch (error) {
        console.error('Failed to fetch filter options:', error);
      } finally {
        setIsLoadingOptions(false);
      }
    };

    fetchFilterOptions();
  }, []);

  const getDataTypeOptions = (type: string) => {
    switch (type) {
      case 'assessments':
        return ['POPULATION', 'SHELTER', 'HEALTH', 'WASH', 'FOOD', 'SECURITY'];
      case 'responses':
        return ['SUPPLIES', 'SHELTER', 'MEDICAL', 'EVACUATION', 'SECURITY', 'OTHER'];
      case 'incidents':
        return ['FLOOD', 'FIRE', 'LANDSLIDE', 'CYCLONE', 'CONFLICT', 'EPIDEMIC', 'OTHER'];
      case 'entities':
        return ['CAMP', 'COMMUNITY'];
      default:
        return [];
    }
  };

  const getStatusOptions = (type: string) => {
    switch (type) {
      case 'assessments':
        return []; // No verification status field in database currently
      case 'responses':
        return ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      case 'incidents':
        return ['ACTIVE', 'CONTAINED', 'RESOLVED'];
      case 'entities':
        return []; // No status for entities
      default:
        return [];
    }
  };

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleTimeframeChange = () => {
    if (startDate && endDate) {
      updateFilters({
        timeframe: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      });
    } else {
      updateFilters({ timeframe: undefined });
    }
  };

  useEffect(() => {
    handleTimeframeChange();
  }, [startDate, endDate]);

  const clearAllFilters = () => {
    const emptyFilters: FilterState = {
      incidentIds: [],
      entityIds: [],
      timeframe: undefined,
      dataTypes: [],
      statusFilters: [],
    };
    setFilters(emptyFilters);
    setStartDate(undefined);
    setEndDate(undefined);
    onClearFilters();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.incidentIds.length > 0) count++;
    if (filters.entityIds.length > 0) count++;
    if (filters.timeframe) count++;
    if (filters.dataTypes.length > 0) count++;
    if (filters.statusFilters.length > 0) count++;
    return count;
  };

  const removeFilter = (filterType: keyof FilterState, value?: string) => {
    switch (filterType) {
      case 'incidentIds':
        if (value) {
          updateFilters({ incidentIds: filters.incidentIds.filter(id => id !== value) });
        } else {
          updateFilters({ incidentIds: [] });
        }
        break;
      case 'entityIds':
        if (value) {
          updateFilters({ entityIds: filters.entityIds.filter(id => id !== value) });
        } else {
          updateFilters({ entityIds: [] });
        }
        break;
      case 'timeframe':
        setStartDate(undefined);
        setEndDate(undefined);
        updateFilters({ timeframe: undefined });
        break;
      case 'dataTypes':
        if (value) {
          updateFilters({ dataTypes: filters.dataTypes.filter(type => type !== value) });
        } else {
          updateFilters({ dataTypes: [] });
        }
        break;
      case 'statusFilters':
        if (value) {
          updateFilters({ statusFilters: filters.statusFilters.filter(status => status !== value) });
        } else {
          updateFilters({ statusFilters: [] });
        }
        break;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Drill-Down Filters
              {getActiveFilterCount() > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {getActiveFilterCount()} active
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Filter and refine {dataType} data for detailed analysis
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={clearAllFilters} data-testid="clear-all-filters">
              <RotateCcw className="h-4 w-4 mr-1" />
              Clear All
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsOpen(!isOpen)}
              data-testid="toggle-filters"
            >
              <Filter className="h-4 w-4 mr-1" />
              {isOpen ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent>
          <div className="space-y-6">
            {/* Incident Filter */}
            {/* Incident Filter */}
            <div className="space-y-2" data-testid="incident-filter-container">
              <Label>Filter by Incident</Label>
              <Select 
                value="" 
                onValueChange={(value) => {
                  if (value && !filters.incidentIds.includes(value)) {
                    updateFilters({ incidentIds: [...filters.incidentIds, value] });
                  }
                }}
                disabled={isLoadingOptions}
              >
                <SelectTrigger data-testid="incident-filter">
                  <SelectValue placeholder={isLoadingOptions ? "Loading..." : "Select incidents..."} />
                </SelectTrigger>
                <SelectContent>
                  {incidents.map((incident) => (
                    <SelectItem key={incident.id} value={incident.id}>
                      {incident.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entity Filter */}
            <div className="space-y-2" data-testid="entity-filter-container">
              <Label>Filter by Entity</Label>
              <Select 
                value="" 
                onValueChange={(value) => {
                  if (value && !filters.entityIds.includes(value)) {
                    updateFilters({ entityIds: [...filters.entityIds, value] });
                  }
                }}
                disabled={isLoadingOptions}
              >
                <SelectTrigger data-testid="entity-filter">
                  <SelectValue placeholder={isLoadingOptions ? "Loading..." : "Select entities..."} />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2" data-testid="date-range-filter-container">
              <Label>Date Range</Label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1" data-testid="date-start-button">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {startDate ? format(startDate, 'MMM dd, yyyy') : 'Start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1" data-testid="date-end-button">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {endDate ? format(endDate, 'MMM dd, yyyy') : 'End date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Data Type Filter */}
            <div className="space-y-2">
              <Label>Filter by Type</Label>
              <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto">
                {getDataTypeOptions(dataType).map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={type}
                      data-testid={`type-filter-${type}`}
                      checked={filters.dataTypes.includes(type)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateFilters({ dataTypes: [...filters.dataTypes, type] });
                        } else {
                          updateFilters({ dataTypes: filters.dataTypes.filter(t => t !== type) });
                        }
                      }}
                    />
                    <Label htmlFor={type} className="text-sm">
                      {type.charAt(0) + type.slice(1).toLowerCase()}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            {getStatusOptions(dataType).length > 0 && (
              <div className="space-y-2">
                <Label>Filter by Status</Label>
                <div className="grid grid-cols-2 gap-2">
                  {getStatusOptions(dataType).map((status) => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={status}
                        checked={filters.statusFilters.includes(status)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateFilters({ statusFilters: [...filters.statusFilters, status] });
                          } else {
                            updateFilters({ statusFilters: filters.statusFilters.filter(s => s !== status) });
                          }
                        }}
                      />
                      <Label htmlFor={status} className="text-sm">
                        {status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}

      {/* Active Filters Display */}
      {getActiveFilterCount() > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            <Label className="text-xs">Active Filters:</Label>
            <div className="flex flex-wrap gap-2">
              {filters.incidentIds.map((id) => (
                <Badge key={id} variant="secondary" className="flex items-center gap-1">
                  Incident: {id}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFilter('incidentIds', id)}
                  />
                </Badge>
              ))}
              {filters.entityIds.map((id) => (
                <Badge key={id} variant="secondary" className="flex items-center gap-1">
                  Entity: {id}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFilter('entityIds', id)}
                  />
                </Badge>
              ))}
              {filters.timeframe && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Date: {format(new Date(filters.timeframe.start), 'MMM dd')} - {format(new Date(filters.timeframe.end), 'MMM dd')}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFilter('timeframe')}
                  />
                </Badge>
              )}
              {filters.dataTypes.map((type) => (
                <Badge key={type} variant="secondary" className="flex items-center gap-1">
                  {type.charAt(0) + type.slice(1).toLowerCase()}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFilter('dataTypes', type)}
                  />
                </Badge>
              ))}
              {filters.statusFilters.map((status) => (
                <Badge key={status} variant="secondary" className="flex items-center gap-1">
                  {status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFilter('statusFilters', status)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}