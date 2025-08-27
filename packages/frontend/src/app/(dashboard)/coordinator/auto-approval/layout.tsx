import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export const metadata: Metadata = {
  title: 'Auto-Approval Configuration | DMS',
  description: 'Configure automatic approval rules for assessments and responses',
};

export default function AutoApprovalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}