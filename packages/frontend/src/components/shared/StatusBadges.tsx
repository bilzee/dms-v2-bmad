'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Bot, AlertTriangle } from 'lucide-react';
import { VerificationStatus, ResponseStatus } from '@dms/shared';

interface AssessmentStatusBadgeProps {
  status: VerificationStatus;
}

export function AssessmentStatusBadge({ status }: AssessmentStatusBadgeProps) {
  const getVariantAndIcon = (status: VerificationStatus) => {
    switch (status) {
      case 'VERIFIED':
        return { 
          variant: 'default' as const, 
          icon: CheckCircle, 
          className: 'bg-status-verified text-white' 
        };
      case 'AUTO_VERIFIED':
        return { 
          variant: 'secondary' as const, 
          icon: Bot, 
          className: 'bg-humanitarian-blue text-white' 
        };
      case 'REJECTED':
        return { 
          variant: 'destructive' as const, 
          icon: AlertTriangle, 
          className: 'bg-status-failed text-white' 
        };
      default:
        return { 
          variant: 'outline' as const, 
          icon: Clock, 
          className: 'bg-status-pending text-white' 
        };
    }
  };

  const { variant, icon: Icon, className } = getVariantAndIcon(status);

  return (
    <Badge variant={variant} className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {status.replace('_', ' ')}
    </Badge>
  );
}

export function ResponseStatusBadge({ status }: { status: ResponseStatus }) {
  return (
    <Badge 
      variant={status === 'DELIVERED' ? 'default' : 'outline'}
      className={status === 'DELIVERED' ? 'bg-status-verified text-white' : ''}
    >
      {status.replace('_', ' ')}
    </Badge>
  );
}