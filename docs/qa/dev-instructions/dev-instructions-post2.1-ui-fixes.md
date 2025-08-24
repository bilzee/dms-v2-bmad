● 🎯 COMPREHENSIVE DEV INSTRUCTIONS: UI Implementation Fixes

  EXECUTIVE SUMMARY FOR DEV AGENT

  Transform the basic homepage into a professional humanitarian disaster management
  interface using the existing shadcn/ui setup. Priority: HIGH - Current UI doesn't
  match UX specification requirements.

  ---
  🔧 TECHNICAL CONTEXT

  - Framework: Next.js 14 with App Router ✅
  - UI Library: shadcn/ui properly installed ✅
  - Styling: Tailwind CSS + custom humanitarian.css ✅
  - Components Available: All shadcn/ui primitives ready to use ✅
  - Main File: /src/app/page.tsx (currently using custom CSS classes)

  ---
  🚨 CRITICAL FIXES REQUIRED

  FIX 1: Convert Custom CSS to shadcn/ui Components

  File: src/app/page.tsx

  REPLACE THIS PATTERN:
  <div className="card">
    <h2 className="text-xl font-semibold text-gray-900 mb-4">
      📋 Assessments
    </h2>
    <p className="text-gray-600 mb-4">Description</p>
    <Link href="/assessments" className="block btn-primary text-center">
      View Assessments
    </Link>
  </div>

  WITH THIS PATTERN:
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
  import { Button } from "@/components/ui/button"
  import { Badge } from "@/components/ui/badge"

  <Card className="hover:shadow-md transition-shadow">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <FileText className="w-5 h-5" />
        Assessments
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground mb-4">
        Create and manage rapid assessments for disaster situations
      </p>
      <div className="space-y-2">
        <Button asChild className="w-full">
          <Link href="/assessments">View Assessments</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/assessments/new">New Assessment</Link>
        </Button>
      </div>
    </CardContent>
  </Card>

  FIX 2: Implement Assessment Type Grid

  Location: Replace the generic "Assessments" card with this grid

  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
  import { Badge } from "@/components/ui/badge"
  import { Heart, Droplet, Home, Utensils, Shield, Users } from "lucide-react"

  const assessmentTypes = [
    { id: 'HEALTH', name: 'Health', icon: <Heart className="w-8 h-8 text-red-500" />,
  pending: 3 },
    { id: 'WASH', name: 'WASH', icon: <Droplet className="w-8 h-8 text-blue-500" />,
  pending: 1 },
    { id: 'SHELTER', name: 'Shelter', icon: <Home className="w-8 h-8 text-green-500" />,
   pending: 2 },
    { id: 'FOOD', name: 'Food', icon: <Utensils className="w-8 h-8 text-orange-500" />,
  pending: 0 },
    { id: 'SECURITY', name: 'Security', icon: <Shield className="w-8 h-8 
  text-purple-500" />, pending: 1 },
    { id: 'POPULATION', name: 'Population', icon: <Users className="w-8 h-8 
  text-indigo-500" />, pending: 4 }
  ]

  // Replace assessments card with:
  <div className="md:col-span-2 lg:col-span-3">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Assessment Types
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {assessmentTypes.map(type => (
            <Card key={type.id} className="cursor-pointer hover:shadow-md 
  transition-shadow border-2 hover:border-blue-200">
              <CardContent className="p-4 text-center">
                <div className="mb-2 flex justify-center">{type.icon}</div>
                <h3 className="font-medium text-sm mb-2">{type.name}</h3>
                <Badge variant={type.pending > 0 ? "default" : "secondary"}>
                  {type.pending} pending
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>

  FIX 3: Enhanced Connection Status Header

  Location: Replace basic "Online" indicator in header

  import { Alert, AlertDescription } from "@/components/ui/alert"
  import { Badge } from "@/components/ui/badge"
  import { Wifi, WifiOff, Loader2 } from "lucide-react"

  // Add to header section:
  <div className="bg-green-50 border-b border-green-200">
    <div className="container py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <Wifi className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Online</span>
          </div>
          <Badge variant="secondary" className="ml-4">
            0 items queued
          </Badge>
        </div>
        <div className="text-xs text-green-600">
          Last sync: just now
        </div>
      </div>
    </div>
  </div>

  FIX 4: Emergency-Themed Preliminary Assessment

  Location: Update preliminary assessment card styling

  import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
  import { AlertTriangle } from "lucide-react"

  // Replace preliminary assessment card:
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
      <Button asChild className="w-full bg-red-600 hover:bg-red-700">
        <Link href="/assessments/new?type=PRELIMINARY">
          Create Emergency Report
        </Link>
      </Button>
    </CardContent>
  </Card>

  FIX 5: Enhanced Quick Actions with Status Badges

  Location: Update quick actions card

  import { CheckCircle, Clock, XCircle, FileEdit } from "lucide-react"

  // Replace quick actions card:
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Zap className="w-5 h-5" />
        Quick Actions
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-2 rounded-md 
  hover:bg-gray-50">
          <div className="flex items-center gap-2">
            <FileEdit className="w-4 h-4 text-blue-600" />
            <Link href="/assessments/drafts" className="text-sm font-medium">
              View Drafts
            </Link>
          </div>
          <Badge variant="outline">2</Badge>
        </div>

        <div className="flex items-center justify-between p-2 rounded-md 
  hover:bg-gray-50">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            <Link href="/assessments?filter=pending" className="text-sm font-medium">
              Pending Sync
            </Link>
          </div>
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">0</Badge>
        </div>

        <div className="flex items-center justify-between p-2 rounded-md 
  hover:bg-gray-50">
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

  ---
  📋 IMPLEMENTATION CHECKLIST

  STEP 1: Update Imports ✅

  Add these imports to src/app/page.tsx:
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
  import { Button } from "@/components/ui/button"
  import { Badge } from "@/components/ui/badge"
  import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
  import {
    FileText, Heart, Droplet, Home, Utensils, Shield, Users,
    Wifi, AlertTriangle, Clock, XCircle, FileEdit, Zap
  } from "lucide-react"

  STEP 2: Replace Grid Layout ✅

  Update the main grid to accommodate the assessment type grid:
  <main className="container py-12">
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Assessment Types Grid - spans full width */}
      {/* Emergency Report Card */}
      {/* System Status Card */}
      {/* Quick Actions Card */}
      {/* Incidents Card */}
      {/* Help Card */}
    </div>
  </main>

  STEP 3: Test Responsive Design ✅

  Verify the interface works properly on:
  - Desktop (1920x1080)
  - Tablet (768x1024)
  - Mobile (375x667)

  STEP 4: Add Humanitarian Color Variables ✅

  Update tailwind.config.js to include UX spec colors:
  module.exports = {
    theme: {
      extend: {
        colors: {
          'emergency': {
            500: '#DC2626',
            600: '#B91C1C',
          },
          'un-blue': {
            500: '#0066CC',
            600: '#0052A3',
          },
          'relief-green': {
            500: '#059669',
            600: '#047857',
          }
        }
      }
    }
  }

  ---
  🎯 SUCCESS CRITERIA

  Visual Requirements:

  - ✅ All cards use shadcn/ui Card components
  - ✅ Proper status badges with appropriate colors
  - ✅ Assessment types displayed in responsive grid
  - ✅ Emergency styling for preliminary assessment
  - ✅ Enhanced connection status indicator

  Functional Requirements:

  - ✅ All existing links continue to work
  - ✅ Responsive design maintained
  - ✅ Hover states and interactions working
  - ✅ Accessibility preserved (proper ARIA labels)

  Code Quality:

  - ✅ Remove all custom .card, .btn-primary CSS classes
  - ✅ Use shadcn/ui components consistently
  - ✅ Maintain TypeScript type safety
  - ✅ Follow existing code conventions

  ---
  🚀 POST-IMPLEMENTATION TASKS

  1. Run Tests: Ensure no existing functionality breaks
  2. Test Responsive: Verify mobile/tablet layouts
  3. Accessibility Check: Screen reader compatibility
  4. Performance: Check bundle size impact
  5. Document: Update any component documentation

  ---
  📞 ESCALATION PATH

  If you encounter issues with:
  - shadcn/ui component conflicts → Check components.json configuration
  - Tailwind CSS not applying → Verify tailwind.config.js setup
  - Icon imports failing → Ensure lucide-react is installed
  - TypeScript errors → Check import paths in components.json aliases

  PRIORITY: Complete FIX 1-3 first (core functionality), then FIX 4-5 (enhancements).

  This will transform the basic interface into a professional humanitarian disaster
  management platform that matches the UX specification requirements! 🎨✨
