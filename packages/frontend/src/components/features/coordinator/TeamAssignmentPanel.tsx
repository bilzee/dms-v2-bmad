'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Users, UserCheck, UserX, Clock, MapPin, AlertCircle, Plus } from 'lucide-react';

interface Assignment {
  id: string;
  type: 'assessment' | 'response';
  title: string;
  entityName?: string;
  entityId?: string;
  scheduledDate: Date;
  status: string;
}

interface TeamMember {
  userId: string;
  name: string;
  email: string;
  organization?: string;
  activeRole?: string;
  roles: string[];
  availabilityStatus: 'available' | 'assigned' | 'unavailable';
  totalAssignments: number;
  activeAssignments: number;
  lastSync?: Date;
  assignments: Assignment[];
}

interface TeamAssignmentPanelProps {
  incidentId?: string;
  className?: string;
}

export function TeamAssignmentPanel({ incidentId, className }: TeamAssignmentPanelProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');

  useEffect(() => {
    fetchTeamAssignments();
  }, [incidentId]);

  const fetchTeamAssignments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (incidentId) params.append('incidentId', incidentId);
      
      const response = await fetch(`/api/v1/coordinator/assignments?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setTeamMembers(data.data.teamAssignments);
      } else {
        setError(data.errors?.[0] || 'Failed to fetch team data');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = selectedAvailability === 'all' 
    ? teamMembers 
    : teamMembers.filter(m => m.availabilityStatus === selectedAvailability);

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'assigned': return 'bg-blue-500';
      case 'unavailable': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAvailabilityBadge = (status: string) => {
    switch (status) {
      case 'available': return { variant: 'default' as const, label: 'Available' };
      case 'assigned': return { variant: 'secondary' as const, label: 'Assigned' };
      case 'unavailable': return { variant: 'destructive' as const, label: 'Unavailable' };
      default: return { variant: 'outline' as const, label: 'Unknown' };
    }
  };

  const getWorkloadPercentage = (member: TeamMember) => {
    const maxLoad = 10; // Arbitrary max assignments
    return Math.min((member.totalAssignments / maxLoad) * 100, 100);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) return <div className="p-4">Loading team assignment data...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  const summary = {
    total: teamMembers.length,
    available: teamMembers.filter(m => m.availabilityStatus === 'available').length,
    assigned: teamMembers.filter(m => m.availabilityStatus === 'assigned').length,
    unavailable: teamMembers.filter(m => m.availabilityStatus === 'unavailable').length
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Team Assignments</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchTeamAssignments}>
                Refresh
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Assignment
              </Button>
            </div>
          </div>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-sm text-muted-foreground">Total Members</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{summary.available}</div>
                <div className="text-sm text-muted-foreground">Available</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.assigned}</div>
                <div className="text-sm text-muted-foreground">Assigned</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{summary.unavailable}</div>
                <div className="text-sm text-muted-foreground">Unavailable</div>
              </CardContent>
            </Card>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={selectedAvailability} onValueChange={setSelectedAvailability}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({summary.total})</TabsTrigger>
              <TabsTrigger value="available">Available ({summary.available})</TabsTrigger>
              <TabsTrigger value="assigned">Assigned ({summary.assigned})</TabsTrigger>
              <TabsTrigger value="unavailable">Unavailable ({summary.unavailable})</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedAvailability} className="space-y-4">
              {filteredMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No team members found with {selectedAvailability === 'all' ? 'any' : selectedAvailability} status
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMembers.map((member) => {
                    const workloadPercentage = getWorkloadPercentage(member);
                    const availabilityBadge = getAvailabilityBadge(member.availabilityStatus);
                    
                    return (
                      <Card key={member.userId} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`} />
                              <AvatarFallback>{getInitials(member.name || 'UN')}</AvatarFallback>
                            </Avatar>
                            
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{member.name}</h3>
                                <div className={`w-2 h-2 rounded-full ${getAvailabilityColor(member.availabilityStatus)}`}></div>
                                <Badge variant={availabilityBadge.variant}>
                                  {availabilityBadge.label}
                                </Badge>
                              </div>
                              
                              <div className="text-sm text-muted-foreground">
                                {member.email} • {member.organization || 'No organization'}
                              </div>
                              
                              <div className="flex items-center gap-4 mt-1">
                                <div className="text-sm">
                                  <span className="font-medium">Role:</span> {member.activeRole || 'Unassigned'}
                                </div>
                                {member.lastSync && (
                                  <div className="text-sm text-muted-foreground">
                                    Last sync: {new Date(member.lastSync).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm">
                              <div className="font-semibold">{member.totalAssignments} assignments</div>
                              <div className="text-muted-foreground">{member.activeAssignments} active</div>
                            </div>
                            
                            <div className="mt-2 w-24">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span>Workload</span>
                                <span>{Math.round(workloadPercentage)}%</span>
                              </div>
                              <Progress value={workloadPercentage} className="h-1" />
                            </div>
                          </div>
                        </div>
                        
                        {/* Current Assignments */}
                        {member.assignments.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Current Assignments ({member.assignments.length})
                            </h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {member.assignments.slice(0, 4).map((assignment) => (
                                <div key={assignment.id} className="p-2 bg-muted rounded text-sm">
                                  <div className="flex items-center justify-between">
                                    <div className="font-medium">{assignment.title}</div>
                                    <Badge variant="outline" className="text-xs">
                                      {assignment.type}
                                    </Badge>
                                  </div>
                                  
                                  {assignment.entityName && (
                                    <div className="text-muted-foreground flex items-center gap-1 mt-1">
                                      <MapPin className="h-3 w-3" />
                                      {assignment.entityName}
                                    </div>
                                  )}
                                  
                                  <div className="text-muted-foreground mt-1">
                                    {new Date(assignment.scheduledDate).toLocaleDateString()} • {assignment.status}
                                  </div>
                                </div>
                              ))}
                              
                              {member.assignments.length > 4 && (
                                <div className="p-2 bg-muted rounded text-sm text-center text-muted-foreground">
                                  +{member.assignments.length - 4} more assignments
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Warning for overloaded members */}
                        {workloadPercentage > 80 && (
                          <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded flex items-center gap-2 text-orange-800">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">High workload - consider reassigning tasks</span>
                          </div>
                        )}
                        
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                          <Button size="sm">
                            Assign Task
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}