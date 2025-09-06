// app/(dashboard)/admin/layout.tsx

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export const metadata: Metadata = {
  title: 'Admin Dashboard - DMS',
  description: 'Administrative dashboard for disaster management system',
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Check if user is authenticated and has admin role
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/admin');
  }

  // Check if user has admin role
  const userRoles = (session as any)?.roles || [];
  if (!userRoles.includes('ADMIN')) {
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