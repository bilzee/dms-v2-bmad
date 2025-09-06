// app/(dashboard)/admin/audit/page.tsx

import { Metadata } from 'next';
import { AuditDashboard } from '@/components/features/admin/audit/AuditDashboard';

export const metadata: Metadata = {
  title: 'Audit Dashboard - Admin',
  description: 'Monitor system activity, security events, and performance metrics',
};

export default function AuditPage() {
  return (
    <div className="container mx-auto py-6">
      <AuditDashboard />
    </div>
  );
}