// app/(dashboard)/admin/layout.tsx

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export const metadata: Metadata = {
  title: 'Admin Dashboard - DMS',
  description: 'Administrative dashboard for disaster management system',
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Check if user is authenticated and has admin role
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/admin');
  }

  // TEMPORARY: Let's inspect the full session structure
  console.log('=== FULL SESSION INSPECTION ===');
  console.log('Session keys:', Object.keys(session || {}));
  console.log('Session user:', session?.user);
  console.log('Session user roles:', (session as any)?.user?.roles);
  console.log('Session user activeRole:', (session as any)?.user?.activeRole);
  console.log('Session user allRoles:', (session as any)?.user?.allRoles);
  
  // Check if user has admin role - use multiple fallback strategies
  const activeRoleName = (session as any)?.user?.activeRole?.name;
  const sessionRoleName = (session as any)?.user?.role;
  const rawRoles = (session as any)?.user?.roles || [];
  const userRoles = rawRoles.map((r: any) => r.name) || [];
  
  // More permissive admin check - try multiple approaches
  const hasAdminRoleFromActive = activeRoleName === 'ADMIN';
  const hasAdminRoleFromSession = sessionRoleName === 'ADMIN';
  const hasAdminRoleFromRoles = userRoles.includes('ADMIN');
  const hasAdminRoleFromAllRoles = (session as any)?.user?.allRoles?.includes('ADMIN');
  
  // Try to find ADMIN role in any way possible
  let hasAdminRole = hasAdminRoleFromActive || hasAdminRoleFromSession || hasAdminRoleFromRoles || hasAdminRoleFromAllRoles;
  
  // Last resort: check if user has any admin-like permissions
  if (!hasAdminRole && (session as any)?.user?.permissions) {
    const permissions = (session as any)?.user?.permissions || [];
    hasAdminRole = permissions.some((p: string) => p.includes('admin') || p.includes('users:manage') || p.includes('system:monitor'));
  }
  
  console.log('Admin Layout Debug - Fixed:', {
    hasAdminRole,
    activeRoleName,
    sessionRoleName,
    hasAdminRoleFromActive,
    hasAdminRoleFromSession,
    hasAdminRoleFromRoles,
    hasAdminRoleFromAllRoles,
    userRoles
  });
  
  // Use the calculated hasAdminRole value
  
  if (!hasAdminRole) {
    redirect('/dashboard?error=access-denied');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-red-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">DMS</span>
              </div>
              <div>
                <h1 className="font-semibold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">System Administration</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Welcome, {session.user.name || session.user.email}
            </div>
          </div>
        </div>
      </div>
      
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}