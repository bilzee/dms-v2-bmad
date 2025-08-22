'use client';

import React, { useState, useEffect } from 'react';
import { AffectedEntity } from '@dms/shared';
import { db } from '@/lib/offline/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EntityListProps {
  onSelect?: (entity: AffectedEntity) => void;
  onEdit?: (entity: AffectedEntity) => void;
  onDelete?: (entityId: string) => void;
  selectable?: boolean;
  showActions?: boolean;
}

export const EntityList: React.FC<EntityListProps> = ({
  onSelect,
  onEdit,
  onDelete,
  selectable = false,
  showActions = true,
}) => {
  const [entities, setEntities] = useState<AffectedEntity[]>([]);
  const [filteredEntities, setFilteredEntities] = useState<AffectedEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CAMP' | 'COMMUNITY'>('ALL');

  useEffect(() => {
    loadEntities();
  }, []);

  useEffect(() => {
    filterEntities();
  }, [entities, searchTerm, typeFilter]);

  const loadEntities = async () => {
    try {
      setLoading(true);
      // Load from IndexedDB (offline-first approach)
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

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(entity =>
        entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.lga.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.ward.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(entity => entity.type === typeFilter);
    }

    setFilteredEntities(filtered);
  };

  const handleDelete = async (entityId: string) => {
    if (window.confirm('Are you sure you want to delete this entity? This action cannot be undone.')) {
      try {
        await db.deleteEntity(entityId);
        await loadEntities(); // Refresh the list
        onDelete?.(entityId);
      } catch (error) {
        console.error('Failed to delete entity:', error);
        alert('Failed to delete entity. Please try again.');
      }
    }
  };

  const getEntityDisplayName = (entity: AffectedEntity): string => {
    if (entity.type === 'CAMP' && entity.campDetails) {
      return entity.campDetails.campName || entity.name;
    } else if (entity.type === 'COMMUNITY' && entity.communityDetails) {
      return entity.communityDetails.communityName || entity.name;
    }
    return entity.name;
  };

  const getEntityContact = (entity: AffectedEntity): string => {
    if (entity.type === 'CAMP' && entity.campDetails) {
      return `${entity.campDetails.campCoordinatorName} (${entity.campDetails.campCoordinatorPhone})`;
    } else if (entity.type === 'COMMUNITY' && entity.communityDetails) {
      return `${entity.communityDetails.contactPersonName} (${entity.communityDetails.contactPersonPhone})`;
    }
    return 'No contact information';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading entities...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search entities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'CAMP' | 'COMMUNITY')}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Types</option>
            <option value="CAMP">IDP Camps</option>
            <option value="COMMUNITY">Communities</option>
          </select>
        </div>
        <Button
          onClick={loadEntities}
          variant="outline"
          className="sm:w-auto"
        >
          Refresh
        </Button>
      </div>

      {/* Entity List */}
      {filteredEntities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {entities.length === 0 
            ? 'No entities found. Create your first entity to get started.'
            : 'No entities match your search criteria.'
          }
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredEntities.map(entity => (
            <div
              key={entity.id}
              className={`p-4 border rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow ${
                selectable ? 'cursor-pointer hover:bg-gray-50' : ''
              }`}
              onClick={selectable ? () => onSelect?.(entity) : undefined}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Entity Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        entity.type === 'CAMP'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {entity.type === 'CAMP' ? 'IDP Camp' : 'Community'}
                    </span>
                    {entity.type === 'CAMP' && entity.campDetails?.campStatus === 'CLOSED' && (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
                        Closed
                      </span>
                    )}
                  </div>

                  {/* Entity Name */}
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">
                    {getEntityDisplayName(entity)}
                  </h3>

                  {/* Location */}
                  <p className="text-sm text-gray-600 mb-2">
                    {entity.ward}, {entity.lga}
                  </p>

                  {/* Coordinates */}
                  <p className="text-xs text-gray-500 mb-2">
                    {entity.latitude.toFixed(6)}, {entity.longitude.toFixed(6)}
                  </p>

                  {/* Contact Information */}
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Contact:</strong> {getEntityContact(entity)}
                  </p>

                  {/* Additional Details */}
                  {entity.type === 'CAMP' && entity.campDetails && (
                    <div className="text-sm text-gray-600">
                      {entity.campDetails.estimatedPopulation && (
                        <p>Population: ~{entity.campDetails.estimatedPopulation.toLocaleString()}</p>
                      )}
                      {entity.campDetails.superviserName && (
                        <p>Supervisor: {entity.campDetails.superviserName}</p>
                      )}
                    </div>
                  )}

                  {entity.type === 'COMMUNITY' && entity.communityDetails && (
                    <div className="text-sm text-gray-600">
                      {entity.communityDetails.estimatedHouseholds && (
                        <p>Households: ~{entity.communityDetails.estimatedHouseholds.toLocaleString()}</p>
                      )}
                      <p>Contact Role: {entity.communityDetails.contactPersonRole}</p>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="text-xs text-gray-400 mt-2">
                    Created: {new Date(entity.createdAt).toLocaleDateString()}
                    {entity.updatedAt !== entity.createdAt && (
                      <span> • Updated: {new Date(entity.updatedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {showActions && (
                  <div className="flex flex-col gap-2 ml-4">
                    {onEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(entity);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(entity.id);
                        }}
                      >
                        Delete
                      </Button>
                    )}
                    {selectable && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect?.(entity);
                        }}
                      >
                        Select
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};