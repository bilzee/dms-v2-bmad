'use client';

import React, { useState } from 'react';
import { DonorCommitment, ResponseType } from '@dms/shared';
import { useDonorStore } from '@/stores/donor.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Calendar, 
  Package, 
  Edit3, 
  X, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Filter,
  Search 
} from 'lucide-react';

interface CommitmentListProps {
  commitments: DonorCommitment[];
  className?: string;
}

const STATUS_CONFIG = {
  PLANNED: { label: 'Planned', color: 'bg-blue-100 text-blue-800', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: Package },
  DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: X },
};

const RESPONSE_TYPE_CONFIG = {
  [ResponseType.HEALTH]: { label: 'Health', icon: '🏥' },
  [ResponseType.WASH]: { label: 'WASH', icon: '💧' },
  [ResponseType.SHELTER]: { label: 'Shelter', icon: '🏠' },
  [ResponseType.FOOD]: { label: 'Food', icon: '🍚' },
  [ResponseType.SECURITY]: { label: 'Security', icon: '🛡️' },
  [ResponseType.POPULATION]: { label: 'Population', icon: '👥' },
};

export function CommitmentList({ commitments, className }: CommitmentListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [editingCommitment, setEditingCommitment] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<DonorCommitment>>({});

  const { updateCommitment, cancelCommitment, isUpdating, error } = useDonorStore();

  // Filter commitments
  const filteredCommitments = commitments.filter(commitment => {
    const matchesSearch = !searchTerm || 
      commitment.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commitment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commitment.responseType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || commitment.status === statusFilter;
    const matchesType = typeFilter === 'all' || commitment.responseType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Sort by target date (most urgent first)
  const sortedCommitments = [...filteredCommitments].sort((a, b) => 
    new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
  );

  // Handle edit start
  const handleEditStart = (commitment: DonorCommitment) => {
    setEditingCommitment(commitment.id);
    setEditForm({
      quantity: commitment.quantity,
      unit: commitment.unit,
      targetDate: commitment.targetDate,
      notes: commitment.notes,
    });
  };

  // Handle edit save
  const handleEditSave = async (commitmentId: string) => {
    try {
      await updateCommitment(commitmentId, editForm);
      setEditingCommitment(null);
      setEditForm({});
    } catch (error) {
      console.error('Failed to update commitment:', error);
    }
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setEditingCommitment(null);
    setEditForm({});
  };

  // Handle commitment cancellation
  const handleCancel = async (commitmentId: string) => {
    const reason = prompt('Please provide a reason for cancelling this commitment:');
    if (reason === null) return; // User cancelled the prompt
    
    try {
      await cancelCommitment(commitmentId, reason || 'No reason provided');
    } catch (error) {
      console.error('Failed to cancel commitment:', error);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
    if (!config) return null;
    
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // Calculate days until target
  const getDaysUntilTarget = (targetDate: Date) => {
    const now = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Commitments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search commitments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {Object.entries(RESPONSE_TYPE_CONFIG).map(([type, config]) => (
                <option key={type} value={type}>
                  {config.icon} {config.label}
                </option>
              ))}
            </select>
            
            <div className="text-sm text-gray-600 flex items-center">
              Showing {filteredCommitments.length} of {commitments.length} commitments
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commitments List */}
      {sortedCommitments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No commitments found</h3>
            <p className="text-gray-600 mb-4">
              {commitments.length === 0 
                ? "You haven't made any commitments yet." 
                : "No commitments match your current filters."
              }
            </p>
            {commitments.length === 0 && (
              <Button
                onClick={() => {
                  const tabs = document.querySelector('[value="new-commitment"]') as HTMLElement;
                  tabs?.click();
                }}
              >
                Create Your First Commitment
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedCommitments.map((commitment) => {
            const isEditing = editingCommitment === commitment.id;
            const daysUntilTarget = getDaysUntilTarget(commitment.targetDate);
            const isUrgent = daysUntilTarget <= 3 && commitment.status === 'PLANNED';
            const typeConfig = RESPONSE_TYPE_CONFIG[commitment.responseType];

            return (
              <Card key={commitment.id} className={isUrgent ? 'border-orange-200 bg-orange-50' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{typeConfig.icon}</span>
                      <div>
                        <CardTitle className="text-lg">
                          {typeConfig.label} Commitment
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          Created {new Date(commitment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(commitment.status)}
                      {isUrgent && (
                        <Badge className="bg-orange-100 text-orange-800">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Urgent
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {isEditing ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Quantity</label>
                          <Input
                            type="number"
                            min="1"
                            max="999999"
                            value={editForm.quantity || ''}
                            onChange={(e) => setEditForm(prev => ({ 
                              ...prev, 
                              quantity: parseInt(e.target.value) || 0 
                            }))}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Unit</label>
                          <Input
                            value={editForm.unit || ''}
                            onChange={(e) => setEditForm(prev => ({ 
                              ...prev, 
                              unit: e.target.value 
                            }))}
                            maxLength={50}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Target Date</label>
                        <Input
                          type="date"
                          value={editForm.targetDate ? new Date(editForm.targetDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => setEditForm(prev => ({ 
                            ...prev, 
                            targetDate: new Date(e.target.value)
                          }))}
                          min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Notes</label>
                        <textarea
                          value={editForm.notes || ''}
                          onChange={(e) => setEditForm(prev => ({ 
                            ...prev, 
                            notes: e.target.value 
                          }))}
                          rows={3}
                          maxLength={500}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditSave(commitment.id)}
                          disabled={isUpdating}
                        >
                          {isUpdating ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleEditCancel}
                          disabled={isUpdating}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-600" />
                          <span className="text-lg font-semibold">
                            {commitment.quantity.toLocaleString()} {commitment.unit}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-600" />
                          <span>
                            {new Date(commitment.targetDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          {commitment.status === 'PLANNED' && (
                            <span className={`text-sm ${isUrgent ? 'text-orange-600' : 'text-gray-500'}`}>
                              ({daysUntilTarget > 0 ? `${daysUntilTarget} days` : 'Overdue'})
                            </span>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          {commitment.incidentId && `Incident: ${commitment.incidentId}`}
                          {commitment.affectedEntityId && ` • Entity: ${commitment.affectedEntityId}`}
                        </div>
                      </div>

                      {commitment.notes && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">{commitment.notes}</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {(commitment.status === 'PLANNED' || commitment.status === 'IN_PROGRESS') && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditStart(commitment)}
                            className="flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            Edit
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancel(commitment.id)}
                            className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </Button>
                        </div>
                      )}

                      {/* Timeline info for overdue items */}
                      {commitment.status === 'PLANNED' && daysUntilTarget < 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 text-red-800">
                            <AlertCircle className="w-4 h-4" />
                            <span className="font-medium">Overdue by {Math.abs(daysUntilTarget)} days</span>
                          </div>
                          <p className="text-sm text-red-600 mt-1">
                            This commitment was due on {new Date(commitment.targetDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      {commitments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Commitment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                const count = commitments.filter(c => c.status === status).length;
                const Icon = config.icon;
                
                return (
                  <div key={status} className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-xs text-gray-600">{config.label}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}