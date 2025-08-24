'use client'

import { Card, CardContent } from '@/components/ui/card'

interface QuickStatsCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  bgColor: string
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
}

export function QuickStatsCard({
  title,
  value,
  icon,
  bgColor,
  trend
}: QuickStatsCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center`}>
            {icon}
          </div>
          
          {/* Stats */}
          <div className="flex-1">
            <p className="text-2xl font-bold text-gray-800">
              {value}
            </p>
            <p className="text-sm text-gray-600">{title}</p>
            
            {/* Trend Indicator */}
            {trend && (
              <div className={`text-xs mt-1 ${
                trend.isPositive !== false ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.isPositive !== false ? '↗' : '↘'} {trend.value}% {trend.label}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}