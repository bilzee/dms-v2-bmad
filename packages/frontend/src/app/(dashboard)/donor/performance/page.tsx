'use client';

import React from 'react';
import { PerformanceDashboard } from '@/components/features/donor/PerformanceDashboard';
import { ConnectionStatusHeader } from '@/components/shared/ConnectionStatusHeader';

export default function DonorPerformancePage() {
  return (
    <div className="p-6 space-y-6">
      <ConnectionStatusHeader />
      <PerformanceDashboard />
    </div>
  );
}