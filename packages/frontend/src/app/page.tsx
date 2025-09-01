'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  FileText, Heart, Droplet, Home, Utensils, Shield, Users,
  Wifi, AlertTriangle, Clock, XCircle, FileEdit, Zap, 
  CheckCircle, HelpCircle, Activity, MapPin, BarChart3,
  ClipboardList, Building, UserCheck, Archive
} from "lucide-react"
import { useOffline } from '@/hooks/useOffline'
import { useOfflineStore } from '@/stores/offline.store'
import { FeatureCard } from '@/components/dashboard/FeatureCard'
import { AssessmentTypeCard } from '@/components/dashboard/AssessmentTypeCard'
import { QuickStatsCard } from '@/components/dashboard/QuickStatsCard'
import { assessmentTypeColors, featureColors, statusColors } from '@/lib/constants/colors'

export default function HomePage() {
  const { isOffline } = useOffline();
  const queue = useOfflineStore(state => state.queue);
  const mainFeatures = [
    {
      title: 'Assessments',
      description: 'Create and manage rapid assessments for disaster situations',
      icon: <ClipboardList className="w-6 h-6" />,
      ...featureColors.assessments,
      actions: [
        { label: 'View All Assessments', href: '/assessments' },
        { label: 'Create New Assessment', href: '/assessments/new', variant: 'outline' as const },
        { label: 'View Status Dashboard', href: '/assessments/status', variant: 'ghost' as const }
      ],
      stats: { count: 12, label: 'active' }
    },
    {
      title: 'Response Management',
      description: 'Plan responses and track delivery progress',
      icon: <BarChart3 className="w-6 h-6" />,
      ...featureColors.responses,
      actions: [
        { label: 'Plan New Response', href: '/responses/plan' },
        { label: 'Track Deliveries', href: '/responses/tracking', variant: 'outline' as const },
        { label: 'Planned to Actual', href: '/responses/conversion', variant: 'ghost' as const }
      ],
      stats: { count: 3, label: 'planned' }
    },
    {
      title: 'Entity Management',
      description: 'Manage affected entities, camps, and communities',
      icon: <Building className="w-6 h-6" />,
      ...featureColors.entities,
      actions: [
        { label: 'View All Entities', href: '/entities' }
      ],
      stats: { count: 28, label: 'locations' }
    },
    {
      title: 'Coordinator Tools',
      description: 'Verification dashboard and approval management',
      icon: <UserCheck className="w-6 h-6" />,
      ...featureColors.queue,
      actions: [
        { label: 'Verification Dashboard', href: '/coordinator/dashboard' },
        { label: 'Donor Coordination', href: '/coordinator/donors', variant: 'outline' as const },
        { label: 'System Monitoring', href: '/coordinator/monitoring', variant: 'outline' as const },
        { label: 'Assessment Approvals', href: '/coordinator/assessments/review', variant: 'ghost' as const },
        { label: 'Response Approvals', href: '/coordinator/responses/review', variant: 'ghost' as const }
      ],
      stats: { count: 8, label: 'pending review' }
    },
    {
      title: 'Monitoring Tools',
      description: 'Real-time monitoring and geographic visualization',
      icon: <Activity className="w-6 h-6" />,
      ...featureColors.assessments,
      actions: [
        { label: 'Situation Display', href: '/monitoring' },
        { label: 'Interactive Map', href: '/monitoring/map', variant: 'outline' as const }
      ],
      stats: { count: 4, label: 'active alerts' }
    },
    {
      title: 'Incident Management',
      description: 'Manage and track disaster incidents and responses',
      icon: <AlertTriangle className="w-6 h-6" />,
      ...featureColors.responses,
      actions: [
        { label: 'Manage Incidents', href: '/coordinator/incidents' }
      ],
      stats: { count: 0, label: 'active incidents' }
    },
    {
      title: 'System Configuration',
      description: 'Configure system settings and automation rules',
      icon: <UserCheck className="w-6 h-6" />,
      ...featureColors.queue,
      actions: [
        { label: 'Auto-Approval Config', href: '/coordinator/auto-approval' },
        { label: 'Priority Sync Config', href: '/queue', variant: 'outline' as const },
        { label: 'Conflict Resolution', href: '/coordinator/conflicts', variant: 'ghost' as const }
      ],
      stats: { count: 3, label: 'configurations' }
    }
  ]

  const assessmentTypes = [
    { 
      id: 'HEALTH', 
      name: 'Health', 
      icon: <Heart className="w-8 h-8" />, 
      pending: 3,
      ...assessmentTypeColors.HEALTH
    },
    { 
      id: 'WASH', 
      name: 'WASH', 
      icon: <Droplet className="w-8 h-8" />, 
      pending: 1,
      ...assessmentTypeColors.WASH
    },
    { 
      id: 'SHELTER', 
      name: 'Shelter', 
      icon: <Home className="w-8 h-8" />, 
      pending: 2,
      ...assessmentTypeColors.SHELTER
    },
    { 
      id: 'FOOD', 
      name: 'Food', 
      icon: <Utensils className="w-8 h-8" />, 
      pending: 0,
      ...assessmentTypeColors.FOOD
    },
    { 
      id: 'SECURITY', 
      name: 'Security', 
      icon: <Shield className="w-8 h-8" />, 
      pending: 1,
      ...assessmentTypeColors.SECURITY
    },
    { 
      id: 'POPULATION', 
      name: 'Population', 
      icon: <Users className="w-8 h-8" />, 
      pending: 4,
      ...assessmentTypeColors.POPULATION
    }
  ]

  return (
    <>
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome back, Field Worker</h2>
        <p className="text-gray-600">Here&apos;s your current operational overview</p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <QuickStatsCard
          title="Active Assessments"
          value={12}
          icon={<ClipboardList className="w-6 h-6 text-blue-600" />}
          {...statusColors.online}
          trend={{ value: 15, label: 'from yesterday', isPositive: true }}
        />
        <QuickStatsCard
          title="Completed Today"
          value={8}
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
          {...statusColors.online}
          trend={{ value: 25, label: 'above target', isPositive: true }}
        />
        <QuickStatsCard
          title="Pending Sync"
          value={3}
          icon={<Clock className="w-6 h-6 text-orange-600" />}
          {...statusColors.offline}
        />
        <QuickStatsCard
          title="Critical Issues"
          value={1}
          icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
          {...statusColors.error}
        />
      </div>
      {/* Main Features Grid */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">Main Features</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {mainFeatures.map(feature => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>

      {/* Assessment Types Grid */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">Quick Assessment Creation</h3>
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
                  <Badge variant="outline">2</Badge>
                </div>

                <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-green-600" />
                    <Link href="/verification/queue" className="text-sm font-medium">
                      Review Queue
                    </Link>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">5</Badge>
                </div>

                <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-orange-600" />
                    <Link href="/queue" className="text-sm font-medium">
                      Sync Queue
                    </Link>
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">0</Badge>
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