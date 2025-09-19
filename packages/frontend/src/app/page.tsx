'use client'

import Link from 'next/link'
import React, { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  FileText, Heart, Droplet, Home, Utensils, Shield, Users,
  Wifi, AlertTriangle, Clock, XCircle, FileEdit, Zap, 
  CheckCircle, HelpCircle, Activity, MapPin, BarChart3,
  ClipboardList, Building, UserCheck, Archive, Award
} from "lucide-react"
import { useOffline } from '@/hooks/useOffline'
import { useOfflineStore } from '@/stores/offline.store'
import { useRoleContext } from '@/components/providers/RoleContextProvider'
import { useRoleNavigation } from '@/hooks/useRoleNavigation'
import { useSession } from 'next-auth/react'
import { useDashboardBadges } from '@/hooks/useDashboardBadges'
import { FeatureCard } from '@/components/dashboard/FeatureCard'
import { AssessmentTypeCard } from '@/components/dashboard/AssessmentTypeCard'
import { QuickStatsCard } from '@/components/dashboard/QuickStatsCard'
import { assessmentTypeColors, featureColors, statusColors } from '@/lib/constants/colors'
import { getRoleInterface } from '@/lib/role-interfaces'

export default function HomePage() {
  const { isOffline } = useOffline();
  const queue = useOfflineStore(state => state.queue);
  const { activeRole, hasPermission } = useRoleContext();
  const { hasAccessToSection } = useRoleNavigation();
  const { badges, loading: badgesLoading } = useDashboardBadges();
  const { data: session, status, update } = useSession();

  // Handle post-authentication session refresh
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('authSuccess') === 'true') {
      // Clean URL first
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Force session update instead of page reload
      if (status !== 'loading') {
        update().then(() => {
          console.log('Session updated after authentication');
        }).catch((error) => {
          console.error('Session update failed:', error);
        });
      }
    }
  }, [status, update]); // Remove session from dependencies to avoid infinite loops

  // Force session refresh if authenticated but showing unauthenticated content
  useEffect(() => {
    // If we have a session but incomplete user data
    if (session && status === 'authenticated' && !session?.user?.role) {
      console.log('Detected incomplete session, forcing refresh...');
      update().then(() => {
        console.log('Session refresh completed');
      }).catch((error) => {
        console.error('Failed to refresh session:', error);
      });
    }
  }, [session, status, update]);
  
  // Show loading state while session is being loaded
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Improved role resolution logic - check all possible sources including assigned roles
  const currentRole = activeRole?.name || 
                      session?.user?.activeRole?.name || 
                      session?.user?.role ||
                      (session?.user?.roles?.find((r: any) => r.isActive)?.name) ||
                      (session?.user?.roles?.some((r: any) => r.name === 'VERIFIER') ? 'VERIFIER' : 'ASSESSOR');
  
  // Use unified role interface system - ensures identical functionality regardless of authentication type
  const roleInterface = getRoleInterface(currentRole);
  const mainFeatures = roleInterface?.featureCards?.map(card => ({
    title: card.title,
    description: card.description,
    icon: React.createElement(card.icon, { className: "w-6 h-6" }),
    color: card.iconColor,
    bgColor: card.bgColor,
    actions: card.actions,
    stats: {
      count: (badges && card.stats.countKey) ? badges[card.stats.countKey as keyof typeof badges] ?? card.stats.count : card.stats.count,
      label: card.stats.label
    }
  })) || []

  const assessmentTypes = [
    { 
      id: 'HEALTH', 
      name: 'Health', 
      icon: <Heart className="w-8 h-8" />, 
      pending: badges?.healthAssessments ?? 3,
      ...assessmentTypeColors.HEALTH
    },
    { 
      id: 'WASH', 
      name: 'WASH', 
      icon: <Droplet className="w-8 h-8" />, 
      pending: badges?.washAssessments ?? 1,
      ...assessmentTypeColors.WASH
    },
    { 
      id: 'SHELTER', 
      name: 'Shelter', 
      icon: <Home className="w-8 h-8" />, 
      pending: badges?.shelterAssessments ?? 2,
      ...assessmentTypeColors.SHELTER
    },
    { 
      id: 'FOOD', 
      name: 'Food', 
      icon: <Utensils className="w-8 h-8" />, 
      pending: badges?.foodAssessments ?? 0,
      ...assessmentTypeColors.FOOD
    },
    { 
      id: 'SECURITY', 
      name: 'Security', 
      icon: <Shield className="w-8 h-8" />, 
      pending: badges?.securityAssessments ?? 1,
      ...assessmentTypeColors.SECURITY
    },
    { 
      id: 'POPULATION', 
      name: 'Population', 
      icon: <Users className="w-8 h-8" />, 
      pending: badges?.populationAssessments ?? 4,
      ...assessmentTypeColors.POPULATION
    }
  ]

  return (
    <>
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {session ? `Welcome back, ${session.user?.name || 'User'}` : 'Welcome to DMS v2'}
        </h2>
        <p className="text-gray-600">
          {session 
            ? `Here's your operational overview for ${currentRole} role` 
            : 'Disaster Management System - Sign in to access field operations'
          }
        </p>
        {!session && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>Note:</strong> Most features require authentication. Please sign in using the button in the top-right corner to access assessments, responses, and other tools.
            </p>
          </div>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <QuickStatsCard
          title="Active Assessments"
          value={badges?.activeAssessments ?? 12}
          icon={<ClipboardList className="w-6 h-6 text-blue-600" />}
          {...statusColors.online}
          trend={{ value: 15, label: 'from yesterday', isPositive: true }}
        />
        <QuickStatsCard
          title="Completed Today"
          value={badges?.approvedToday ?? 8}
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
          {...statusColors.online}
          trend={{ value: 25, label: 'above target', isPositive: true }}
        />
        <QuickStatsCard
          title="Pending Sync"
          value={queue.length}
          icon={<Clock className="w-6 h-6 text-orange-600" />}
          {...statusColors.offline}
        />
        <QuickStatsCard
          title="Critical Issues"
          value={badges?.activeAlerts ?? 1}
          icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
          {...statusColors.error}
        />
      </div>
      {/* Main Features Grid */}
      {session && (
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">
            Features for {currentRole}
          </h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {mainFeatures.map(feature => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
          {mainFeatures.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No features available for role: {currentRole}</p>
              <p className="text-sm mt-2">
                {!roleInterface 
                  ? 'Role configuration not found. Please contact your system administrator.'
                  : 'Feature configuration is being loaded. Please refresh if this message persists.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Assessment Types Grid */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {assessmentTypes.map(type => (
            <AssessmentTypeCard key={type.id} {...type} />
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {/* Emergency Report Card */}
          <Card className="border-red-500 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="w-5 h-5" />
                Emergency Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Immediate Action Required</AlertTitle>
                <AlertDescription>
                  Report new disaster situations immediately for incident creation
                </AlertDescription>
              </Alert>
              <Link href="/assessments/new?type=PRELIMINARY" className="w-full">
                <Button className="w-full bg-red-600 hover:bg-red-700">
                  Create Emergency Report
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Response Tracking Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-blue-600" />
                Response Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Track delivery progress and partial deliveries
              </p>
              <div className="space-y-2">
                <Link href="/responses/status-review" className="w-full">
                  <Button className="w-full" size="sm">Status Review</Button>
                </Link>
                <Link href="/verification/responses" className="w-full">
                  <Button className="w-full" variant="outline" size="sm">Response Queue</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* System Status Card - FIXED */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3" data-testid="system-status">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${
                    isOffline ? 'bg-orange-500' : 'bg-green-500'
                  }`}></div>
                  <span className={`font-medium ${
                    isOffline ? 'text-orange-700' : 'text-green-700'
                  }`}>
                    {isOffline ? 'Offline' : 'Online'}
                  </span>
                  <Badge 
                    variant="secondary" 
                    className={`ml-auto ${
                      isOffline 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {isOffline ? 'Disconnected' : 'Connected'}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  {isOffline 
                    ? `Work saved locally. ${queue.length} items will sync when connected.`
                    : 'All features available including real-time sync'
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <FileEdit className="w-4 h-4 text-blue-600" />
                    <Link href="/assessments/drafts" className="text-sm font-medium">
                      View Drafts
                    </Link>
                  </div>
                  <Badge variant="outline">{badges?.drafts ?? 2}</Badge>
                </div>

                <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-green-600" />
                    <Link href="/verification/queue" className="text-sm font-medium">
                      Review Queue
                    </Link>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">{badges?.verificationQueue ?? 5}</Badge>
                </div>

                <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-orange-600" />
                    <Link href="/queue" className="text-sm font-medium">
                      Sync Queue
                    </Link>
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">{queue.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                Help & Documentation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link 
                  href="/help/assessment-guide" 
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 text-sm"
                >
                  <FileText className="w-4 h-4 text-gray-500" />
                  Assessment Guide
                </Link>
                <Link 
                  href="/help/offline-mode" 
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 text-sm"
                >
                  <Wifi className="w-4 h-4 text-gray-500" />
                  Offline Mode Help
                </Link>
                <Link 
                  href="/help/emergency-procedures" 
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 text-sm"
                >
                  <AlertTriangle className="w-4 h-4 text-gray-500" />
                  Emergency Procedures
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
    </>
  )
}