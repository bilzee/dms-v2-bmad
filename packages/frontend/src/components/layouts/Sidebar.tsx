'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRoleContext } from '@/components/providers/RoleContextProvider'
import { useRoleNavigation } from '@/hooks/useRoleNavigation'
import {
  ClipboardList, BarChart3, Building, Archive, AlertTriangle,
  HelpCircle, Settings, ChevronLeft, ChevronRight, User,
  Heart, Droplet, Home, Utensils, Shield, Users, Zap, HandHeart,
  Award, Trophy, CheckCircle, UserCheck, Activity
} from 'lucide-react'

const iconMap = {
  ClipboardList,
  BarChart3,
  Building,
  Archive,
  AlertTriangle,
  Settings,
  User,
  Heart,
  Droplet,
  Home,
  Utensils,
  Shield,
  Users,
  Zap,
  HandHeart,
  HelpCircle,
  Award,
  Trophy,
  CheckCircle,
  UserCheck,
  Activity
};

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { activeRole } = useRoleContext()
  const { navigationSections, isAuthorizedForRoute } = useRoleNavigation()

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

      {/* Active Role Display */}
      {isOpen && activeRole && (
        <div className="p-4 border-b border-gray-200">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Role</label>
          <div className="mt-1 px-3 py-2 bg-gray-50 rounded-md text-sm font-medium text-gray-800">
            {activeRole.name}
          </div>
        </div>
      )}

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-4">
        {navigationSections.map((section, sectionIdx) => (
          <div key={section.title} className={cn("mb-6", sectionIdx !== 0 && "mt-8")}>
            {isOpen && (
              <h3 className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const iconName = typeof item.icon === 'string' ? item.icon : 'ClipboardList';
                const Icon = iconMap[iconName as keyof typeof iconMap] || ClipboardList;
                const isActive = pathname === item.href;
                const isAuthorized = isAuthorizedForRoute(item.href);
                
                if (!isAuthorized) {
                  return null;
                }
                
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={cn(
                      "mx-2 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
                      isActive 
                        ? "bg-blue-100 text-blue-700 border border-blue-200 shadow-sm" 
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                      !isOpen && "justify-center"
                    )}>
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {isOpen && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {item.badge > 0 && (
                            <Badge 
                              variant={
                                item.badgeVariant || (isActive ? "default" : "secondary")
                              } 
                              className="h-5 text-xs"
                            >
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