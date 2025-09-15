'use client';

import React, { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAnalyticsStore } from '@/stores/analytics.store';

interface Entity {
  id: string;
  name: string;
  type: 'aggregate' | 'LGA' | 'Ward' | 'Community';
  coordinates?: [number, number];
}

interface EntitySelectorProps {
  onEntityChange: (entityId: string | null) => void;
  selectedEntityId: string | null;
}

export function EntitySelector({ onEntityChange, selectedEntityId }: EntitySelectorProps) {
  const { selectedIncident } = useAnalyticsStore();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedIncident) {
      fetchEntitiesByIncident(selectedIncident.id);
    } else {
      setEntities([]);
      onEntityChange(null);
    }
  }, [selectedIncident]);

  const fetchEntitiesByIncident = async (incidentId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/monitoring/analytics/entities/by-incident/${incidentId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch entities');
      }

      setEntities(data.data.entities);
      
      // Auto-select "All Affected Entities" by default
      const allEntitiesOption = data.data.entities.find((entity: Entity) => entity.id === 'all');
      if (allEntitiesOption && !selectedEntityId) {
        onEntityChange('all');
      }
      
    } catch (error) {
      console.error('Failed to fetch entities:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      setEntities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEntityChange = (value: string) => {
    onEntityChange(value);
  };

  if (!selectedIncident) {
    return (
      <div className="text-sm text-gray-500">
        Select an incident to view affected entities
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Error loading entities: {error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        Affected Entity
      </label>
      <Select 
        value={selectedEntityId || undefined} 
        onValueChange={handleEntityChange}
        disabled={isLoading || entities.length === 0}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={
            isLoading 
              ? "Loading entities..." 
              : entities.length === 0 
                ? "No entities found" 
                : "Select an entity"
          } />
        </SelectTrigger>
        <SelectContent>
          {entities.map((entity) => (
            <SelectItem key={entity.id} value={entity.id}>
              <div className="flex items-center justify-between w-full">
                <span>{entity.name}</span>
                {entity.type !== 'aggregate' && (
                  <span className="text-xs text-gray-500 ml-2">
                    {entity.type}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {isLoading && (
        <div className="text-xs text-gray-500">
          Loading entities for {selectedIncident.name}...
        </div>
      )}
      
      {entities.length > 0 && (
        <div className="text-xs text-gray-500">
          {entities.length} entities available
        </div>
      )}
    </div>
  );
}