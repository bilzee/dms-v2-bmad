'use client';

import React, { useEffect } from 'react';
import { useDonorStore } from '@/stores/donor.store';
import { ConnectionStatusHeader } from '@/components/shared/ConnectionStatusHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DonationCommitmentForm } from '@/components/features/donor/DonationCommitmentForm';
import { CommitmentList } from '@/components/features/donor/CommitmentList';
import { DonorProfile } from '@/components/features/donor/DonorProfile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Heart, Package, Calendar } from 'lucide-react';

export default function DonorDashboard() {
  const {
    currentDonor,
    commitments,
    loading,
    error,
    loadDonorProfile,
    loadCommitments,
  } = useDonorStore();

  useEffect(() => {
    loadDonorProfile();
    loadCommitments();
  }, [loadDonorProfile, loadCommitments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadDonorProfile();
              loadCommitments();
            }}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const activeCommitments = commitments.filter(c => c.status === 'PLANNED' || c.status === 'IN_PROGRESS');
  const completedCommitments = commitments.filter(c => c.status === 'DELIVERED');

  return (
    <div className="p-6 space-y-6">
      <ConnectionStatusHeader />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Donor Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {currentDonor?.name || 'Donor'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            Score: {currentDonor?.performanceScore || 0}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Commitments</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCommitments.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeCommitments.filter(c => c.status === 'PLANNED').length} planned, {' '}
              {activeCommitments.filter(c => c.status === 'IN_PROGRESS').length} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Delivered</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCommitments.length}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime deliveries completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentDonor?.performanceScore || 0}</div>
            <p className="text-xs text-muted-foreground">
              Based on delivery history
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="commitments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="commitments">My Commitments</TabsTrigger>
          <TabsTrigger value="new-commitment">New Commitment</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>
        
        <TabsContent value="commitments" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">My Commitments</h2>
            <Button
              onClick={() => {
                const tabs = document.querySelector('[value="new-commitment"]') as HTMLElement;
                tabs?.click();
              }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Commitment
            </Button>
          </div>
          <CommitmentList commitments={commitments} />
        </TabsContent>
        
        <TabsContent value="new-commitment" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">New Donation Commitment</h2>
            <DonationCommitmentForm
              onSuccess={() => {
                loadCommitments();
                const tabs = document.querySelector('[value="commitments"]') as HTMLElement;
                tabs?.click();
              }}
              onCancel={() => {
                const tabs = document.querySelector('[value="commitments"]') as HTMLElement;
                tabs?.click();
              }}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="profile" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Donor Profile</h2>
            <DonorProfile donor={currentDonor} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}