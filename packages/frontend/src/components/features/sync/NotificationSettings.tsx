'use client';

import React, { useState } from 'react';
import { Settings, Bell, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useNotificationSettings } from '@/hooks/useNotifications';
import type { NotificationSettings } from '@/lib/services/notification.service';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, updateSettings } = useNotificationSettings();
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings: NotificationSettings = {
      enableSyncFailureNotifications: true,
      enableHealthEmergencyAlerts: true,
      enableBatchNotifications: true,
      maxNotificationsPerMinute: 5,
      autoRetryNotifications: true,
    };
    setLocalSettings(defaultSettings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Notification Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Sync Failure Notifications */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-medium text-gray-900">
                Sync Failure Alerts
              </h3>
            </div>
            
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={localSettings.enableSyncFailureNotifications}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  enableSyncFailureNotifications: e.target.checked,
                })}
                className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Enable sync failure notifications
                </span>
                <p className="text-xs text-gray-500">
                  Get notified when assessments fail to sync to the server
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={localSettings.enableHealthEmergencyAlerts}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  enableHealthEmergencyAlerts: e.target.checked,
                })}
                className="mt-1 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Health emergency priority alerts
                </span>
                <p className="text-xs text-gray-500">
                  Show prominent alerts for health assessment sync failures
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={localSettings.enableBatchNotifications}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  enableBatchNotifications: e.target.checked,
                })}
                className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Batch failure notifications
                </span>
                <p className="text-xs text-gray-500">
                  Combine multiple failures into a single notification
                </p>
              </div>
            </label>
          </div>

          {/* Auto-retry Notifications */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-medium text-gray-900">
                Auto-retry Updates
              </h3>
            </div>
            
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={localSettings.autoRetryNotifications}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  autoRetryNotifications: e.target.checked,
                })}
                className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Show auto-retry progress
                </span>
                <p className="text-xs text-gray-500">
                  Get notified about automatic retry attempts
                </p>
              </div>
            </label>
          </div>

          {/* Rate Limiting */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">
                Notification Limits
              </h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum notifications per minute: {localSettings.maxNotificationsPerMinute}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={localSettings.maxNotificationsPerMinute}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  maxNotificationsPerMinute: parseInt(e.target.value),
                })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>5</span>
                <span>10</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Prevents notification spam by limiting the rate of notifications
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Notification Preview
            </h4>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                <span>🚨 Health Assessment failed to sync: Network connection error</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span>⚠️ Media file failed to sync: Request timed out</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>🔄 Assessment auto-retry 2/10. Next attempt in 3m</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>✅ WASH Assessment sync retry successful</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            Reset to Defaults
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple notification settings button component
export const NotificationSettingsButton: React.FC<{
  onClick: () => void;
  className?: string;
}> = ({ onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 ${className}`}
      title="Notification Settings"
    >
      <Bell className="w-4 h-4" />
      <span className="hidden sm:inline">Notifications</span>
    </button>
  );
};