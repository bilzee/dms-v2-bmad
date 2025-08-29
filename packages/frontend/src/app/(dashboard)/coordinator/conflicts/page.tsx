import { Metadata } from 'next';
import { ConflictResolver } from '@/components/features/sync/ConflictResolver';

export const metadata: Metadata = {
  title: 'Conflict Resolution | Coordinator Dashboard',
  description: 'Resolve sync conflicts for assessments and responses',
};

export default function ConflictsPage() {
  // TODO: Get actual coordinator ID from session/auth
  const coordinatorId = 'coordinator-1'; // Replace with actual auth implementation
  
  return (
    <div className="container mx-auto py-6">
      <ConflictResolver 
        coordinatorId={coordinatorId}
        className="max-w-7xl mx-auto"
      />
    </div>
  );
}