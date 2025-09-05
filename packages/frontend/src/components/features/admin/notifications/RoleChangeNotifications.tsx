'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  BellRing, 
  Clock, 
  User, 
  Shield, 
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Mail,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';

interface RoleChangeNotification {
  id: string;
  type: 'ROLE_ASSIGNED' | 'ROLE_REMOVED' | 'ROLE_ACTIVATED' | 'BULK_ASSIGNMENT';
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'SENT' | 'FAILED';
  targetRoles: string[];
  entityId: string;
  metadata: {
    adminId?: string;
    adminName?: string;
    roles?: Array<{ id: string; name: string }>;
    reason?: string;
    type: string;
    userCount?: number;
    roleCount?: number;
  };
  createdAt: Date;
  sentAt?: Date;
  updatedAt: Date;
}

interface RoleChangeNotificationsProps {
  userId?: string; // If specified, show notifications for specific user
  isAdmin?: boolean; // If true, show admin notifications
  limit?: number;
}

export function RoleChangeNotifications({ 
  userId, 
  isAdmin = false, 
  limit = 20 
}: RoleChangeNotificationsProps) {
  const [notifications, setNotifications] = useState<RoleChangeNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let url = '/api/v1/notifications/role-changes';
      const params = new URLSearchParams();
      
      if (userId) params.append('userId', userId);
      if (isAdmin) params.append('isAdmin', 'true');
      params.append('limit', limit.toString());

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      if (data.success) {
        setNotifications(data.data.notifications.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          sentAt: n.sentAt ? new Date(n.sentAt) : undefined,
          updatedAt: new Date(n.updatedAt)
        })));
      } else {
        setError(data.message || 'Failed to load notifications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId, isAdmin, limit]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/v1/notifications/${notificationId}/read`, {
        method: 'PUT'
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, status: 'SENT' as const }
              : n
          )
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Resend notification
  const resendNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/v1/notifications/${notificationId}/resend`, {
        method: 'POST'
      });

      if (response.ok) {
        await fetchNotifications(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to resend notification:', error);
    }
  };

  const getNotificationIcon = (type: string, status: string) => {
    if (status === 'FAILED') return XCircle;
    if (status === 'SENT') return CheckCircle2;
    
    switch (type) {
      case 'ROLE_ASSIGNED':
        return Shield;
      case 'ROLE_REMOVED':
        return XCircle;
      case 'ROLE_ACTIVATED':
        return User;
      case 'BULK_ASSIGNMENT':
        return Bell;
      default:
        return BellRing;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'MEDIUM':
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'LOW':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'text-green-600';
      case 'FAILED':
        return 'text-red-600';
      case 'PENDING':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Role Change Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Role Change Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
            <p>Failed to load notifications</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={fetchNotifications} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Role Change Notifications
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {notifications.length} total
            </Badge>
            <Button variant="outline" size="sm" onClick={fetchNotifications}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground px-6">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No notifications found</p>
            <p className="text-sm">Role change notifications will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-1">
              {notifications.map((notification, index) => {
                const NotificationIcon = getNotificationIcon(notification.type, notification.status);
                
                return (
                  <div key={notification.id}>
                    <div className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 p-2 rounded-full ${
                          notification.status === 'PENDING' ? 'bg-orange-100' :
                          notification.status === 'SENT' ? 'bg-green-100' :
                          'bg-red-100'
                        }`}>
                          <NotificationIcon className={`h-4 w-4 ${getStatusColor(notification.status)}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-sm font-medium truncate">
                              {notification.title}
                            </h4>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getPriorityColor(notification.priority)}`}
                              >
                                {notification.priority}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {notification.status}
                              </Badge>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(notification.createdAt, 'MMM d, HH:mm')}
                              </span>
                              {notification.metadata.adminName && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {notification.metadata.adminName}
                                </span>
                              )}
                              {notification.metadata.roles && (
                                <span className="flex items-center gap-1">
                                  <Shield className="h-3 w-3" />
                                  {notification.metadata.roles.map(r => r.name).join(', ')}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {notification.status === 'PENDING' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Mark Read
                                </Button>
                              )}
                              {notification.status === 'FAILED' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => resendNotification(notification.id)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Mail className="h-3 w-3 mr-1" />
                                  Resend
                                </Button>
                              )}
                            </div>
                          </div>

                          {notification.metadata.reason && (
                            <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                              <strong>Reason:</strong> {notification.metadata.reason}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {index < notifications.length - 1 && <Separator />}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}