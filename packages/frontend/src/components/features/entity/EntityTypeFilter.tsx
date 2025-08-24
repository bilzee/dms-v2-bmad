'use client';

import { Button } from '@/components/ui/button';
import { Tent, Home } from 'lucide-react';

interface EntityTypeFilterProps {
  entityType: 'camps' | 'communities';
  onTypeChange: (type: 'camps' | 'communities') => void;
  campCount?: number;
  communityCount?: number;
}

export function EntityTypeFilter({ 
  entityType, 
  onTypeChange, 
  campCount = 0, 
  communityCount = 0 
}: EntityTypeFilterProps) {
  return (
    <div className="flex border rounded-lg p-1">
      <Button 
        variant={entityType === 'camps' ? 'default' : 'ghost'} 
        size="sm" 
        onClick={() => onTypeChange('camps')}
        className="flex-1"
      >
        <Tent className="w-4 h-4 mr-2" />
        Camps ({campCount})
      </Button>
      <Button 
        variant={entityType === 'communities' ? 'default' : 'ghost'} 
        size="sm" 
        onClick={() => onTypeChange('communities')}
        className="flex-1"
      >
        <Home className="w-4 h-4 mr-2" />
        Communities ({communityCount})
      </Button>
    </div>
  );
}