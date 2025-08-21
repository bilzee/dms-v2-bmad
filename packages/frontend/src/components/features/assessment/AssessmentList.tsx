'use client';

import React, { useState, useEffect } from 'react';
import { AssessmentType, SyncStatus, type RapidAssessment } from '@dms/shared';
import { db, type AssessmentRecord } from '@/lib/offline/db';
import { useOfflineStore } from '@/stores/offline.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AssessmentCard } from './AssessmentCard';

interface AssessmentListProps {
  onAssessmentSelect?: (assessment: RapidAssessment) => void;
  onNewAssessment?: (type: AssessmentType) => void;
  showDrafts?: boolean;
}

export const AssessmentList: React.FC<AssessmentListProps> = ({
  onAssessmentSelect,
  onNewAssessment,
  showDrafts = false,
}) => {
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    type: AssessmentType | 'ALL';
    syncStatus: SyncStatus | 'ALL';
    search: string;
  }>({
    type: 'ALL',
    syncStatus: 'ALL',
    search: '',
  });

  const { isOnline } = useOfflineStore();

  // Load assessments from IndexedDB
  useEffect(() => {
    loadAssessments();
  }, [filter, showDrafts]);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      
      const filters: any = {};
      if (filter.type !== 'ALL') filters.type = filter.type;
      if (filter.syncStatus !== 'ALL') filters.syncStatus = filter.syncStatus;
      if (showDrafts !== undefined) filters.isDraft = showDrafts;

      const data = await db.getAssessments(filters);
      
      // Apply search filter
      let filteredData = data;
      if (filter.search) {
        filteredData = data.filter(assessment =>
          assessment.assessorName.toLowerCase().includes(filter.search.toLowerCase()) ||
          assessment.type.toLowerCase().includes(filter.search.toLowerCase())
        );
      }

      setAssessments(filteredData);
    } catch (error) {
      console.error('Failed to load assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    try {
      await db.deleteAssessment(id);
      await loadAssessments(); // Refresh the list
    } catch (error) {
      console.error('Failed to delete assessment:', error);
    }
  };

  const handleRetrySync = async (assessment: AssessmentRecord) => {
    // Add back to sync queue
    const { addToQueue } = useOfflineStore.getState();
    addToQueue({
      type: 'ASSESSMENT',
      action: 'CREATE',
      entityId: assessment.id,
      data: assessment,
      priority: 'HIGH',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading assessments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {showDrafts ? 'Draft Assessments' : 'Assessments'}
        </h2>
        <div className="flex items-center space-x-2">
          <span className={`text-sm px-2 py-1 rounded ${
            isOnline ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
          }`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {onNewAssessment && (
            <div className="relative">
              <select
                onChange={(e) => {
                  const type = e.target.value as AssessmentType;
                  if (type) onNewAssessment(type);
                  e.target.value = '';
                }}
                className="px-4 py-2 border border-gray-300 rounded-md bg-white"
                defaultValue=""
              >
                <option value="" disabled>New Assessment</option>
                <option value={AssessmentType.HEALTH}>Health</option>
                <option value={AssessmentType.WASH}>WASH</option>
                <option value={AssessmentType.SHELTER}>Shelter</option>
                <option value={AssessmentType.FOOD}>Food</option>
                <option value={AssessmentType.SECURITY}>Security</option>
                <option value={AssessmentType.POPULATION}>Population</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assessment Type
            </label>
            <select
              value={filter.type}
              onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value as AssessmentType | 'ALL' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="ALL">All Types</option>
              <option value={AssessmentType.HEALTH}>Health</option>
              <option value={AssessmentType.WASH}>WASH</option>
              <option value={AssessmentType.SHELTER}>Shelter</option>
              <option value={AssessmentType.FOOD}>Food</option>
              <option value={AssessmentType.SECURITY}>Security</option>
              <option value={AssessmentType.POPULATION}>Population</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sync Status
            </label>
            <select
              value={filter.syncStatus}
              onChange={(e) => setFilter(prev => ({ ...prev, syncStatus: e.target.value as SyncStatus | 'ALL' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="ALL">All Status</option>
              <option value={SyncStatus.PENDING}>Pending</option>
              <option value={SyncStatus.SYNCING}>Syncing</option>
              <option value={SyncStatus.SYNCED}>Synced</option>
              <option value={SyncStatus.FAILED}>Failed</option>
              <option value={SyncStatus.CONFLICT}>Conflict</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <Input
              type="text"
              placeholder="Search by assessor or type..."
              value={filter.search}
              onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Assessment List */}
      {assessments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">
            {showDrafts ? 'No draft assessments found' : 'No assessments found'}
          </div>
          {onNewAssessment && (
            <Button onClick={() => onNewAssessment(AssessmentType.HEALTH)}>
              Create Your First Assessment
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {assessments.map((assessment) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              onClick={() => onAssessmentSelect?.(assessment)}
              onDelete={() => handleDeleteAssessment(assessment.id)}
              onRetrySync={() => handleRetrySync(assessment)}
              showSyncStatus={!showDrafts}
            />
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="text-sm text-gray-600 text-center">
        Showing {assessments.length} {showDrafts ? 'drafts' : 'assessments'}
        {filter.type !== 'ALL' && ` • Filtered by ${filter.type}`}
        {filter.syncStatus !== 'ALL' && ` • Status: ${filter.syncStatus}`}
      </div>
    </div>
  );
};