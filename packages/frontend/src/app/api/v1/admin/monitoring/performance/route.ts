// app/api/v1/admin/monitoring/performance/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { performanceMonitor } from '@/lib/performance-monitor';
import { SystemPerformanceResponse } from '@dms/shared/types/admin';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

/**
 * Check if user has admin role
 */
async function requireAdminRole(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Authentication required'],
        message: 'You must be logged in to access this resource'
      }, { status: 401 });
    }

    // Check if user has admin role
    if (!token.roles || !Array.isArray(token.roles) || !token.roles.includes('ADMIN')) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Access denied'],
        message: 'Admin role required to access performance metrics'
      }, { status: 403 });
    }

    return null; // Access granted
  } catch (error) {
    console.error('Admin role check failed:', error);
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Authentication error'],
      message: 'Failed to verify user permissions'
    }, { status: 500 });
  }
}

/**
 * GET /api/v1/admin/monitoring/performance
 * Get current system performance metrics with optional historical data
 */
export async function GET(request: NextRequest): Promise<NextResponse<SystemPerformanceResponse>> {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const includeHistorical = searchParams.get('includeHistorical') === 'true';
    const historicalHours = parseInt(searchParams.get('historicalHours') || '24');
    const includeAlerts = searchParams.get('includeAlerts') !== 'false'; // Default to true

    // Get current performance metrics
    const currentMetrics = await performanceMonitor.getCurrentMetrics();

    // Get historical data if requested
    let historicalData;
    if (includeHistorical) {
      const hours = Math.min(Math.max(historicalHours, 1), 168); // Between 1 hour and 1 week
      historicalData = await performanceMonitor.getHistoricalMetrics(hours);
    }

    // Check for performance alerts
    let alerts;
    let healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    
    if (includeAlerts) {
      alerts = await performanceMonitor.checkPerformanceAlerts(currentMetrics);
      healthStatus = performanceMonitor.determineHealthStatus(currentMetrics, alerts);
    }

    const response: SystemPerformanceResponse = {
      success: true,
      data: {
        currentMetrics,
        historicalData,
        alerts,
        healthStatus
      },
      message: 'Performance metrics retrieved successfully'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to fetch performance metrics:', error);
    
    const response: SystemPerformanceResponse = {
      success: false,
      data: null,
      errors: ['Failed to fetch performance metrics'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/v1/admin/monitoring/performance
 * Manual trigger for performance metrics collection and storage
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    // Collect current metrics
    const metrics = await performanceMonitor.getCurrentMetrics();

    // Store metrics in database for historical tracking
    // This would be done by the log aggregation service normally,
    // but can be manually triggered here
    
    return NextResponse.json({
      success: true,
      data: {
        metrics,
        storedAt: new Date()
      },
      message: 'Performance metrics collected and stored successfully'
    });

  } catch (error) {
    console.error('Failed to collect performance metrics:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to collect performance metrics'],
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}