'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  Building, 
  TrendingUp,
  Package,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Donor, ResponseType } from '@dms/shared';

interface DonorListProps {
  donors: Donor[];
  onUpdateDonor: (donorId: string, updates: Partial<Donor>) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function DonorList({ donors, onUpdateDonor, onRefresh }: DonorListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<ResponseType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'organization' | 'performanceScore' | 'updatedAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter and sort donors
  const filteredAndSortedDonors = donors
    .filter(donor => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          donor.name.toLowerCase().includes(term) ||
          donor.organization.toLowerCase().includes(term) ||
          donor.email.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter === 'active') {
        const hasActiveCommitments = donor.commitments.some(c => c.status === 'PLANNED' || c.status === 'IN_PROGRESS');
        if (!hasActiveCommitments) return false;
      } else if (statusFilter === 'inactive') {
        const hasActiveCommitments = donor.commitments.some(c => c.status === 'PLANNED' || c.status === 'IN_PROGRESS');
        if (hasActiveCommitments) return false;
      }

      // Organization filter
      if (orgFilter !== 'all') {
        if (!donor.organization.toLowerCase().includes(orgFilter.toLowerCase())) return false;
      }

      // Resource type filter
      if (resourceTypeFilter !== 'all') {
        const hasResourceType = donor.commitments.some(c => c.responseType === resourceTypeFilter);
        if (!hasResourceType) return false;
      }

      return true;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'organization':
          aValue = a.organization;
          bValue = b.organization;
          break;
        case 'performanceScore':
          aValue = a.performanceScore;
          bValue = b.performanceScore;
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const getPerformanceScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 75) return 'bg-blue-100 text-blue-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getCommitmentStatusSummary = (donor: Donor) => {
    const planned = donor.commitments.filter(c => c.status === 'PLANNED').length;
    const inProgress = donor.commitments.filter(c => c.status === 'IN_PROGRESS').length;
    const delivered = donor.commitments.filter(c => c.status === 'DELIVERED').length;
    const total = donor.commitments.length;

    return { planned, inProgress, delivered, total };
  };

  const uniqueOrganizations = Array.from(new Set(donors.map(d => d.organization))).sort();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <CardTitle>Donor Directory</CardTitle>
            <CardDescription>
              Manage donor relationships and track performance
            </CardDescription>
          </div>
          <Button onClick={onRefresh} variant="outline">
            <TrendingUp className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search donors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Organization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {uniqueOrganizations.map(org => (
                <SelectItem key={org} value={org}>{org}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={resourceTypeFilter as string} onValueChange={(value: ResponseType | 'all') => setResourceTypeFilter(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Resource Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              {Object.values(ResponseType).map(type => (
                <SelectItem key={type} value={type}>
                  {type.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: 'name' | 'organization' | 'performanceScore' | 'updatedAt') => setSortBy(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="organization">Organization</SelectItem>
              <SelectItem value="performanceScore">Performance</SelectItem>
              <SelectItem value="updatedAt">Last Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredAndSortedDonors.length} of {donors.length} donors
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? '↑' : '↓'} {sortBy.replace(/([A-Z])/g, ' $1').toLowerCase()}
          </Button>
        </div>

        {/* Donor Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donor Information</TableHead>
                <TableHead>Performance Score</TableHead>
                <TableHead>Commitments</TableHead>
                <TableHead>Resource Types</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedDonors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <Package className="h-8 w-8 text-gray-400" />
                      <p className="text-gray-500">No donors found matching your criteria</p>
                      <Button variant="outline" size="sm" onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setOrgFilter('all');
                        setResourceTypeFilter('all');
                      }}>
                        Clear Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedDonors.map((donor) => {
                  const commitmentSummary = getCommitmentStatusSummary(donor);
                  const isActive = commitmentSummary.planned > 0 || commitmentSummary.inProgress > 0;
                  const resourceTypes = Array.from(new Set(donor.commitments.map(c => c.responseType)));

                  return (
                    <TableRow key={donor.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{donor.name}</p>
                            {isActive && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Building className="h-3 w-3" />
                            <span>{donor.organization}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span>{donor.email}</span>
                            </div>
                            {donor.phone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="h-3 w-3" />
                                <span>{donor.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge className={getPerformanceScoreColor(donor.performanceScore)}>
                          {donor.performanceScore}%
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            Total: {commitmentSummary.total}
                          </div>
                          <div className="flex space-x-2 text-xs">
                            {commitmentSummary.planned > 0 && (
                              <span className="text-blue-600">
                                {commitmentSummary.planned} planned
                              </span>
                            )}
                            {commitmentSummary.inProgress > 0 && (
                              <span className="text-orange-600">
                                {commitmentSummary.inProgress} in progress
                              </span>
                            )}
                            {commitmentSummary.delivered > 0 && (
                              <span className="text-green-600">
                                {commitmentSummary.delivered} delivered
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {resourceTypes.map(type => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(donor.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                          <Button variant="outline" size="sm">
                            Contact
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}