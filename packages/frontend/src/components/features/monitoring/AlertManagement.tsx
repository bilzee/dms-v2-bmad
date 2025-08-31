'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Bell, Settings, Plus, Trash2, CheckCircle, Clock } from 'lucide-react';

interface ActiveAlert {
  id: string;
  type: 'PERFORMANCE' | 'ERROR_RATE' | 'QUEUE_BACKLOG' | 'SYNC_FAILURE' | 'USER_ACTIVITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  threshold: number;
  currentValue: number;
  isActive: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface AlertConfiguration {
  id: string;
  type: 'PERFORMANCE' | 'ERROR_RATE' | 'QUEUE_BACKLOG' | 'SYNC_FAILURE' | 'USER_ACTIVITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  threshold: number;
  enabled: boolean;
  notificationChannels: ('EMAIL' | 'SMS' | 'PUSH')[];
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AlertManagementProps {
  refreshInterval?: number;
  showConfigurationPanel?: boolean;
}

export function AlertManagement({
  refreshInterval = 25000,
  showConfigurationPanel = false
}: AlertManagementProps) {
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [alertConfigs, setAlertConfigs] = useState<AlertConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showNewAlertForm, setShowNewAlertForm] = useState(false);
  
  // New alert form state
  const [newAlert, setNewAlert] = useState({
    type: 'PERFORMANCE' as const,
    severity: 'MEDIUM' as const,
    threshold: 70,
    title: '',
    description: '',
    enabled: true,
    notificationChannels: ['EMAIL' as const]
  });

  const fetchActiveAlerts = async () => {
    try {
      const response = await fetch('/api/v1/system/alerts/active');
      const data = await response.json();
      
      if (data.success) {
        setActiveAlerts(data.data.alerts.map((alert: any) => ({
          ...alert,
          createdAt: new Date(alert.createdAt),
          updatedAt: new Date(alert.updatedAt),
          acknowledgedAt: alert.acknowledgedAt ? new Date(alert.acknowledgedAt) : undefined,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch active alerts:', error);
    }
  };

  const fetchAlertConfigs = async () => {
    try {
      const response = await fetch('/api/v1/system/alerts/configure');
      const data = await response.json();
      
      if (data.success) {
        setAlertConfigs(data.data.alerts.map((config: any) => ({
          ...config,
          createdAt: new Date(config.createdAt),
          updatedAt: new Date(config.updatedAt),
        })));
      }
    } catch (error) {
      console.error('Failed to fetch alert configurations:', error);
    }
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([fetchActiveAlerts(), fetchAlertConfigs()]);
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAllData();
    
    const interval = setInterval(fetchActiveAlerts, refreshInterval); // Only refresh active alerts frequently
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/v1/system/alerts/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId })
      });
      
      if (response.ok) {
        await fetchActiveAlerts();
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const createAlertConfiguration = async () => {
    try {
      const response = await fetch('/api/v1/system/alerts/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAlert)
      });
      
      if (response.ok) {
        setShowNewAlertForm(false);
        setNewAlert({
          type: 'PERFORMANCE',
          severity: 'MEDIUM',
          threshold: 70,
          title: '',
          description: '',
          enabled: true,
          notificationChannels: ['EMAIL']
        });
        await fetchAlertConfigs();
      }
    } catch (error) {
      console.error('Failed to create alert configuration:', error);
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600';
      case 'HIGH': return 'text-orange-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'PERFORMANCE': return 'Performance';
      case 'ERROR_RATE': return 'Error Rate';
      case 'QUEUE_BACKLOG': return 'Queue Backlog';
      case 'SYNC_FAILURE': return 'Sync Failure';
      case 'USER_ACTIVITY': return 'User Activity';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alert Management
          </CardTitle>
          <CardDescription>Loading alert data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Active Alerts</CardTitle>
            </div>
            <Badge variant={activeAlerts.length > 0 ? 'destructive' : 'default'}>
              {activeAlerts.length} Active
            </Badge>
          </div>
          <CardDescription>
            Current system alerts requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-lg font-medium">No active alerts</p>
              <p className="text-sm text-muted-foreground">All systems are running normally</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map((alert) => (
                <div key={alert.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className={`h-4 w-4 ${getSeverityColor(alert.severity)}`} />
                        <h4 className="font-medium">{alert.title}</h4>
                        <Badge variant={getSeverityBadgeVariant(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getAlertTypeLabel(alert.type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Threshold: {alert.threshold}</span>
                        <span>Current: {alert.currentValue.toFixed(2)}</span>
                        <span>Created: {formatRelativeTime(alert.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {alert.acknowledgedBy ? (
                        <div className="text-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">Acknowledged</p>
                          <p className="text-xs text-muted-foreground">by {alert.acknowledgedBy}</p>
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => acknowledgeAlert(alert.id)}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Configuration */}
      {showConfigurationPanel && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <CardTitle>Alert Configuration</CardTitle>
              </div>
              <Button onClick={() => setShowNewAlertForm(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Alert
              </Button>
            </div>
            <CardDescription>
              Configure alert rules and notification settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* New Alert Form */}
            {showNewAlertForm && (
              <div className="border rounded-lg p-4 mb-4 bg-muted/50">
                <h4 className="font-medium mb-4">Create New Alert</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="alert-type">Alert Type</Label>
                    <Select value={newAlert.type} onValueChange={(value: any) => setNewAlert({...newAlert, type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERFORMANCE">Performance</SelectItem>
                        <SelectItem value="ERROR_RATE">Error Rate</SelectItem>
                        <SelectItem value="QUEUE_BACKLOG">Queue Backlog</SelectItem>
                        <SelectItem value="SYNC_FAILURE">Sync Failure</SelectItem>
                        <SelectItem value="USER_ACTIVITY">User Activity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="alert-severity">Severity</Label>
                    <Select value={newAlert.severity} onValueChange={(value: any) => setNewAlert({...newAlert, severity: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="alert-title">Alert Title</Label>
                    <Input
                      id="alert-title"
                      value={newAlert.title}
                      onChange={(e) => setNewAlert({...newAlert, title: e.target.value})}
                      placeholder="Enter alert title"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="alert-threshold">Threshold</Label>
                    <Input
                      id="alert-threshold"
                      type="number"
                      value={newAlert.threshold}
                      onChange={(e) => setNewAlert({...newAlert, threshold: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <Label htmlFor="alert-description">Description</Label>
                  <Input
                    id="alert-description"
                    value={newAlert.description}
                    onChange={(e) => setNewAlert({...newAlert, description: e.target.value})}
                    placeholder="Enter alert description"
                  />
                </div>
                
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="alert-enabled"
                    checked={newAlert.enabled}
                    onCheckedChange={(checked) => setNewAlert({...newAlert, enabled: checked as boolean})}
                  />
                  <Label htmlFor="alert-enabled">Enable this alert</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button onClick={createAlertConfiguration}>
                    <Plus className="h-4 w-4 mr-1" />
                    Create Alert
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewAlertForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Existing Alert Configurations */}
            <div className="space-y-3">
              {alertConfigs.length === 0 ? (
                <div className="text-center py-6">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No alert configurations found</p>
                  <p className="text-xs text-muted-foreground">Create your first alert configuration above</p>
                </div>
              ) : (
                alertConfigs.map((config) => (
                  <div key={config.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{config.title}</span>
                        <Badge variant={getSeverityBadgeVariant(config.severity)}>
                          {config.severity}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getAlertTypeLabel(config.type)}
                        </Badge>
                        {!config.enabled && (
                          <Badge variant="outline" className="text-xs">Disabled</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span>Threshold: {config.threshold}</span>
                        <span>Channels: {config.notificationChannels.join(', ')}</span>
                        <span>Created: {formatRelativeTime(config.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground text-center">
        Last updated: {lastUpdated.toLocaleTimeString()} • Auto-refresh every {refreshInterval / 1000} seconds
      </div>
    </div>
  );
}