'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { AutoApprovalConfiguration } from '@/components/features/verification/AutoApprovalConfiguration';
import { AutoApprovalConfig } from '@dms/shared';

export default function AutoApprovalConfigurationClient() {
  const [config, setConfig] = useState<AutoApprovalConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load existing configuration
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/v1/verification/auto-approval/config');
        
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        } else if (response.status === 404) {
          // No configuration exists yet, use defaults
          setConfig({
            enabled: false,
            rules: [],
            globalSettings: {
              maxAutoApprovalsPerHour: 50,
              requireCoordinatorOnline: true,
              emergencyOverrideEnabled: true,
              auditLogRetentionDays: 30,
            },
            coordinatorId: 'current-coordinator', // This should come from auth context
            lastUpdated: new Date(),
          });
        } else {
          throw new Error('Failed to load configuration');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load configuration');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfiguration();
  }, []);

  const handleSaveConfiguration = async (newConfig: AutoApprovalConfig) => {
    try {
      setError(null);
      setSuccessMessage(null);

      const response = await fetch('/api/v1/verification/auto-approval/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      const savedConfig = await response.json();
      setConfig(savedConfig);
      setSuccessMessage('Auto-approval configuration saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    }
  };

  const handleTestRules = async (rules: any[]) => {
    try {
      const response = await fetch('/api/v1/verification/auto-approval/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rules }),
      });

      if (!response.ok) {
        throw new Error('Failed to test rules');
      }

      return await response.json();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to test rules');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading auto-approval settings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !config) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Badges */}
      <div className="flex items-center gap-2">
        <Badge variant={config?.enabled ? 'default' : 'secondary'}>
          {config?.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
        <Badge variant="outline">
          {config?.rules?.length || 0} Rules
        </Badge>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Configuration Component */}
      {config && (
        <AutoApprovalConfiguration
          config={config}
          onConfigurationChange={setConfig}
          onSave={handleSaveConfiguration}
          onTestRules={handleTestRules}
        />
      )}

      {/* Footer Actions */}
      <Card>
        <CardContent className="flex justify-between items-center py-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {config?.lastUpdated ? new Date(config.lastUpdated).toLocaleString() : 'Never'}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
            <Link href="/coordinator/dashboard">
              <Button variant="outline" size="sm">
                Done
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}