'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface AssessmentTypeCardProps {
  id: string
  name: string
  icon: React.ReactNode
  pending: number
  color: string
  bgColor: string
}

export function AssessmentTypeCard({
  id,
  name,
  icon,
  pending,
  color,
  bgColor
}: AssessmentTypeCardProps) {
  return (
    <Link href={`/assessments/new?type=${id}`}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-200 h-full">
        <CardContent className="p-4 text-center">
          {/* Icon Container */}
          <div className={`mb-2 mx-auto w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center`}>
            <div className={color}>
              {icon}
            </div>
          </div>
          
          {/* Content */}
          <h3 className="font-medium text-sm mb-2">{name}</h3>
          
          {/* Status Badge */}
          <Badge variant={pending > 0 ? "default" : "secondary"}>
            {pending} pending
          </Badge>
        </CardContent>
      </Card>
    </Link>
  )
}