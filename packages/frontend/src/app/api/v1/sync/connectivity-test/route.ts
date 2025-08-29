import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // This is a lightweight endpoint for connectivity testing
  // Used by ConnectivityDetector to measure response time
  
  const startTime = Date.now();
  
  try {
    // Simple response with minimal data
    const response = {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        server: 'DMS Background Sync',
        status: 'healthy',
      },
      responseTime: Date.now() - startTime,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'Connectivity test failed',
        responseTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}