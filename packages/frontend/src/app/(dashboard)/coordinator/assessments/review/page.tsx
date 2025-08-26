import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Assessment Review | DMS',
  description: 'Review and approve field assessments'
}

export default function AssessmentReview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assessment Review</h1>
        <p className="text-muted-foreground">
          Review and approve field assessments
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Assessment review queue will be implemented here</p>
            <p className="text-sm text-muted-foreground mt-2">
              This corresponds to Story 3.2: Assessment Approval/Rejection
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}