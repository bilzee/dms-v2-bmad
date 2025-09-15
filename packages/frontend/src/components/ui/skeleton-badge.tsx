import { Badge } from '@/components/ui/badge';

interface SkeletonBadgeProps {
  loading?: boolean;
  error?: string | null;
  value?: number;
  fallback?: number;
  variant?: 'default' | 'secondary' | 'destructive';
}

export function SkeletonBadge({ 
  loading, 
  error, 
  value, 
  fallback = 0,
  variant = 'default' 
}: SkeletonBadgeProps) {
  if (loading) {
    return (
      <div className="h-5 w-6 bg-gray-200 animate-pulse rounded"></div>
    );
  }

  if (error) {
    return (
      <Badge variant="destructive" className="h-5 text-xs" title={`Error: ${error}`}>
        !
      </Badge>
    );
  }

  const displayValue = value !== undefined ? value : fallback;
  
  return (
    <Badge 
      variant={value !== undefined ? variant : "secondary"} 
      className="h-5 text-xs"
      title={value === undefined ? "Using fallback data" : undefined}
    >
      {displayValue}
    </Badge>
  );
}