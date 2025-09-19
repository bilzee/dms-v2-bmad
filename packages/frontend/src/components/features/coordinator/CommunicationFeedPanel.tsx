'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Bell, 
  Activity, 
  Settings, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  User,
  Filter,
  RefreshCw,
  Zap
} from 'lucide-react';

interface CommunicationMessage {
  id: string;
  type: 'notification' | 'audit' | 'activity' | 'system';
  title: string;
  message: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: Date;
  entityId: string;
  metadata: any;
  status: string;
  source: string;
  category: string;
  actions: string[];
}

interface CommunicationFeedPanelProps {
  incidentId?: string;
  className?: string;
}

export function CommunicationFeedPanel({ incidentId, className }: CommunicationFeedPanelProps) {
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchCommunications();
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchCommunications, 30000);
    return () => clearInterval(interval);
  }, [incidentId]);

  const fetchCommunications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (incidentId) params.append('incidentId', incidentId);
      if (selectedType !== 'all') params.append('type', selectedType);
      
      const response = await fetch(`/api/v1/coordinator/communications?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.data.communicationFeed);
        setUnreadCount(data.data.summary.unreadCount);
      } else {
        setError(data.errors?.[0] || 'Failed to fetch communication data');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'notification': return <Bell className="h-4 w-4" />;
      case 'audit': return <Settings className="h-4 w-4" />;
      case 'activity': return <Activity className="h-4 w-4" />;
      case 'system': return <Zap className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'requires_attention': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'PENDING': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'system': return 'bg-blue-100 text-blue-800';
      case 'coordinator': return 'bg-green-100 text-green-800';
      case 'team': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const filteredMessages = selectedType === 'all' 
    ? messages 
    : messages.filter(m => m.type === selectedType);

  if (loading) return <div className="p-4">Loading communication feed...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <CardTitle>Communication Feed</CardTitle>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm" onClick={fetchCommunications}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={selectedType} onValueChange={setSelectedType}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="notification">Notifications</TabsTrigger>
              <TabsTrigger value="audit">Audit</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedType}>
              <ScrollArea className="h-[500px] pr-4">
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No {selectedType === 'all' ? '' : selectedType + ' '}messages found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredMessages.map((message) => (
                      <Card key={message.id} className={`p-4 ${
                        message.status === 'requires_attention' ? 'border-orange-200 bg-orange-50' :
                        message.status === 'PENDING' ? 'border-blue-200 bg-blue-50' :
                        ''
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1">
                              {getTypeIcon(message.type)}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{message.title}</h4>
                                <Badge variant={getPriorityColor(message.priority) as any} className="text-xs">
                                  {message.priority}
                                </Badge>
                                <span className={`text-xs px-2 py-1 rounded ${getSourceColor(message.source)}`}>
                                  {message.source}
                                </span>
                              </div>
                              
                              <p className="text-sm text-muted-foreground mb-2">
                                {message.message}
                              </p>
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTimeAgo(message.timestamp)}
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {message.category}
                                </div>
                                
                                {message.entityId && message.entityId !== 'system' && (
                                  <div>Entity: {message.entityId.slice(0, 8)}...</div>
                                )}
                              </div>
                              
                              {/* Action buttons */}
                              {message.actions.length > 0 && (
                                <div className="flex items-center gap-2 mt-3">
                                  {message.actions.slice(0, 2).map((action) => (
                                    <Button key={action} variant="outline" size="sm" className="text-xs">
                                      {action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </Button>
                                  ))}
                                  {message.actions.length > 2 && (
                                    <span className="text-xs text-muted-foreground">
                                      +{message.actions.length - 2} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {getStatusIcon(message.status)}
                            <div className="text-xs text-muted-foreground text-right">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        
                        {/* Metadata display for important messages */}
                        {message.priority === 'HIGH' && message.metadata && Object.keys(message.metadata).length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-xs text-muted-foreground">
                              Additional details: {JSON.stringify(message.metadata, null, 2).slice(0, 100)}...
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
          
          {/* Summary footer */}
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-4 gap-4 text-center text-sm">
              <div>
                <div className="font-semibold">{filteredMessages.length}</div>
                <div className="text-muted-foreground">Total</div>
              </div>
              <div>
                <div className="font-semibold text-red-600">
                  {filteredMessages.filter(m => m.priority === 'HIGH').length}
                </div>
                <div className="text-muted-foreground">High Priority</div>
              </div>
              <div>
                <div className="font-semibold text-orange-600">
                  {filteredMessages.filter(m => m.status === 'requires_attention').length}
                </div>
                <div className="text-muted-foreground">Need Attention</div>
              </div>
              <div>
                <div className="font-semibold text-blue-600">
                  {filteredMessages.filter(m => 
                    new Date(m.timestamp).getTime() > Date.now() - 60 * 60 * 1000
                  ).length}
                </div>
                <div className="text-muted-foreground">Last Hour</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}