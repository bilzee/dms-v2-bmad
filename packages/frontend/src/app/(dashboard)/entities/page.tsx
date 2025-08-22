'use client';

import React, { useState } from 'react';
import { AffectedEntity, EntityFormData } from '@dms/shared';
import { EntityList } from '@/components/features/entity/EntityList';
import { EntityManagementForm } from '@/components/features/entity/EntityManagementForm';
import { Button } from '@/components/ui/button';

export default function EntitiesPage() {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingEntity, setEditingEntity] = useState<AffectedEntity | null>(null);

  const handleCreate = () => {
    setEditingEntity(null);
    setView('create');
  };

  const handleEdit = (entity: AffectedEntity) => {
    setEditingEntity(entity);
    setView('edit');
  };

  const handleSubmit = (entity: AffectedEntity) => {
    console.log('Entity saved:', entity);
    // Show success message
    setView('list');
    setEditingEntity(null);
  };

  const handleSaveDraft = (draftData: EntityFormData) => {
    console.log('Draft saved:', draftData);
    // Show draft saved notification
  };

  const handleDelete = (entityId: string) => {
    console.log('Entity deleted:', entityId);
    // Show success message
  };

  const handleCancel = () => {
    setView('list');
    setEditingEntity(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {view === 'list' ? 'Affected Entities' : 
               view === 'create' ? 'Create New Entity' : 
               'Edit Entity'}
            </h1>
            <p className="text-gray-600 mt-2">
              {view === 'list' ? 'Manage camps and communities for disaster response assessment' :
               view === 'create' ? 'Add a new camp or community to the system' :
               'Update entity information and contact details'}
            </p>
          </div>
          
          {view === 'list' && (
            <Button onClick={handleCreate}>
              Create New Entity
            </Button>
          )}
          
          {(view === 'create' || view === 'edit') && (
            <Button variant="outline" onClick={handleCancel}>
              Back to List
            </Button>
          )}
        </div>
      </div>

      {view === 'list' && (
        <EntityList
          onEdit={handleEdit}
          onDelete={handleDelete}
          showActions={true}
        />
      )}

      {(view === 'create' || view === 'edit') && (
        <EntityManagementForm
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          initialData={editingEntity ? {
            type: editingEntity.type,
            name: editingEntity.name,
            lga: editingEntity.lga,
            ward: editingEntity.ward,
            longitude: editingEntity.longitude,
            latitude: editingEntity.latitude,
            campDetails: editingEntity.campDetails,
            communityDetails: editingEntity.communityDetails,
          } : undefined}
          editingId={editingEntity?.id}
        />
      )}
    </div>
  );
}