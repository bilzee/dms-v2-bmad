'use client';

import { Card, CardContent } from '@/components/ui/card';
import { AssessmentType } from '@dms/shared';

const ASSESSMENT_TYPES = [
  { 
    type: AssessmentType.HEALTH, 
    label: 'Health', 
    icon: '🏥', 
    color: 'border-emergency-500 hover:bg-emergency-50' 
  },
  { 
    type: AssessmentType.WASH, 
    label: 'WASH', 
    icon: '💧', 
    color: 'border-humanitarian-blue hover:bg-blue-50' 
  },
  { 
    type: AssessmentType.SHELTER, 
    label: 'Shelter', 
    icon: '🏠', 
    color: 'border-orange-500 hover:bg-orange-50' 
  },
  { 
    type: AssessmentType.FOOD, 
    label: 'Food', 
    icon: '🍚', 
    color: 'border-humanitarian-green hover:bg-green-50' 
  },
  { 
    type: AssessmentType.SECURITY, 
    label: 'Security', 
    icon: '🛡️', 
    color: 'border-purple-500 hover:bg-purple-50' 
  },
  { 
    type: AssessmentType.POPULATION, 
    label: 'Population', 
    icon: '👥', 
    color: 'border-humanitarian-slate hover:bg-gray-50' 
  },
];

interface AssessmentTypeGridProps {
  onSelectType: (type: AssessmentType) => void;
  pendingCounts?: Record<string, number>;
}

export function AssessmentTypeGrid({ 
  onSelectType, 
  pendingCounts = {} 
}: AssessmentTypeGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {ASSESSMENT_TYPES.map(type => (
        <Card 
          key={type.type} 
          className={`cursor-pointer transition-all hover:shadow-md ${type.color}`}
          onClick={() => onSelectType(type.type)}
        >
          <CardContent className="p-4 text-center">
            <div className="text-2xl mb-2">{type.icon}</div>
            <h3 className="font-medium text-sm">{type.label}</h3>
            {pendingCounts[type.type] > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {pendingCounts[type.type]} pending
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}