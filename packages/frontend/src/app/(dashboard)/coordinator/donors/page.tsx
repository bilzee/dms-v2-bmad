'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Package, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Filter,
  Search,
  Plus
} from 'lucide-react';
import { useDonorCoordination } from '@/hooks/useDonorCoordination';
import { DonorList } from '@/components/features/donors/DonorList';
import { ResourceAvailabilityGrid } from '@/components/features/donors/ResourceAvailabilityGrid';
import { CoordinationWorkspace } from '@/components/features/donors/CoordinationWorkspace';
import { DonorPerformanceChart } from '@/components/features/donors/DonorPerformanceChart';

export default function DonorCoordinationPage() {
  const {
    donors,
    resourceAvailability,
    coordinationWorkspace,
    stats,
    loading,
    error,
    refreshData,
    updateDonor,
    createAllocation,
    resolveConflict,
  } = useDonorCoordination();

  const [activeTab, setActiveTab] = useState('overview');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Auto-refresh every 25 seconds (following existing dashboard pattern)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
      setLastRefresh(new Date());
    }, 25000);

    return () => clearInterval(interval);
  }, [refreshData]);

  // Initial data load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  if (loading && !donors.length) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading donor coordination data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-medium text-red-900">Error Loading Data</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
            <Button 
              onClick={refreshData} 
              variant="outline" 
              className="mt-4 border-red-300 text-red-700 hover:bg-red-100"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const criticalShortfalls = resourceAvailability?.summary?.criticalShortfalls || [];
  const upcomingDeadlines = resourceAvailability?.summary?.upcomingDeadlines || [];
  const activeWorkspaceItems = coordinationWorkspace?.filter(item => 
    item.status === 'PENDING' || item.status === 'IN_PROGRESS'
  ) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Donor Coordination</h1>
          <p className="text-gray-600 mt-1">
            Manage donor relationships and coordinate resource allocation
          </p>
          <p className="text-sm text-gray-500 mt-1" suppressHydrationWarning={true}>
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={refreshData} disabled={loading}>
            <Clock className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Donor
          </Button>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Donors</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDonors || 0}</div>
            <p className="text-xs text-gray-600">
              {stats?.activeDonors || 0} active with commitments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Commitments</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingCommitments || 0}</div>
            <p className="text-xs text-gray-600">
              Total: {stats?.totalCommitments || 0} commitments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Shortfalls</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalShortfalls.length}</div>
            <p className="text-xs text-gray-600">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeWorkspaceItems.length}</div>
            <p className="text-xs text-gray-600">
              {upcomingDeadlines.length} urgent deadlines
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {(criticalShortfalls.length > 0 || upcomingDeadlines.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {criticalShortfalls.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Critical Resource Shortfalls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {criticalShortfalls.slice(0, 3).map((shortfall, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-red-900">
                          {shortfall.responseType.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-red-700">
                          {shortfall.shortfall} {shortfall.unit} needed ({shortfall.percentage}% short)
                        </p>
                      </div>
                      <Badge variant="destructive">{shortfall.percentage}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {upcomingDeadlines.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-700 flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingDeadlines.slice(0, 3).map((deadline, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div>
                        <p className="font-medium text-orange-900">
                          {deadline.affectedEntityName}
                        </p>
                        <p className="text-sm text-orange-700">
                          {deadline.quantity} {deadline.unit} {deadline.responseType.toLowerCase()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={deadline.daysUntilDeadline <= 1 ? 'destructive' : 'secondary'}
                          className={deadline.daysUntilDeadline <= 1 ? '' : 'bg-orange-100 text-orange-800'}
                        >
                          {deadline.daysUntilDeadline === 0 ? 'Today' : `${deadline.daysUntilDeadline}d`}
                        </Badge>
                        <p className="text-xs text-orange-600 mt-1">{deadline.priority}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="donors">Donors</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="workspace">Coordination</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DonorPerformanceChart donors={donors} />
            <Card>
              <CardHeader>
                <CardTitle>Resource Distribution</CardTitle>
                <CardDescription>
                  Breakdown of committed resources by type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.byResourceType && Object.entries(stats.byResourceType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {type.replace('_', ' ')}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="bg-gray-200 rounded-full h-2 w-20">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ 
                              width: `${Math.min(100, (count / Math.max(...Object.values(stats.byResourceType))) * 100)}%` 
                            }}
                            suppressHydrationWarning={true}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="donors">
          <DonorList 
            donors={donors}
            onUpdateDonor={updateDonor}
            onRefresh={refreshData}
          />
        </TabsContent>

        <TabsContent value="resources">
          <ResourceAvailabilityGrid 
            resourceAvailability={resourceAvailability}
            onCreateAllocation={createAllocation}
            onRefresh={refreshData}
          />
        </TabsContent>

        <TabsContent value="workspace">
          <CoordinationWorkspace 
            workspaceItems={coordinationWorkspace}
            onResolveConflict={resolveConflict}
            onRefresh={refreshData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}