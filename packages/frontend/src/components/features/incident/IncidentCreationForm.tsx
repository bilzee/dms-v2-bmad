'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  X, 
  Save, 
  AlertCircle,
  Calendar,
  FileText,
  Users,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useIncidentForms, useIncidentActions } from '@/stores/incident.store';
import { 
  IncidentType, 
  IncidentSeverity, 
  IncidentStatus,
  IncidentCreationData
} from '@dms/shared';

interface IncidentCreationFormProps {
  coordinatorId: string;
  coordinatorName: string;
  initialData?: Partial<IncidentCreationData>;
  fromAssessmentId?: string;
}

interface FormData {
  name: string;
  type: IncidentType;
  subType: string;
  source: string;
  severity: IncidentSeverity;
  description: string;
  date: string; // HTML date input uses string
  coordinates: {
    latitude: string; // HTML number inputs use string
    longitude: string;
  };
  affectedEntityIds: string[];
}

const incidentTypeOptions = [
  { value: IncidentType.FLOOD, label: 'Flood', description: 'Water-related disasters' },
  { value: IncidentType.FIRE, label: 'Fire', description: 'Fire-related emergencies' },
  { value: IncidentType.LANDSLIDE, label: 'Landslide', description: 'Ground movement events' },
  { value: IncidentType.CYCLONE, label: 'Cyclone', description: 'Tropical storms and hurricanes' },
  { value: IncidentType.CONFLICT, label: 'Conflict', description: 'Security-related incidents' },
  { value: IncidentType.EPIDEMIC, label: 'Epidemic', description: 'Disease outbreaks' },
  { value: IncidentType.EARTHQUAKE, label: 'Earthquake', description: 'Seismic events' },
  { value: IncidentType.WILDFIRE, label: 'Wildfire', description: 'Uncontrolled fires' },
  { value: IncidentType.OTHER, label: 'Other', description: 'Other incident types' },
];

const severityOptions = [
  { 
    value: IncidentSeverity.MINOR, 
    label: 'Minor', 
    description: 'Limited impact, local response sufficient',
    color: 'bg-green-100 text-green-800'
  },
  { 
    value: IncidentSeverity.MODERATE, 
    label: 'Moderate', 
    description: 'Regional impact, coordinated response needed',
    color: 'bg-yellow-100 text-yellow-800'
  },
  { 
    value: IncidentSeverity.SEVERE, 
    label: 'Severe', 
    description: 'Major impact, extensive resources required',
    color: 'bg-orange-100 text-orange-800'
  },
  { 
    value: IncidentSeverity.CATASTROPHIC, 
    label: 'Catastrophic', 
    description: 'Massive impact, international assistance may be needed',
    color: 'bg-red-100 text-red-800'
  },
];

