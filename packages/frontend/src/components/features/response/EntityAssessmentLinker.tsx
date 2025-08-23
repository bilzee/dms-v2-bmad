'use client';

import React, { useState, useMemo } from 'react';
import { 
  ResponseType,
  AssessmentType,
  VerificationStatus,
  type AffectedEntity,
  type RapidAssessment 
} from '@dms/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormLabel } from '@/components/ui/form';

interface EntityAssessmentLinkerProps {
  selectedEntity: AffectedEntity | null;
  selectedAssessment: RapidAssessment | null;
  availableEntities: AffectedEntity[];
  availableAssessments: RapidAssessment[];
  responseType: ResponseType;
  onEntitySelect: (entity: AffectedEntity) => void;
  onAssessmentSelect: (assessment: RapidAssessment) => void;
  className?: string;
}

export function EntityAssessmentLinker({
  selectedEntity,
  selectedAssessment,
  availableEntities,
  availableAssessments,
  responseType,
  onEntitySelect,
  onAssessmentSelect,
  className,
}: EntityAssessmentLinkerProps) {
  const [entitySearchTerm, setEntitySearchTerm] = useState('');
  const [assessmentSearchTerm, setAssessmentSearchTerm] = useState('');
  const [showEntityList, setShowEntityList] = useState(false);
  const [showAssessmentList, setShowAssessmentList] = useState(false);

  // Filter entities based on search term
  const filteredEntities = useMemo(() => {
    if (!entitySearchTerm) return availableEntities;
    
    const searchLower = entitySearchTerm.toLowerCase();
    return availableEntities.filter(entity => 
      entity.name.toLowerCase().includes(searchLower) ||
      entity.lga.toLowerCase().includes(searchLower) ||
      entity.ward.toLowerCase().includes(searchLower)
    );
  }, [availableEntities, entitySearchTerm]);

  // Filter assessments based on response type and search term
  const filteredAssessments = useMemo(() => {
    let filtered = availableAssessments;

    // Filter by related assessment types for the response type
    const relatedAssessmentTypes = getRelatedAssessmentTypes(responseType);
    filtered = filtered.filter(assessment => 
      relatedAssessmentTypes.includes(assessment.type)
    );

    // If entity is selected, prioritize assessments for that entity
    if (selectedEntity) {
      filtered = filtered.filter(assessment => 
        assessment.affectedEntityId === selectedEntity.id
      );
    }

    // Apply search filter
    if (assessmentSearchTerm) {
      const searchLower = assessmentSearchTerm.toLowerCase();
      filtered = filtered.filter(assessment => 
        assessment.assessorName.toLowerCase().includes(searchLower) ||
        assessment.type.toLowerCase().includes(searchLower)
      );
    }

    // Sort by verification status and date (verified and recent first)
    return filtered.sort((a, b) => {
      const statusPriority = { VERIFIED: 3, AUTO_VERIFIED: 2, PENDING: 1, REJECTED: 0 };
      const statusDiff = statusPriority[b.verificationStatus] - statusPriority[a.verificationStatus];
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [availableAssessments, responseType, selectedEntity, assessmentSearchTerm]);

  // Get assessment priority indicators
  const getAssessmentPriorityColor = (assessment: RapidAssessment): string => {
    switch (assessment.verificationStatus) {
      case VerificationStatus.VERIFIED:
        return 'bg-green-100 text-green-800 border-green-200';
      case VerificationStatus.AUTO_VERIFIED:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case VerificationStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case VerificationStatus.REJECTED:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Handle entity selection
  const handleEntitySelect = (entity: AffectedEntity) => {
    onEntitySelect(entity);
    setShowEntityList(false);
    setEntitySearchTerm('');
  };

  // Handle assessment selection
  const handleAssessmentSelect = (assessment: RapidAssessment) => {
    onAssessmentSelect(assessment);
    setShowAssessmentList(false);
    setAssessmentSearchTerm('');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Link to Affected Entity & Assessment</h3>
        <div className="text-sm text-gray-500">
          Step 1 of Response Planning
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entity Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel>Affected Entity *</FormLabel>
            <span className="text-xs text-gray-500">
              {filteredEntities.length} entities available
            </span>
          </div>

          {/* Selected Entity Display */}
          {selectedEntity ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">
                      {selectedEntity.type === 'CAMP' ? '🏕️' : '🏘️'}
                    </span>
                    <h4 className="font-semibold text-gray-900">{selectedEntity.name}</h4>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {selectedEntity.type}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>📍 {selectedEntity.lga}, {selectedEntity.ward}</p>
                    <p>🗺️ {selectedEntity.latitude.toFixed(4)}, {selectedEntity.longitude.toFixed(4)}</p>
                    {selectedEntity.campDetails && (
                      <p>👥 Est. Population: {selectedEntity.campDetails.estimatedPopulation || 'Unknown'}</p>
                    )}
                    {selectedEntity.communityDetails && (
                      <p>🏠 Est. Households: {selectedEntity.communityDetails.estimatedHouseholds || 'Unknown'}</p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEntityList(true)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Change
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <p className="text-gray-600 mb-4">No entity selected</p>
              <Button
                type="button"
                onClick={() => setShowEntityList(true)}
                className="flex items-center gap-2"
              >
                <span>📍</span>
                Select Affected Entity
              </Button>
            </div>
          )}

          {/* Entity Selection Modal/List */}
          {showEntityList && (
            <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Select Affected Entity</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEntityList(false)}
                >
                  ✕
                </Button>
              </div>

              <Input
                type="text"
                placeholder="Search by entity name, LGA, or ward..."
                value={entitySearchTerm}
                onChange={(e) => setEntitySearchTerm(e.target.value)}
                className="mb-3"
              />

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredEntities.map(entity => (
                  <div
                    key={entity.id}
                    className="bg-white border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleEntitySelect(entity)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{entity.type === 'CAMP' ? '🏕️' : '🏘️'}</span>
                      <span className="font-medium">{entity.name}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {entity.type}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      📍 {entity.lga}, {entity.ward}
                    </div>
                  </div>
                ))}

                {filteredEntities.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p>No entities found</p>
                    {entitySearchTerm && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => setEntitySearchTerm('')}
                        className="mt-2"
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Assessment Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel>Related Assessment (Optional)</FormLabel>
            <span className="text-xs text-gray-500">
              {filteredAssessments.length} relevant assessments
            </span>
          </div>

          {/* Selected Assessment Display */}
          {selectedAssessment ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📋</span>
                    <h4 className="font-semibold text-gray-900">
                      {selectedAssessment.type} Assessment
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded border ${getAssessmentPriorityColor(selectedAssessment)}`}>
                      {selectedAssessment.verificationStatus}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>👤 Assessor: {selectedAssessment.assessorName}</p>
                    <p>📅 Date: {new Date(selectedAssessment.date).toLocaleDateString()}</p>
                    {getAssessmentRecommendations(selectedAssessment, responseType).length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium text-gray-700">Recommendations:</p>
                        <div className="text-xs text-gray-600">
                          {getAssessmentRecommendations(selectedAssessment, responseType).map((rec, idx) => (
                            <span key={idx} className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded mr-1 mb-1">
                              {rec}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAssessmentList(true)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Change
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onAssessmentSelect(null as any)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <p className="text-gray-600 mb-2">No assessment linked</p>
              <p className="text-xs text-gray-500 mb-4">
                Link an assessment to get context-aware item recommendations
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAssessmentList(true)}
                disabled={!selectedEntity}
                className="flex items-center gap-2"
              >
                <span>📋</span>
                {selectedEntity ? 'Link Assessment' : 'Select Entity First'}
              </Button>
            </div>
          )}

          {/* Assessment Selection Modal/List */}
          {showAssessmentList && (
            <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Link Related Assessment</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAssessmentList(false)}
                >
                  ✕
                </Button>
              </div>

              <Input
                type="text"
                placeholder="Search by assessor name or type..."
                value={assessmentSearchTerm}
                onChange={(e) => setAssessmentSearchTerm(e.target.value)}
                className="mb-3"
              />

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredAssessments.map(assessment => (
                  <div
                    key={assessment.id}
                    className="bg-white border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleAssessmentSelect(assessment)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span>📋</span>
                        <span className="font-medium">{assessment.type} Assessment</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded border ${getAssessmentPriorityColor(assessment)}`}>
                        {assessment.verificationStatus}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>👤 {assessment.assessorName}</p>
                      <p>📅 {new Date(assessment.date).toLocaleDateString()}</p>
                    </div>
                    {getAssessmentRecommendations(assessment, responseType).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {getAssessmentRecommendations(assessment, responseType).slice(0, 3).map((rec, idx) => (
                          <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {rec}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {filteredAssessments.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p>
                      {selectedEntity 
                        ? `No ${getRelatedAssessmentTypes(responseType).join('/')} assessments found for this entity`
                        : 'Select an entity first to see relevant assessments'
                      }
                    </p>
                    {assessmentSearchTerm && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => setAssessmentSearchTerm('')}
                        className="mt-2"
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Context Information */}
      {selectedEntity && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Response Context</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Response Type:</span>
              <p className="text-gray-600">{responseType}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Target Location:</span>
              <p className="text-gray-600">{selectedEntity.name}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Assessment Link:</span>
              <p className="text-gray-600">
                {selectedAssessment ? `${selectedAssessment.type} Assessment` : 'No assessment linked'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get related assessment types for a response type
function getRelatedAssessmentTypes(responseType: ResponseType): AssessmentType[] {
  switch (responseType) {
    case ResponseType.HEALTH:
      return [AssessmentType.HEALTH, AssessmentType.PRELIMINARY];
    case ResponseType.WASH:
      return [AssessmentType.WASH, AssessmentType.PRELIMINARY];
    case ResponseType.SHELTER:
      return [AssessmentType.SHELTER, AssessmentType.PRELIMINARY];
    case ResponseType.FOOD:
      return [AssessmentType.FOOD, AssessmentType.PRELIMINARY];
    case ResponseType.SECURITY:
      return [AssessmentType.SECURITY, AssessmentType.PRELIMINARY];
    case ResponseType.POPULATION:
      return [AssessmentType.POPULATION, AssessmentType.PRELIMINARY];
    default:
      return [AssessmentType.PRELIMINARY];
  }
}

// Helper function to get assessment-based recommendations for response planning
function getAssessmentRecommendations(assessment: RapidAssessment, responseType: ResponseType): string[] {
  const recommendations: string[] = [];
  
  if (assessment.type === AssessmentType.PRELIMINARY) {
    const data = assessment.data as any;
    if (data.priorityLevel === 'HIGH') {
      recommendations.push('High Priority');
    }
    if (data.accessibilityStatus === 'INACCESSIBLE') {
      recommendations.push('Access Challenges');
    }
  }
  
  // Add type-specific recommendations
  if (assessment.type === responseType) {
    const data = assessment.data as any;
    
    switch (responseType) {
      case ResponseType.HEALTH:
        if (data.hasFunctionalClinic === false) recommendations.push('Medical Setup Needed');
        if (data.qualifiedHealthWorkers < 2) recommendations.push('Staff Support');
        if (data.hasMedicineSupply === false) recommendations.push('Medicine Supply');
        break;
      
      case ResponseType.WASH:
        if (data.isWaterSufficient === false) recommendations.push('Water Supply');
        if (data.hasToilets === false) recommendations.push('Sanitation Facilities');
        if (data.waterQuality === 'Contaminated') recommendations.push('Water Treatment');
        break;
      
      case ResponseType.SHELTER:
        if (data.areSheltersSufficient === false) recommendations.push('Additional Shelters');
        if (data.needsTarpaulin) recommendations.push('Tarpaulins');
        if (data.needsBedding) recommendations.push('Bedding Kits');
        break;
      
      case ResponseType.FOOD:
        if (data.availableFoodDurationDays < 7) recommendations.push('Food Supply');
        if (data.malnutritionCases > 0) recommendations.push('Nutrition Support');
        break;
    }
  }
  
  return recommendations;
}