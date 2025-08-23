'use client';

import React from 'react';
import { AssessmentType } from '@dms/shared';
import { Button } from '@/components/ui/button';

interface AssessmentTypeOption {
  type: AssessmentType;
  title: string;
  description: string;
  icon: string;
  color: string;
  isPrimary?: boolean;
}

interface AssessmentTypeSelectorProps {
  onTypeSelect: (type: AssessmentType) => void;
  selectedType?: AssessmentType;
}

const assessmentTypeOptions: AssessmentTypeOption[] = [
  {
    type: AssessmentType.PRELIMINARY,
    title: 'Preliminary Assessment',
    description: 'Initial incident reporting that triggers automatic incident creation and coordinator alerts',
    icon: '🚨',
    color: 'border-red-200 bg-red-50 hover:bg-red-100',
    isPrimary: true,
  },
  {
    type: AssessmentType.HEALTH,
    title: 'Health Assessment',
    description: 'Evaluate health facilities, medical supplies, and health worker capacity',
    icon: '🏥',
    color: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
  },
  {
    type: AssessmentType.WASH,
    title: 'WASH Assessment',
    description: 'Water, sanitation, and hygiene facilities assessment',
    icon: '💧',
    color: 'border-cyan-200 bg-cyan-50 hover:bg-cyan-100',
  },
  {
    type: AssessmentType.SHELTER,
    title: 'Shelter Assessment',
    description: 'Housing conditions, shelter needs, and accommodation capacity',
    icon: '🏠',
    color: 'border-orange-200 bg-orange-50 hover:bg-orange-100',
  },
  {
    type: AssessmentType.FOOD,
    title: 'Food Security Assessment',
    description: 'Food availability, nutrition status, and feeding programs',
    icon: '🍞',
    color: 'border-green-200 bg-green-50 hover:bg-green-100',
  },
  {
    type: AssessmentType.SECURITY,
    title: 'Security Assessment',
    description: 'Safety conditions, security threats, and protection needs',
    icon: '🛡️',
    color: 'border-purple-200 bg-purple-50 hover:bg-purple-100',
  },
  {
    type: AssessmentType.POPULATION,
    title: 'Population Assessment',
    description: 'Demographics, displacement, and population movement tracking',
    icon: '👥',
    color: 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100',
  },
];

export const AssessmentTypeSelector: React.FC<AssessmentTypeSelectorProps> = ({
  onTypeSelect,
  selectedType,
}) => {
  const primaryOption = assessmentTypeOptions.find(option => option.isPrimary);
  const regularOptions = assessmentTypeOptions.filter(option => !option.isPrimary);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Select Assessment Type
        </h2>
        <p className="text-gray-600">
          Choose the type of assessment you want to conduct
        </p>
      </div>

      {/* Primary Option - Preliminary Assessment */}
      {primaryOption && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">🚨</span>
            Emergency Response
          </h3>
          <div
            className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
              selectedType === primaryOption.type
                ? 'border-red-400 bg-red-100 shadow-md'
                : primaryOption.color
            }`}
            onClick={() => onTypeSelect(primaryOption.type)}
          >
            <div className="flex items-start">
              <div className="text-3xl mr-4">{primaryOption.icon}</div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {primaryOption.title}
                </h3>
                <p className="text-gray-700 mb-4">{primaryOption.description}</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Creates Incident
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    High Priority
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Notifies Coordinators
                  </span>
                </div>
              </div>
              <div className="ml-4">
                {selectedType === primaryOption.type ? (
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                ) : (
                  <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regular Assessment Options */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">📊</span>
          Sector-Specific Assessments
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {regularOptions.map((option) => (
            <div
              key={option.type}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedType === option.type
                  ? 'border-blue-400 bg-blue-100 shadow-md'
                  : option.color
              }`}
              onClick={() => onTypeSelect(option.type)}
            >
              <div className="flex items-start">
                <div className="text-2xl mr-3">{option.icon}</div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">
                    {option.title}
                  </h4>
                  <p className="text-sm text-gray-700">{option.description}</p>
                </div>
                <div className="ml-2">
                  {selectedType === option.type ? (
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Information Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Assessment Guidelines</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Preliminary Assessment:</strong> Use when first discovering a new disaster or emergency situation</li>
          <li>• <strong>Sector Assessments:</strong> Use for detailed evaluation of specific needs in affected areas</li>
          <li>• All assessments include GPS capture, media attachments, and offline support</li>
          <li>• Data is automatically encrypted for sensitive assessments (Health, Population, Preliminary)</li>
        </ul>
      </div>

      {/* Continue Button */}
      {selectedType && (
        <div className="mt-8 text-center">
          <Button
            onClick={() => onTypeSelect(selectedType)}
            size="lg"
            className="px-8 py-3"
          >
            Continue with {assessmentTypeOptions.find(opt => opt.type === selectedType)?.title}
          </Button>
        </div>
      )}
    </div>
  );
};