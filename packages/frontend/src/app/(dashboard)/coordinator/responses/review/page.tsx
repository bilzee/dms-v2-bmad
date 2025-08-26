import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Response Review | DMS',
  description: 'Review and approve response plans and deliveries'
}

export default function ResponseReview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Response Review</h1>
        <p className="text-muted-foreground">
          Review and approve response plans and deliveries
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Responses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Response review queue will be implemented here</p>
            <p className="text-sm text-muted-foreground mt-2">
              This corresponds to Story 3.3: Response Approval/Rejection
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}