export default function IncidentCreationForm({
  coordinatorId,
  coordinatorName,
  initialData,
  fromAssessmentId,
}: IncidentCreationFormProps) {
  const { creationForm, isCreating, closeCreationForm } = useIncidentForms();
  const { createIncident } = useIncidentActions();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid }
  } = useForm<FormData>({
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || undefined,
      subType: initialData?.subType || '',
      source: initialData?.source || (fromAssessmentId ? 'Preliminary Assessment' : ''),
      severity: initialData?.severity || undefined,
      description: initialData?.description || '',
      date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      coordinates: {
        latitude: initialData?.coordinates?.latitude?.toString() || '',
        longitude: initialData?.coordinates?.longitude?.toString() || '',
      },
      affectedEntityIds: initialData?.affectedEntityIds || [],
    },
    mode: 'onChange'
  });

  const selectedType = watch('type');
  const selectedSeverity = watch('severity');

  // Mock entity data - would come from entity store in real implementation
  const [availableEntities] = React.useState([
    { id: '1', name: 'Maiduguri Camp A', type: 'CAMP', lga: 'Maiduguri' },
    { id: '2', name: 'Bama Community', type: 'COMMUNITY', lga: 'Bama' },
    { id: '3', name: 'Monguno Camp B', type: 'CAMP', lga: 'Monguno' },
  ]);

  const handleEntityToggle = (entityId: string, checked: boolean) => {
    const currentEntityIds = watch('affectedEntityIds');
    if (checked) {
      setValue('affectedEntityIds', [...currentEntityIds, entityId]);
    } else {
      setValue('affectedEntityIds', currentEntityIds.filter(id => id !== entityId));
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setValue('coordinates.latitude', position.coords.latitude.toString());
          setValue('coordinates.longitude', position.coords.longitude.toString());
        },
        (error) => {
          console.warn('Failed to get current location:', error);
        }
      );
    } else {
      console.warn('Geolocation is not supported by this browser');
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const incidentData: IncidentCreationData = {
        name: data.name,
        type: data.type,
        subType: data.subType || undefined,
        source: data.source || undefined,
        severity: data.severity,
        status: IncidentStatus.ACTIVE, // New incidents start as ACTIVE
        date: new Date(data.date),
        affectedEntityIds: data.affectedEntityIds,
        preliminaryAssessmentId: fromAssessmentId,
        description: data.description || undefined,
        coordinates: data.coordinates.latitude && data.coordinates.longitude ? {
          latitude: parseFloat(data.coordinates.latitude),
          longitude: parseFloat(data.coordinates.longitude),
        } : undefined,
      };

      await createIncident(incidentData);
      reset();
    } catch (error) {
      console.error('Failed to create incident:', error);
    }
  };

  if (!creationForm.isOpen) return null;

  return (
    <Dialog open={creationForm.isOpen} onOpenChange={closeCreationForm}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Create New Incident
            {fromAssessmentId && (
              <Badge variant="outline" className="ml-2">
                From Assessment
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Incident Name *</Label>
                  <Input
                    id="name"
                    {...register('name', { 
                      required: 'Incident name is required',
                      minLength: { value: 3, message: 'Name must be at least 3 characters' }
                    })}
                    placeholder="e.g., Borno State Flood - August 2024"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="date">Incident Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    {...register('date', { required: 'Incident date is required' })}
                  />
                  {errors.date && (
                    <p className="text-sm text-red-600 mt-1">{errors.date.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  {...register('source')}
                  placeholder="e.g., WHO Report, Field Assessment, Media"
                />
                {fromAssessmentId && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Linked to preliminary assessment ID: {fromAssessmentId}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Describe the incident, its scope, and any relevant details..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Classification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-4 w-4" />
                Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Incident Type *</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                  {incidentTypeOptions.map((option) => (
                    <Card 
                      key={option.value}
                      className={cn(
                        "cursor-pointer border-2 transition-colors",
                        selectedType === option.value 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => setValue('type', option.value)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            {...register('type', { required: 'Incident type is required' })}
                            value={option.value}
                            className="sr-only"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-muted-foreground">
                              {option.description}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {errors.type && (
                  <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="subType">Sub-type (Optional)</Label>
                <Input
                  id="subType"
                  {...register('subType')}
                  placeholder="e.g., Flash Flood, Structural Fire"
                />
              </div>

              <div>
                <Label>Severity Level *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {severityOptions.map((option) => (
                    <Card 
                      key={option.value}
                      className={cn(
                        "cursor-pointer border-2 transition-colors",
                        selectedSeverity === option.value 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => setValue('severity', option.value)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            {...register('severity', { required: 'Severity level is required' })}
                            value={option.value}
                            className="sr-only"
                          />
                          <Badge className={option.color}>
                            {option.label}
                          </Badge>
                          <div className="flex-1">
                            <div className="text-sm">{option.description}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {errors.severity && (
                  <p className="text-sm text-red-600 mt-1">{errors.severity.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-4 w-4" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    {...register('coordinates.latitude')}
                    placeholder="e.g., 11.8311"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    {...register('coordinates.longitude')}
                    placeholder="e.g., 13.1506"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={getCurrentLocation}
                className="flex items-center gap-2"
              >
                <MapPin className="h-4 w-4" />
                Use Current Location
              </Button>
            </CardContent>
          </Card>

          {/* Affected Entities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-4 w-4" />
                Affected Entities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {availableEntities.map((entity) => (
                  <div key={entity.id} className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      id={`entity-${entity.id}`}
                      checked={watch('affectedEntityIds').includes(entity.id)}
                      onCheckedChange={(checked) => handleEntityToggle(entity.id, !!checked)}
                    />
                    <Label htmlFor={`entity-${entity.id}`} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{entity.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {entity.type} • {entity.lga} LGA
                          </div>
                        </div>
                        <Badge variant="outline">
                          {entity.type}
                        </Badge>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
              {watch('affectedEntityIds').length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Consider selecting affected entities to help coordinate response efforts.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="text-sm text-muted-foreground">
              Created by: {coordinatorName}
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeCreationForm}
                disabled={isCreating}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isValid || isCreating}
                className="flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-white" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Incident
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}