// app/(dashboard)/admin/page.tsx

import { Metadata } from 'next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Activity, 
  Users, 
  Database,
  FileText,
  TrendingUp,
  AlertTriangle,
  Settings
} from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Admin Dashboard - DMS',
  description: 'Administrative dashboard for disaster management system',
};

export default function AdminDashboardPage() {
  const adminModules = [
    {
      title: 'Audit & Security',
      description: 'Monitor user activities, security events, and system access logs',
      icon: <Shield className="h-6 w-6" />,
      href: '/admin/audit',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'System Monitoring',
      description: 'View real-time system performance metrics and health status',
      icon: <Activity className="h-6 w-6" />,
      href: '/admin/monitoring',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'User Management',
      description: 'Manage user accounts, roles, and permissions',
      icon: <Users className="h-6 w-6" />,
      href: '/admin/users',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Database Management',
      description: 'Database maintenance, backups, and data integrity checks',
      icon: <Database className="h-6 w-6" />,
      href: '/admin/database',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Reports & Analytics',
      description: 'Generate system reports and view usage analytics',
      icon: <FileText className="h-6 w-6" />,
      href: '/admin/reports',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'System Configuration',
      description: 'Configure system settings, integrations, and preferences',
      icon: <Settings className="h-6 w-6" />,
      href: '/admin/settings',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    }
  ];

  const quickStats = [
    {
      label: 'System Health',
      value: 'Healthy',
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'text-green-600'
    },
    {
      label: 'Active Users',
      value: '127',
      icon: <Users className="h-4 w-4" />,
      color: 'text-blue-600'
    },
    {
      label: 'Security Alerts',
      value: '0',
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-green-600'
    },
    {
      label: 'Uptime',
      value: '99.9%',
      icon: <Activity className="h-4 w-4" />,
      color: 'text-green-600'
    }
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          System administration and monitoring for the disaster management system
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <div className={stat.color}>{stat.icon}</div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Admin Modules */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Administration Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminModules.map((module, index) => (
            <Link key={index} href={module.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${module.bgColor} flex items-center justify-center mb-3`}>
                    <div className={module.color}>{module.icon}</div>
                  </div>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {module.description}
                  </p>
                  <Button variant="ghost" className="mt-4 p-0 h-auto text-sm font-medium">
                    Access Module →
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/audit">
              <Button variant="outline" size="sm">
                <Shield className="h-4 w-4 mr-2" />
                View Security Events
              </Button>
            </Link>
            <Link href="/admin/monitoring">
              <Button variant="outline" size="sm">
                <Activity className="h-4 w-4 mr-2" />
                Check System Status
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
            </Link>
            <Link href="/admin/reports">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent System Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">System backup completed successfully</span>
              </div>
              <span className="text-xs text-muted-foreground">2 minutes ago</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">New user registration: john.doe@example.com</span>
              </div>
              <span className="text-xs text-muted-foreground">15 minutes ago</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Performance alert resolved: High CPU usage</span>
              </div>
              <span className="text-xs text-muted-foreground">1 hour ago</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm">Data export completed: Activity logs (CSV)</span>
              </div>
              <span className="text-xs text-muted-foreground">3 hours ago</span>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/admin/audit" className="w-full">
              <Button variant="ghost" size="sm" className="w-full">
                View All Activity →
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}