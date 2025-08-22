'use client';

import React, { useState, useEffect } from 'react';
import { AffectedEntity } from '@dms/shared';
import { db } from '@/lib/offline/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EntitySelectorProps {
  onSelect: (entity: AffectedEntity) => void;
  onCreateNew?: () => void;
  selectedEntityId?: string;
  className?: string;
}

export const EntitySelector: React.FC<EntitySelectorProps> = ({
  onSelect,
  onCreateNew,
  selectedEntityId,
  className = '',
}) => {
  const [entities, setEntities] = useState<AffectedEntity[]>([]);
  const [filteredEntities, setFilteredEntities] = useState<AffectedEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<AffectedEntity | null>(null);

  useEffect(() => {
    loadEntities();
  }, []);

  useEffect(() => {
    filterEntities();
  }, [entities, searchTerm]);

  useEffect(() => {
    if (selectedEntityId && entities.length > 0) {
      const entity = entities.find(e => e.id === selectedEntityId);
      setSelectedEntity(entity || null);
    }
  }, [selectedEntityId, entities]);

  const loadEntities = async () => {
    try {
      setLoading(true);
      const entityRecords = await db.getEntities({ isDraft: false });
      
      // Convert EntityRecord to AffectedEntity
      const entitiesData = entityRecords.map(record => ({
        id: record.id,
        type: record.type,
        name: record.name,
        lga: record.lga,
        ward: record.ward,
        longitude: record.longitude,
        latitude: record.latitude,
        campDetails: record.campDetails,
        communityDetails: record.communityDetails,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      })) as AffectedEntity[];

      setEntities(entitiesData);
    } catch (error) {
      console.error('Failed to load entities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEntities = () => {
    let filtered = entities;

    if (searchTerm) {
      filtered = filtered.filter(entity =>
        entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.lga.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.ward.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEntities(filtered);
  };

  const handleSelect = (entity: AffectedEntity) => {
    setSelectedEntity(entity);
    onSelect(entity);
    setIsOpen(false);
    setSearchTerm('');
  };

  const getEntityDisplayName = (entity: AffectedEntity): string => {
    if (entity.type === 'CAMP' && entity.campDetails) {
      return entity.campDetails.campName || entity.name;
    } else if (entity.type === 'COMMUNITY' && entity.communityDetails) {
      return entity.communityDetails.communityName || entity.name;
    }
    return entity.name;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Selected Entity Display / Search Input */}
      <div className="relative">
        {!isOpen && selectedEntity ? (
          <div
            className="w-full p-3 border border-gray-300 rounded-md bg-white cursor-pointer hover:bg-gray-50 flex items-center justify-between"
            onClick={() => setIsOpen(true)}
          >
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${
                  selectedEntity.type === 'CAMP'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {selectedEntity.type === 'CAMP' ? 'Camp' : 'Community'}
              </span>
              <span className="font-medium">{getEntityDisplayName(selectedEntity)}</span>
              <span className="text-gray-500 text-sm">
                ({selectedEntity.ward}, {selectedEntity.lga})
              </span>
            </div>
            <span className="text-gray-400">▼</span>
          </div>
        ) : (
          <Input
            type="text"
            placeholder="Search for entities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="w-full"
          />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading entities...</div>
          ) : filteredEntities.length === 0 ? (
            <div className="p-4">
              <div className="text-center text-gray-500 mb-4">
                {entities.length === 0 
                  ? 'No entities found.'
                  : 'No entities match your search.'
                }
              </div>
              {onCreateNew && (
                <Button
                  onClick={() => {
                    setIsOpen(false);
                    onCreateNew();
                  }}
                  className="w-full"
                  variant="outline"
                >
                  Create New Entity
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Entity Options */}
              <div className="max-h-60 overflow-y-auto">
                {filteredEntities.map(entity => (
                  <div
                    key={entity.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() => handleSelect(entity)}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded flex-shrink-0 ${
                          entity.type === 'CAMP'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {entity.type === 'CAMP' ? 'Camp' : 'Community'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {getEntityDisplayName(entity)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {entity.ward}, {entity.lga}
                        </div>
                        <div className="text-xs text-gray-500">
                          {entity.latitude.toFixed(4)}, {entity.longitude.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Create New Option */}
              {onCreateNew && (
                <div className="p-2 border-t border-gray-200">
                  <Button
                    onClick={() => {
                      setIsOpen(false);
                      onCreateNew();
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Create New Entity
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Cancel/Close */}
          <div className="p-2 border-t border-gray-200">
            <Button
              onClick={() => {
                setIsOpen(false);
                setSearchTerm('');
              }}
              variant="ghost"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsOpen(false);
            setSearchTerm('');
          }}
        />
      )}
    </div>
  );
};