'use client';

import React, { useState, useEffect } from 'react';
import { SyncStatus, VerificationStatus, type RapidAssessment } from '@dms/shared';
import type { AssessmentRecord } from '@/lib/offline/db';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@dms/shared';
import { IncidentService } from '@/lib/api/incident.service';
import { CompactAssessmentSyncStatus } from '@/components/features/sync';

interface AssessmentCardProps {
  assessment: AssessmentRecord;
  onClick?: () => void;
  onDelete?: () => void;
  onRetrySync?: () => void;
  showSyncStatus?: boolean;
}

interface IncidentInfo {
  id: string;
  name: string;
  status: string;
  severity: string;
}

export const AssessmentCard: React.FC<AssessmentCardProps> = ({
  assessment,
  onClick,
  onDelete,
  onRetrySync,
  showSyncStatus = true,
}) => {
  const [incidentInfo, setIncidentInfo] = useState<IncidentInfo | null>(null);
  const [loadingIncident, setLoadingIncident] = useState(false);

  // Load incident information for preliminary assessments
  useEffect(() => {
    if (assessment.type === 'PRELIMINARY') {
      loadIncidentInfo();
    }
  }, [assessment.id, assessment.type]);

  const loadIncidentInfo = async () => {
    try {
      setLoadingIncident(true);
      const result = await IncidentService.getIncidentForAssessment(assessment.id);
      if (result.incident) {
        setIncidentInfo(result.incident);
      }
    } catch (error) {
      console.error('Failed to load incident info:', error);
    } finally {
      setLoadingIncident(false);
    }
  };
  const getSyncStatusColor = (status: SyncStatus) => {
    switch (status) {
      case SyncStatus.SYNCED:
        return 'bg-green-100 text-green-800';
      case SyncStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case SyncStatus.SYNCING:
        return 'bg-blue-100 text-blue-800';
      case SyncStatus.FAILED:
        return 'bg-red-100 text-red-800';
      case SyncStatus.CONFLICT:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVerificationStatusColor = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.VERIFIED:
        return 'bg-green-100 text-green-800';
      case VerificationStatus.AUTO_VERIFIED:
        return 'bg-blue-100 text-blue-800';
      case VerificationStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case VerificationStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAssessmentIcon = (type: string) => {
    switch (type) {
      case 'HEALTH':
        return '🏥';
      case 'WASH':
        return '💧';
      case 'SHELTER':
        return '🏠';
      case 'FOOD':
        return '🍽️';
      case 'SECURITY':
        return '🛡️';
      case 'POPULATION':
        return '👥';
      case 'PRELIMINARY':
        return '🚨';
      default:
        return '📋';
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 shadow-sm p-6 transition-all ${
        onClick ? 'hover:shadow-md cursor-pointer hover:border-gray-300' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getAssessmentIcon(assessment.type)}</span>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {assessment.type} Assessment
                </h3>
                <p className="text-sm text-gray-600">
                  by {assessment.assessorName}
                </p>
              </div>
            </div>
            
            {/* Compact sync status */}
            <CompactAssessmentSyncStatus
              assessmentType={assessment.type as any}
              affectedEntityId={assessment.affectedEntityId}
              assessmentId={assessment.id}
              className="flex-shrink-0"
              onViewQueue={() => {
                window.open('/queue', '_blank');
              }}
            />
          </div>

          {/* Assessment Data Summary */}
          <div className="mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Date:</span>
                <p className="font-medium">{new Date(assessment.date).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-gray-500">Created:</span>
                <p className="font-medium">{formatDateTime(new Date(assessment.createdAt))}</p>
              </div>
              {assessment.isDraft && (
                <div>
                  <span className="text-gray-500">Last Modified:</span>
                  <p className="font-medium">{formatDateTime(new Date(assessment.lastModified))}</p>
                </div>
              )}
              {assessment.offlineId && (
                <div>
                  <span className="text-gray-500">Offline ID:</span>
                  <p className="font-medium text-xs">{assessment.offlineId.slice(-8)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {assessment.isDraft && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                Draft
              </span>
            )}
            
            {showSyncStatus && (
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSyncStatusColor(assessment.syncStatus)}`}>
                {assessment.syncStatus}
              </span>
            )}
            
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getVerificationStatusColor(assessment.verificationStatus)}`}>
              {assessment.verificationStatus}
            </span>

            {assessment.mediaAttachments && assessment.mediaAttachments.length > 0 && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                📎 {assessment.mediaAttachments.length} files
              </span>
            )}

            {assessment.type === 'PRELIMINARY' && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                🚨 Emergency
              </span>
            )}
          </div>

          {/* Quick Data Preview */}
          <div className="text-sm text-gray-600">
            {renderDataPreview(assessment.type, assessment.data)}
          </div>

          {/* Incident Info for Preliminary Assessments */}
          {assessment.type === 'PRELIMINARY' && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-medium text-red-900 mb-2">Incident Status</h4>
              {loadingIncident ? (
                <div className="text-xs text-red-700">Loading incident information...</div>
              ) : incidentInfo ? (
                <div className="space-y-1 text-xs text-red-700">
                  <div><strong>Incident:</strong> {incidentInfo.name}</div>
                  <div><strong>Status:</strong> 
                    <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                      incidentInfo.status === 'ACTIVE' 
                        ? 'bg-red-100 text-red-800'
                        : incidentInfo.status === 'CONTAINED'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {incidentInfo.status}
                    </span>
                  </div>
                  <div><strong>Severity:</strong> {incidentInfo.severity}</div>
                </div>
              ) : (
                <div className="text-xs text-red-700">
                  {assessment.syncStatus === 'SYNCED' 
                    ? 'Incident creation pending or failed'
                    : 'Incident will be created when synced'
                  }
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col space-y-2 ml-4">
          {assessment.syncStatus === SyncStatus.FAILED && onRetrySync && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onRetrySync();
              }}
            >
              Retry Sync
            </Button>
          )}
          
          {onDelete && (
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this assessment?')) {
                  onDelete();
                }
              }}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to render a preview of assessment data
function renderDataPreview(type: string, data: any): React.ReactNode {
  if (!data) return 'No data available';

  switch (type) {
    case 'HEALTH':
      return (
        <div>
          Health facilities: {data.numberHealthFacilities || 0} • 
          Health workers: {data.qualifiedHealthWorkers || 0}
          {data.hasFunctionalClinic && ' • Has functional clinic'}
        </div>
      );
    
    case 'WASH':
      return (
        <div>
          Water sufficient: {data.isWaterSufficient ? 'Yes' : 'No'} • 
          Water quality: {data.waterQuality || 'Unknown'} • 
          Toilets: {data.numberToilets || 0}
        </div>
      );
    
    case 'SHELTER':
      return (
        <div>
          Shelters: {data.numberShelters || 0} • 
          Condition: {data.shelterCondition || 'Unknown'} • 
          Sufficient: {data.areSheltersSufficient ? 'Yes' : 'No'}
        </div>
      );
    
    case 'FOOD':
      return (
        <div>
          Food duration: {data.availableFoodDurationDays || 0} days • 
          Malnutrition cases: {data.malnutritionCases || 0}
          {data.feedingProgramExists && ' • Has feeding program'}
        </div>
      );
    
    case 'SECURITY':
      return (
        <div>
          Area secure: {data.isAreaSecure ? 'Yes' : 'No'} • 
          Incidents: {data.incidentsReported || 0} • 
          Security presence: {data.hasSecurityPresence ? 'Yes' : 'No'}
        </div>
      );
    
    case 'POPULATION':
      return (
        <div>
          Total population: {data.totalPopulation || 0} • 
          Households: {data.totalHouseholds || 0} • 
          Casualties: {data.numberLivesLost || 0} lost, {data.numberInjured || 0} injured
        </div>
      );
    
    case 'PRELIMINARY':
      return (
        <div>
          Incident Type: {data.incidentType || 'Unknown'} • 
          Severity: {data.severity || 'Unknown'} • 
          Affected Population: {data.affectedPopulationEstimate || 0} • 
          Priority: {data.priorityLevel || 'NORMAL'}
        </div>
      );
    
    default:
      return 'Assessment data available';
  }
}