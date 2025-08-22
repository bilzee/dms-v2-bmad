'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AffectedEntity } from '@dms/shared';
import { db } from '@/lib/offline/db';
import { Button } from '@/components/ui/button';

interface EntityDetailsPageParams {
  id: string;
}

export default function EntityDetailsPage() {
  const params = useParams() as EntityDetailsPageParams;
  const router = useRouter();
  const [entity, setEntity] = useState<AffectedEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEntity();
  }, [params.id]);

  const loadEntity = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const entityRecord = await db.getEntityById(params.id);
      
      if (!entityRecord) {
        setError('Entity not found');
        return;
      }

      // Convert EntityRecord to AffectedEntity
      const entityData: AffectedEntity = {
        id: entityRecord.id,
        type: entityRecord.type,
        name: entityRecord.name,
        lga: entityRecord.lga,
        ward: entityRecord.ward,
        longitude: entityRecord.longitude,
        latitude: entityRecord.latitude,
        campDetails: entityRecord.campDetails,
        communityDetails: entityRecord.communityDetails,
        createdAt: entityRecord.createdAt,
        updatedAt: entityRecord.updatedAt,
      };

      setEntity(entityData);
    } catch (error) {
      console.error('Failed to load entity:', error);
      setError('Failed to load entity details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/entities?edit=${params.id}`);
  };

  const handleDelete = async () => {
    if (!entity) return;
    
    if (window.confirm(`Are you sure you want to delete "${entity.name}"? This action cannot be undone.`)) {
      try {
        await db.deleteEntity(entity.id);
        router.push('/entities');
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

  const getEntityContact = (entity: AffectedEntity): { name: string; phone: string; role?: string } | null => {
    if (entity.type === 'CAMP' && entity.campDetails) {
      return {
        name: entity.campDetails.campCoordinatorName,
        phone: entity.campDetails.campCoordinatorPhone,
        role: 'Camp Coordinator',
      };
    } else if (entity.type === 'COMMUNITY' && entity.communityDetails) {
      return {
        name: entity.communityDetails.contactPersonName,
        phone: entity.communityDetails.contactPersonPhone,
        role: entity.communityDetails.contactPersonRole,
      };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <div className="text-gray-500">Loading entity details...</div>
        </div>
      </div>
    );
  }

  if (error || !entity) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <div className="text-red-600 mb-4">{error || 'Entity not found'}</div>
          <Button onClick={() => router.push('/entities')} variant="outline">
            Back to Entities
          </Button>
        </div>
      </div>
    );
  }

  const contact = getEntityContact(entity);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`px-3 py-1 text-sm font-medium rounded ${
                  entity.type === 'CAMP'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {entity.type === 'CAMP' ? 'IDP Camp' : 'Community'}
              </span>
              {entity.type === 'CAMP' && entity.campDetails?.campStatus === 'CLOSED' && (
                <span className="px-3 py-1 text-sm font-medium rounded bg-red-100 text-red-800">
                  Closed
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              {getEntityDisplayName(entity)}
            </h1>
            <p className="text-gray-600 mt-1">
              {entity.ward}, {entity.lga}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push('/entities')}>
              Back to List
            </Button>
            <Button onClick={handleEdit}>
              Edit
            </Button>
            <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700">
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Entity Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Entity Name</label>
              <p className="text-gray-900">{entity.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Type</label>
              <p className="text-gray-900">{entity.type === 'CAMP' ? 'IDP Camp' : 'Community'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Local Government Area</label>
              <p className="text-gray-900">{entity.lga}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Ward</label>
              <p className="text-gray-900">{entity.ward}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Coordinates</label>
              <p className="text-gray-900">
                {entity.latitude.toFixed(6)}, {entity.longitude.toFixed(6)}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        {contact && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Contact Person</label>
                <p className="text-gray-900">{contact.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Phone Number</label>
                <p className="text-gray-900">
                  <a href={`tel:${contact.phone}`} className="text-blue-600 hover:text-blue-700">
                    {contact.phone}
                  </a>
                </p>
              </div>
              {contact.role && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <p className="text-gray-900">{contact.role}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Specific Details */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {entity.type === 'CAMP' ? 'Camp Details' : 'Community Details'}
          </h2>
          
          {entity.type === 'CAMP' && entity.campDetails && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <p className="text-gray-900">{entity.campDetails.campStatus}</p>
              </div>
              {entity.campDetails.superviserName && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Supervisor</label>
                  <p className="text-gray-900">
                    {entity.campDetails.superviserName}
                    {entity.campDetails.superviserOrganization && 
                      ` (${entity.campDetails.superviserOrganization})`}
                  </p>
                </div>
              )}
              {entity.campDetails.estimatedPopulation && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Estimated Population</label>
                  <p className="text-gray-900">{entity.campDetails.estimatedPopulation.toLocaleString()}</p>
                </div>
              )}
            </div>
          )}

          {entity.type === 'COMMUNITY' && entity.communityDetails && (
            <div className="space-y-4">
              {entity.communityDetails.estimatedHouseholds && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Estimated Households</label>
                  <p className="text-gray-900">{entity.communityDetails.estimatedHouseholds.toLocaleString()}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Record Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Created</label>
              <p className="text-gray-900">{new Date(entity.createdAt).toLocaleDateString()} at {new Date(entity.createdAt).toLocaleTimeString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Last Updated</label>
              <p className="text-gray-900">{new Date(entity.updatedAt).toLocaleDateString()} at {new Date(entity.updatedAt).toLocaleTimeString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Entity ID</label>
              <p className="text-gray-900 text-sm font-mono">{entity.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}