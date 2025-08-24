'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardList, BarChart3, Building, Archive, AlertTriangle,
  HelpCircle, Settings, ChevronLeft, ChevronRight, User,
  Heart, Droplet, Home, Utensils, Shield, Users
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

// Role-based navigation configuration
const navigationSections = {
  assessor: [
    {
      title: 'Assessment Types',
      items: [
        { icon: Heart, label: 'Health', href: '/assessments/new?type=HEALTH', badge: 3 },
        { icon: Droplet, label: 'WASH', href: '/assessments/new?type=WASH', badge: 1 },
        { icon: Home, label: 'Shelter', href: '/assessments/new?type=SHELTER', badge: 2 },
        { icon: Utensils, label: 'Food', href: '/assessments/new?type=FOOD', badge: 0 },
        { icon: Shield, label: 'Security', href: '/assessments/new?type=SECURITY', badge: 1 },
        { icon: Users, label: 'Population', href: '/assessments/new?type=POPULATION', badge: 4 }
      ]
    },
    {
      title: 'Management',
      items: [
        { icon: ClipboardList, label: 'All Assessments', href: '/assessments', badge: 0 },
        { icon: Building, label: 'Entities', href: '/entities', badge: 0 },
        { icon: Archive, label: 'Queue', href: '/queue', badge: 0 }
      ]
    }
  ],
  coordinator: [
    {
      title: 'Verification',
      items: [
        { icon: ClipboardList, label: 'Assessment Queue', href: '/coordinator/assessments', badge: 5 },
        { icon: BarChart3, label: 'Response Queue', href: '/coordinator/responses', badge: 3 }
      ]
    },
    {
      title: 'Management',
      items: [
        { icon: AlertTriangle, label: 'Crisis Dashboard', href: '/coordinator/crisis', badge: 0 },
        { icon: Building, label: 'Resource Overview', href: '/coordinator/resources', badge: 0 }
      ]
    }
  ],
  responder: [
    {
      title: 'Response Planning',
      items: [
        { icon: BarChart3, label: 'Plan Response', href: '/responses/plan', badge: 0 },
        { icon: ClipboardList, label: 'Active Responses', href: '/responses/active', badge: 2 },
        { icon: Archive, label: 'Delivery Tracking', href: '/responses/tracking', badge: 1 }
      ]
    }
  ],
  donor: [
    {
      title: 'Contribution Tracking',
      items: [
        { icon: BarChart3, label: 'Donation Planning', href: '/donor/planning', badge: 0 },
        { icon: ClipboardList, label: 'Commitments', href: '/donor/commitments', badge: 1 },
        { icon: Archive, label: 'Performance', href: '/donor/performance', badge: 0 }
      ]
    }
  ]
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [currentRole, setCurrentRole] = useState<keyof typeof navigationSections>('assessor')

  return (
    <div className={cn(
      "flex flex-col h-full bg-white shadow-lg border-r border-gray-200 transition-all duration-300",
      isOpen ? "w-64" : "w-16"
    )}>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className={cn("flex items-center gap-3", !isOpen && "justify-center")}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          {isOpen && (
            <div>
              <h2 className="font-semibold text-gray-800">DMS</h2>
              <p className="text-xs text-gray-500">Field Operations</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn("h-8 w-8", !isOpen && "mx-auto")}
        >
          {isOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Role Selection */}
      {isOpen && (
        <div className="p-4 border-b border-gray-200">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role</label>
          <select
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value as keyof typeof navigationSections)}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="assessor">Field Assessor</option>
            <option value="coordinator">Crisis Coordinator</option>
            <option value="responder">Field Responder</option>
            <option value="donor">Donor Organization</option>
          </select>
        </div>
      )}

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-4">
        {navigationSections[currentRole].map((section, sectionIdx) => (
          <div key={section.title} className={cn("mb-6", sectionIdx !== 0 && "mt-8")}>
            {isOpen && (
              <h3 className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={cn(
                      "mx-2 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-blue-100 text-blue-700 border border-blue-200" 
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                      !isOpen && "justify-center"
                    )}>
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {isOpen && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {item.badge > 0 && (
                            <Badge variant={isActive ? "default" : "secondary"} className="h-5 text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Footer */}
      <div className="border-t border-gray-200 p-4">
        <Link href="/help">
          <div className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors",
            !isOpen && "justify-center"
          )}>
            <HelpCircle className="w-5 h-5" />
            {isOpen && <span>Help & Support</span>}
          </div>
        </Link>
      </div>
    </div>
  )
}