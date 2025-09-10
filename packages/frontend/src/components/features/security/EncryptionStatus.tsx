/**
 * Epic 10: Encryption Status Component
 * Displays offline encryption status and security metrics to users
 * Provides transparency about data protection in humanitarian operations
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Lock, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Trash2,
  Info
} from 'lucide-react';
import { useEncryptedStorage } from '@/hooks/useEncryptedStorage';
import { DataSensitivity } from '@/lib/encryption/SensitiveDataManager';
import { SensitiveDataType } from '@/lib/encryption/EncryptedStorage';

interface EncryptionStatusProps {
  className?: string;
  showActions?: boolean;
}

export const EncryptionStatus: React.FC<EncryptionStatusProps> = ({ 
  className = "",
  showActions = true 
}) => {
  const encryptedStorage = useEncryptedStorage();
  const [metrics, setMetrics] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCleanup, setLastCleanup] = useState<Date | null>(null);

  // Load metrics on component mount and when encryption initializes
  useEffect(() => {
    if (encryptedStorage.isInitialized) {
      loadMetrics();
    }
  }, [encryptedStorage.isInitialized]);

  const loadMetrics = async () => {
    try {
      const data = await encryptedStorage.getMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load encryption metrics:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadMetrics();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCleanup = async () => {
    try {
      const result = await encryptedStorage.performCleanup();
      setLastCleanup(new Date());
      await loadMetrics(); // Refresh metrics after cleanup
      
      if (result.itemsRemoved > 0) {
        alert(`Cleanup completed: ${result.itemsRemoved} old items removed from ${result.dataTypes.join(', ')}`);
      } else {
        alert('No old items found to clean up');
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
      alert('Cleanup failed - please try again');
    }
  };

  const getSensitivityColor = (sensitivity: DataSensitivity): string => {
    switch (sensitivity) {
      case DataSensitivity.RESTRICTED:
        return 'bg-red-100 text-red-800 border-red-200';
      case DataSensitivity.CONFIDENTIAL:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case DataSensitivity.INTERNAL:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case DataSensitivity.PUBLIC:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (encryptedStorage.isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            <span>Loading encryption status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!encryptedStorage.isInitialized) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center text-orange-700">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Encryption Not Available
          </CardTitle>
          <CardDescription>
            {encryptedStorage.error || 'User session required to enable offline encryption'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>Secure offline storage is not available. This may be due to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>No active user session</li>
              <li>Web Crypto API not supported</li>
              <li>Browser security restrictions</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center text-green-700">
          <Shield className="h-5 w-5 mr-2" />
          Offline Encryption Active
        </CardTitle>
        <CardDescription>
          Sensitive humanitarian data is protected with AES-256-GCM encryption
        </CardDescription>
        {showActions && (
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleCleanup}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Cleanup
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Security Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center">
              <Lock className="h-4 w-4 mr-2 text-green-600" />
              <span className="text-sm font-medium">Security Level</span>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {metrics?.securityLevel || 'AES-256-GCM'}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-blue-600" />
              <span className="text-sm font-medium">GDPR Compliant</span>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {metrics?.gdprCompliant ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>

        {/* Storage Metrics */}
        {metrics && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Encrypted Storage</h4>
              <span className="text-sm text-muted-foreground">
                {metrics.totalItems} items, {formatBytes(metrics.encryptedSize)}
              </span>
            </div>

            {/* Data Types Breakdown */}
            <div className="space-y-3">
              {Object.entries(metrics.byDataType).map(([dataType, count]) => (
                <div key={dataType} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm capitalize">{dataType.replace('-', ' ')}</span>
                    <span className="text-sm text-muted-foreground">{count as number} items</span>
                  </div>
                  <Progress 
                    value={((count as number) / metrics.totalItems) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>

            {/* Old Items Warning */}
            {metrics.oldItems > 0 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">
                    {metrics.oldItems} items need re-encryption
                  </span>
                </div>
                <p className="text-sm text-orange-600 mt-1">
                  Some encrypted data is using older keys and should be re-encrypted for optimal security.
                </p>
              </div>
            )}

            {/* Classifications */}
            {metrics.classifications && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Data Classifications</h4>
                <div className="space-y-2">
                  {metrics.classifications.map((classification: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center space-x-2">
                        <Database className="h-3 w-3 text-gray-500" />
                        <span className="text-sm capitalize">
                          {classification.dataType.replace('-', ' ')}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={getSensitivityColor(classification.sensitivity)}
                        >
                          {classification.sensitivity}
                        </Badge>
                      </div>
                      <div className="flex items-center">
                        {classification.encrypted && (
                          <Lock className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last Cleanup Info */}
            {lastCleanup && (
              <div className="text-xs text-muted-foreground">
                Last cleanup: {lastCleanup.toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* Security Information */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start">
            <Info className="h-4 w-4 mr-2 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Security Features:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                <li>AES-256-GCM encryption with authenticated encryption</li>
                <li>PBKDF2 key derivation with 100,000 iterations</li>
                <li>Automatic key rotation every 24 hours</li>
                <li>User-bound encryption keys for multi-tenant security</li>
                <li>Automatic cleanup of expired data</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EncryptionStatus;