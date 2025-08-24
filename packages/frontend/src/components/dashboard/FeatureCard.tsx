'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronRight } from 'lucide-react'

interface FeatureCardProps {
  title: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
  actions: Array<{
    label: string
    href: string
    variant?: 'default' | 'outline' | 'ghost'
  }>
  stats?: {
    count: number
    label: string
  }
}

export function FeatureCard({
  title,
  description,
  icon,
  color,
  bgColor,
  actions,
  stats
}: FeatureCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 relative overflow-hidden group">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          {/* Icon Container with unique gradient accent */}
          <div className={`relative p-4 rounded-full ${bgColor} shadow-inner`}>
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent ${bgColor}`}></div>
            <div className={`relative z-10 ${color}`}>
              {icon}
            </div>
            {/* Floating dot accent */}
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${color.replace('text-', 'bg-')} opacity-80 animate-pulse`}></div>
          </div>
          
          {/* Content */}
          <div className="flex-1">
            <CardTitle className={`text-lg font-semibold ${color} relative`}>
              {title}
              {/* Unique underline accent */}
              <div className={`absolute -bottom-1 left-0 h-0.5 w-8 ${color.replace('text-', 'bg-')} rounded-full`}></div>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {description}
            </p>
            
            {/* Stats */}
            {stats && (
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary">
                  {stats.count} {stats.label}
                </Badge>
              </div>
            )}
          </div>
          
          {/* Arrow Indicator */}
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Action Buttons */}
        <div className="space-y-1">
          {actions.map((action) => (
            <Link key={action.href} href={action.href} className="block">
              <Button 
                variant={action.variant || "ghost"}
                size="sm" 
                className="w-full justify-start text-xs h-7"
              >
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}