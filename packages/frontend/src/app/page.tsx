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
import { FeatureCard } from '@/components/dashboard/FeatureCard'
import { AssessmentTypeCard } from '@/components/dashboard/AssessmentTypeCard'
import { QuickStatsCard } from '@/components/dashboard/QuickStatsCard'
import { assessmentTypeColors, featureColors, statusColors } from '@/lib/constants/colors'

export default function HomePage() {
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
      title: 'Response Planning',
      description: 'Plan and coordinate humanitarian response activities',
      icon: <BarChart3 className="w-6 h-6" />,
      ...featureColors.responses,
      actions: [
        { label: 'Plan New Response', href: '/responses/plan' }
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
      title: 'Sync Queue',
      description: 'Monitor offline synchronization operations',
      icon: <Archive className="w-6 h-6" />,
      ...featureColors.queue,
      actions: [
        { label: 'View Sync Queue', href: '/queue' }
      ],
      stats: { count: 0, label: 'pending' }
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

          {/* Incidents Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Incidents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Monitor and manage active disaster incidents
              </p>
              <Link href="/incidents" className="w-full">
                <Button className="w-full">View Incidents</Button>
              </Link>
            </CardContent>
          </Card>

          {/* System Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-700 font-medium">Online</span>
                  <Badge variant="secondary" className="ml-auto bg-green-100 text-green-800">
                    Connected
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  All features available including real-time sync
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
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <Link href="/assessments?filter=pending" className="text-sm font-medium">
                      Pending Sync
                    </Link>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">0</Badge>
                </div>

                <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <Link href="/assessments?filter=failed" className="text-sm font-medium">
                      Failed Sync
                    </Link>
                  </div>
                  <Badge variant="destructive">0</Badge>
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