'use client';

import React from 'react';
import { AutoApprovalConfiguration } from '@/components/features/verification/AutoApprovalConfiguration';
import { AutoApprovalConfig } from '@dms/shared';

export default function AutoApprovalPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const handleConfigurationChange = (config: AutoApprovalConfig) => {
    // Handle configuration changes
    console.log('Configuration changed:', config);
    // Clear any previous errors/success messages
    setError(null);
    setSuccess(null);
  };

  const handleSave = async (config: AutoApprovalConfig) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/v1/config/auto-approval/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rules: config.rules,
          globalSettings: config.globalSettings,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }
      
      const result = await response.json();
      setSuccess(`Configuration saved successfully! ${result.data.rulesCreated} rules created, ${result.data.rulesUpdated} rules updated.`);
    } catch (error) {
      console.error('Error saving configuration:', error);
      setError(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestRules = async (rules: any[]) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/verification/auto-approval/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          rules,
          sampleSize: 50,
          targetType: 'BOTH' 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to test rules');
      }
      
      const results = await response.json();
      console.log('Test results:', results.data);
      
      // Show test results summary
      const stats = results.data.overallStats;
      setSuccess(`Rule testing complete! ${stats.totalMatched} items matched, ${stats.totalQualified} qualified for auto-approval (${Math.round(stats.averageQualificationRate)}% qualification rate).`);
    } catch (error) {
      console.error('Error testing rules:', error);
      setError(error instanceof Error ? error.message : 'Failed to test rules');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Auto-Approval Configuration</h1>
          <p className="text-muted-foreground">
            Configure automatic approval rules to streamline verification workflows
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <strong>Error:</strong> {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            <strong>Success:</strong> {success}
          </div>
        )}
        
        <AutoApprovalConfiguration
          onConfigurationChange={handleConfigurationChange}
          onSave={handleSave}
          onTestRules={handleTestRules}
        />
      </div>
    </div>
  );
}