// app/(dashboard)/admin/page.tsx
'use client';

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
  Settings,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { useDashboardBadges } from '@/hooks/useDashboardBadges';
import { useAdminData } from '@/hooks/useAdminData';
import { useSystemHealth } from '@/hooks/useSystemHealth';

export default function AdminDashboardPage() {
  const { badges, loading, error, refetch: refetchBadges } = useDashboardBadges();
  const { userActivity, systemMetrics, loading: adminLoading } = useAdminData();
  const { health: systemHealth, loading: healthLoading, refetch: refetchHealth } = useSystemHealth();
  
  const handleRefresh = () => {
    refetchBadges();
    refetchHealth();
    window.location.reload(); // Full refresh for admin data
  };
  
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
      title: 'Role Management',
      description: 'Configure user roles, permissions, and access control',
      icon: <Settings className="h-6 w-6" />,
      href: '/admin/roles',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
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

  // Create dynamic quick stats from real-time data
  const quickStats = [
    {
      label: 'System Health',
      value: healthLoading ? '...' : `${systemHealth?.overall.score || badges?.systemHealth || 95}%`,
      icon: <TrendingUp className="h-4 w-4" />,
      color: healthLoading ? 'text-gray-600' : 
              (systemHealth?.overall.score || badges?.systemHealth || 95) >= 95 ? 'text-green-600' : 
              (systemHealth?.overall.score || badges?.systemHealth || 95) >= 80 ? 'text-yellow-600' : 'text-red-600'
    },
    {
      label: 'Active Users',
      value: String(badges?.activeUsers || 0),
      icon: <Users className="h-4 w-4" />,
      color: 'text-blue-600'
    },
    {
      label: 'Security Alerts',
      value: String(systemHealth?.security.recentEvents || badges?.securityAlerts || 0),
      icon: <AlertTriangle className="h-4 w-4" />,
      color: (systemHealth?.security.recentEvents || badges?.securityAlerts || 0) === 0 ? 'text-green-600' : 'text-red-600'
    },
    {
      label: 'API Response Time',
      value: healthLoading ? '...' : `${systemHealth?.api.avgResponseTime || 0}ms`,
      icon: <Activity className="h-4 w-4" />,
      color: healthLoading ? 'text-gray-600' :
              (systemHealth?.api.avgResponseTime || 0) < 500 ? 'text-green-600' :
              (systemHealth?.api.avgResponseTime || 0) < 1000 ? 'text-yellow-600' : 'text-red-600'
    }
  ];
  
  if (loading && !badges) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded h-20"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold mb-2">Error Loading Dashboard</h2>
          <p className="text-red-600">Unable to load dashboard data: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System administration and monitoring for the disaster management system
          </p>
        </div>
        <Button 
          onClick={handleRefresh}
          variant="outline" 
          size="sm"
          disabled={loading || healthLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading || healthLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
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
            <Link href="/admin/roles">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Manage Roles
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

      {/* System Health Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Health Status</CardTitle>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="text-center py-4">Loading health status...</div>
          ) : systemHealth ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Status</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    systemHealth.overall.status === 'HEALTHY' ? 'bg-green-500' :
                    systemHealth.overall.status === 'WARNING' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className={`text-sm font-medium ${
                    systemHealth.overall.status === 'HEALTHY' ? 'text-green-600' :
                    systemHealth.overall.status === 'WARNING' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {systemHealth.overall.status}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground">CPU Usage</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          systemHealth.system.cpuUsage > 90 ? 'bg-red-500' :
                          systemHealth.system.cpuUsage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${systemHealth.system.cpuUsage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs">{systemHealth.system.cpuUsage}%</span>
                  </div>
                </div>
                
                <div>
                  <span className="text-xs text-muted-foreground">Memory Usage</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          systemHealth.system.memoryUsage > 90 ? 'bg-red-500' :
                          systemHealth.system.memoryUsage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${systemHealth.system.memoryUsage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs">{systemHealth.system.memoryUsage}%</span>
                  </div>
                </div>
                
                <div>
                  <span className="text-xs text-muted-foreground">API Response</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{systemHealth.api.avgResponseTime}ms</span>
                    <div className={`w-2 h-2 rounded-full ${
                      systemHealth.api.status === 'GOOD' ? 'bg-green-500' :
                      systemHealth.api.status === 'WARNING' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                </div>
                
                <div>
                  <span className="text-xs text-muted-foreground">Security Events</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{systemHealth.security.recentEvents}</span>
                    <div className={`w-2 h-2 rounded-full ${
                      systemHealth.security.status === 'GOOD' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">No health data available</div>
          )}
          <div className="mt-4">
            <Link href="/admin/monitoring" className="w-full">
              <Button variant="ghost" size="sm" className="w-full">
                View Detailed Metrics →
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity - Real Data */}
      <Card>
        <CardHeader>
          <CardTitle>Recent System Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {adminLoading ? (
              <div className="text-center py-4">Loading activity...</div>
            ) : userActivity && userActivity.length > 0 ? (
              userActivity.slice(0, 4).map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.eventType === 'SECURITY_EVENT' ? 'bg-red-500' :
                      activity.eventType === 'USER_ACTION' ? 'bg-blue-500' :
                      activity.eventType === 'SYSTEM_EVENT' ? 'bg-green-500' :
                      'bg-gray-500'
                    }`}></div>
                    <span className="text-sm">{activity.description}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">No recent activity</div>
            )}
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