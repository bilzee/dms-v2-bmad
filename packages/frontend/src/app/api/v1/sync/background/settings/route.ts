import { NextRequest, NextResponse } from 'next/server';
import { backgroundSyncManager } from '@/lib/sync/BackgroundSyncManager';
import type { BackgroundSyncSettings } from '@dms/shared';

export async function GET(req: NextRequest) {
  try {
    const settings = backgroundSyncManager.getSettings();

    return NextResponse.json({
      success: true,
      data: settings,
      error: null,
    });
  } catch (error) {
    console.error('Get background sync settings error:', error);
    
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to get background sync settings',
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate the settings
    const validatedSettings = validateBackgroundSyncSettings(body);
    
    // Update the settings
    backgroundSyncManager.updateSettings(validatedSettings);
    
    const updatedSettings = backgroundSyncManager.getSettings();

    return NextResponse.json({
      success: true,
      data: {
        message: 'Background sync settings updated successfully',
        settings: updatedSettings,
        updatedAt: new Date().toISOString(),
      },
      error: null,
    });

  } catch (error) {
    console.error('Update background sync settings error:', error);
    
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to update background sync settings',
      },
      { status: 500 }
    );
  }
}

function validateBackgroundSyncSettings(settings: Partial<BackgroundSyncSettings>): Partial<BackgroundSyncSettings> {
  const validated: Partial<BackgroundSyncSettings> = {};

  if (typeof settings.enabled === 'boolean') {
    validated.enabled = settings.enabled;
  }

  if (typeof settings.syncOnlyWhenCharging === 'boolean') {
    validated.syncOnlyWhenCharging = settings.syncOnlyWhenCharging;
  }

  if (typeof settings.minimumBatteryLevel === 'number' && 
      settings.minimumBatteryLevel >= 0 && 
      settings.minimumBatteryLevel <= 100) {
    validated.minimumBatteryLevel = settings.minimumBatteryLevel;
  }

  if (typeof settings.maximumConcurrentOperations === 'number' && 
      settings.maximumConcurrentOperations >= 1 && 
      settings.maximumConcurrentOperations <= 10) {
    validated.maximumConcurrentOperations = settings.maximumConcurrentOperations;
  }

  if (typeof settings.syncIntervalMinutes === 'number' && 
      settings.syncIntervalMinutes >= 1 && 
      settings.syncIntervalMinutes <= 60) {
    validated.syncIntervalMinutes = settings.syncIntervalMinutes;
  }

  if (typeof settings.maxRetryAttempts === 'number' && 
      settings.maxRetryAttempts >= 1 && 
      settings.maxRetryAttempts <= 10) {
    validated.maxRetryAttempts = settings.maxRetryAttempts;
  }

  if (settings.priorityThreshold && 
      ['HIGH', 'NORMAL', 'LOW'].includes(settings.priorityThreshold)) {
    validated.priorityThreshold = settings.priorityThreshold as 'HIGH' | 'NORMAL' | 'LOW';
  }

  return validated;
}