'use client';

import React from 'react';
import { LeftPanel } from './LeftPanel';
import { CenterPanel } from './CenterPanel';
import { RightPanel } from './RightPanel';

interface AnalyticsDashboardProps {}

export function AnalyticsDashboard({}: AnalyticsDashboardProps) {
  return (
    <div className="flex-1 min-h-screen">
      {/* Full-screen 3-panel layout optimized for 1920x1080+ displays */}
      <div className="h-screen grid grid-cols-1 md:grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left Panel - Mobile: full width, Desktop: 3 columns */}
        <div className="md:col-span-3 h-full md:h-auto max-h-screen md:max-h-full">
          <LeftPanel />
        </div>

        {/* Center Panel - Mobile: full width, Desktop: 6 columns */}
        <div className="md:col-span-6 h-full md:h-auto max-h-screen md:max-h-full">
          <CenterPanel />
        </div>

        {/* Right Panel - Mobile: full width, Desktop: 3 columns */}
        <div className="md:col-span-3 h-full md:h-auto max-h-screen md:max-h-full">
          <RightPanel />
        </div>
      </div>

      {/* Mobile/Tablet fallback - stacked layout */}
      <style jsx>{`
        @media (max-width: 1023px) {
          .h-screen.grid {
            height: auto;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          .h-full.md\\:h-auto {
            height: auto;
            min-height: 300px;
          }
        }
      `}</style>
    </div>
  );
}