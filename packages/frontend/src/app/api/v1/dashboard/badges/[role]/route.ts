import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { role: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    const role = params.role.toLowerCase();

    // TODO: Replace with actual database queries
    const badges = await getDashboardBadgesForRole(role);

    return NextResponse.json({
      success: true,
      data: badges,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to fetch dashboard badges:', error);
    return NextResponse.json(
      { success: false, errors: ['Failed to fetch dashboard badges'] },
      { status: 500 }
    );
  }
}

async function getDashboardBadgesForRole(role: string): Promise<Record<string, number>> {
  // TODO: Replace with actual database queries when database schema ready
  // 
  // Example future implementation:
  // const assessmentCount = await prisma.assessment.count({
  //   where: { status: 'PENDING_REVIEW' }
  // });
  // const activeIncidents = await prisma.incident.count({  
  //   where: { status: 'ACTIVE' }
  // });
  
  switch (role) {
    case 'coordinator':
      return {
        assessmentQueue: 3,        // Realistic: small queue
        responseQueue: 2,          // Realistic: few pending responses  
        assessmentReviews: 1,      // Realistic: 1-2 items to review
        incidentManagement: 1,     // Realistic: 1 active incident
        donorDashboard: 0,         // Realistic: no pending donor items
        conflictResolution: 0,     // Realistic: no current conflicts
        activeAssessments: 8,      // Realistic: moderate workload
        plannedResponses: 3,       // Realistic: few planned responses
        totalLocations: 15,        // Realistic: modest number of locations
        pendingReview: 2,          // Realistic: small review queue
        activeAlerts: 1,           // Realistic: 1 alert
        activeIncidents: 1,        // Realistic: 1 incident
        configurations: 0          // Realistic: no config issues
      };
    
    case 'assessor':
      return {
        healthAssessments: 2,      // Realistic: few pending
        washAssessments: 1,        // Realistic: minimal pending
        shelterAssessments: 1,     // Realistic: some shelter work
        foodAssessments: 0,        // Realistic: no food assessments pending
        securityAssessments: 0,    // Realistic: no security issues
        populationAssessments: 3,  // Realistic: population tracking
        totalAssessments: 12,      // Realistic: moderate total
        drafts: 2,                 // Realistic: few drafts
        pendingReview: 1,          // Realistic: 1 pending review
        approved: 8                // Realistic: several approved
      };
    
    case 'responder':
      return {
        statusReview: 1,           // Realistic: 1 item for review
        allResponses: 3,           // Realistic: few total responses
        myResponses: 3,            // Realistic: personal workload
        planned: 2,                // Realistic: couple planned
        inProgress: 1,             // Realistic: 1 in progress
        completed: 0,              // Realistic: none completed yet
        deliveries: 1,             // Realistic: 1 delivery
        partialDeliveries: 0       // Realistic: no partial deliveries
      };
    
    case 'verifier':
      return {
        verificationQueue: 2,      // Realistic: small queue
        assessmentVerification: 1, // Realistic: 1 assessment to verify
        responseVerification: 1,   // Realistic: 1 response to verify  
        pendingVerifications: 2,   // Realistic: couple pending
        assessmentsToReview: 1,    // Realistic: 1 to review
        responsesToReview: 1,      // Realistic: 1 response review
        approvedToday: 3,          // Realistic: few approved today
        rejectedToday: 0,          // Realistic: none rejected
        flaggedItems: 0            // Realistic: no flagged items
      };
    
    case 'donor':
      return {
        commitments: 1,            // Realistic: 1 commitment
        activeCommitments: 1,      // Realistic: 1 active
        achievementsUnlocked: 3,   // Realistic: few achievements  
        performanceScore: 85       // Realistic: good performance
      };
    
    case 'admin':
      return {
        conflictResolution: 0,     // Realistic: no conflicts
        activeUsers: 5,            // REALISTIC: actual user count
        securityAlerts: 0,         // Realistic: no security issues
        systemHealth: 99           // Realistic: healthy system
      };
    
    default:
      return {};
  }
}