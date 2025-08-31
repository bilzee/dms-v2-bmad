'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Clock, Activity, Filter, Eye, EyeOff } from 'lucide-react';

interface UserActivity {
  userId: string;
  userName: string;
  role: 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN';
  sessionStart: Date;
  lastActivity: Date;
  actionsCount: number;
  currentPage: string;
  isActive: boolean;
}

interface UserStats {
  totalActiveUsers: number;
  totalSessions: number;
  averageSessionDuration: number;
  totalActions: number;
  roleBreakdown: Record<string, number>;
  topPages: Array<{
    page: string;
    users: number;
    percentage: number;
  }>;
}

interface UserActivityMonitorProps {
  refreshInterval?: number;
  maxDisplayUsers?: number;
  showInactiveUsers?: boolean;
}

export function UserActivityMonitor({
  refreshInterval = 25000,
  maxDisplayUsers = 10,
  showInactiveUsers = false
}: UserActivityMonitorProps) {
  const [users, setUsers] = useState<UserActivity[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(showInactiveUsers);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchUserActivity = async () => {
    try {
      const params = new URLSearchParams({
        includeInactive: showInactive.toString(),
        timeRange: '24h'
      });
      
      if (roleFilter !== 'all') {
        params.set('role', roleFilter);
      }

      const response = await fetch(`/api/v1/system/performance/users?${params}`);
      const data = await response.json();
      
      if (data.success) {
        const usersData = data.data.users.map((user: any) => ({
          ...user,
          sessionStart: new Date(user.sessionStart),
          lastActivity: new Date(user.lastActivity),
        }));
        setUsers(usersData);
        setStats(data.data.stats);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch user activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserActivity();
    
    const interval = setInterval(fetchUserActivity, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, roleFilter, showInactive]);

  const formatSessionDuration = (sessionStart: Date) => {
    const duration = Date.now() - sessionStart.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatLastActivity = (lastActivity: Date) => {
    const timeDiff = Date.now() - lastActivity.getTime();
    const minutes = Math.floor(timeDiff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'destructive';
      case 'COORDINATOR': return 'default';
      case 'RESPONDER': return 'secondary';
      case 'ASSESSOR': return 'outline';
      case 'DONOR': return 'secondary';
      default: return 'outline';
    }
  };

  const getActivityStatus = (user: UserActivity) => {
    const timeSinceActivity = Date.now() - user.lastActivity.getTime();
    const minutesSinceActivity = timeSinceActivity / (1000 * 60);
    
    if (minutesSinceActivity < 5) return 'active';
    if (minutesSinceActivity < 15) return 'idle';
    return 'inactive';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'inactive': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const displayUsers = users.slice(0, maxDisplayUsers);
  const activeUsers = users.filter(u => u.isActive);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Activity Monitor
          </CardTitle>
          <CardDescription>Loading user activity data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* User Activity Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>User Activity Overview</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInactive(!showInactive)}
              >
                {showInactive ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                {showInactive ? 'Hide Inactive' : 'Show Inactive'}
              </Button>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="COORDINATOR">Coordinator</SelectItem>
                  <SelectItem value="RESPONDER">Responder</SelectItem>
                  <SelectItem value="ASSESSOR">Assessor</SelectItem>
                  <SelectItem value="DONOR">Donor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <CardDescription>
            Real-time user sessions and activity monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{activeUsers.length}</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{users.length}</div>
              <div className="text-sm text-muted-foreground">Total Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats?.averageSessionDuration.toFixed(1)}h</div>
              <div className="text-sm text-muted-foreground">Avg Session</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats?.totalActions}</div>
              <div className="text-sm text-muted-foreground">Total Actions</div>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-3">Role Breakdown</h4>
                <div className="space-y-2">
                  {Object.entries(stats.roleBreakdown).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between">
                      <Badge variant={getRoleBadgeVariant(role)} className="text-xs">
                        {role}
                      </Badge>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-3">Top Pages</h4>
                <div className="space-y-2">
                  {stats.topPages.slice(0, 3).map((page) => (
                    <div key={page.page} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-xs font-medium truncate">{page.page}</div>
                        <div className="text-xs text-muted-foreground">{page.percentage}% of users</div>
                      </div>
                      <Badge variant="outline" className="text-xs">{page.users}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active User Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Active User Sessions
          </CardTitle>
          <CardDescription>
            Currently active users and their session information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {displayUsers.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No user sessions found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {roleFilter !== 'all' ? `Try removing the ${roleFilter} filter` : 'Users will appear here when they become active'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayUsers.map((user) => {
                const activityStatus = getActivityStatus(user);
                return (
                  <div key={user.userId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {user.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(activityStatus)}`}></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{user.userName}</p>
                          <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                            {user.role}
                          </Badge>
                          {!user.isActive && (
                            <Badge variant="outline" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-xs text-muted-foreground truncate max-w-48">
                            Current page: {user.currentPage}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.actionsCount} actions
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Session: {formatSessionDuration(user.sessionStart)}</span>
                      </div>
                      <div className="mt-1">
                        Last: {formatLastActivity(user.lastActivity)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {users.length > maxDisplayUsers && (
            <div className="text-center mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Showing {maxDisplayUsers} of {users.length} users
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground text-center">
        Last updated: {lastUpdated.toLocaleTimeString()} • Auto-refresh every {refreshInterval / 1000} seconds
      </div>
    </div>
  );
}