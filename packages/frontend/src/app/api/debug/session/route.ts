import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    return NextResponse.json({
      session: session,
      userRoles: (session as any)?.roles?.map((r: any) => r.name) || [],
      rawRoles: (session as any)?.roles || [],
      hasAdminRole: (session as any)?.roles?.map((r: any) => r.name).includes('ADMIN') || false,
      hasAdminRoleFromActive: (session as any)?.activeRole?.name === 'ADMIN' || false,
      activeRole: (session as any)?.activeRole,
      role: (session as any)?.role,
      path: request.nextUrl.pathname
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to get session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}