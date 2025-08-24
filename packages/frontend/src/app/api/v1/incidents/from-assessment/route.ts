import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  RapidAssessment, 
  PreliminaryAssessmentData, 
  Incident, 
  IncidentStatus,
  IncidentType,
  IncidentSeverity,
  AssessmentType 
} from '@dms/shared';
import prisma from '@/lib/prisma';
import { validateApiAccess } from '@/lib/auth/api-auth';
import { IncidentQueue } from '@/lib/queues/incident.queue';

const createIncidentSchema = z.object({
  assessmentId: z.string().uuid(),
  assessmentData: z.object({
    incidentType: z.nativeEnum(IncidentType),
    incidentSubType: z.string().optional(),
    severity: z.nativeEnum(IncidentSeverity),
    affectedPopulationEstimate: z.number().min(0),
    affectedHouseholdsEstimate: z.number().min(0),
    immediateNeedsDescription: z.string().min(1),
    accessibilityStatus: z.enum(['ACCESSIBLE', 'PARTIALLY_ACCESSIBLE', 'INACCESSIBLE']),
    priorityLevel: z.enum(['HIGH', 'NORMAL', 'LOW']),
    additionalDetails: z.string().optional()
  }),
  affectedEntityId: z.string().uuid(),
  assessorId: z.string().uuid(),
  assessorName: z.string().min(1),
  gpsCoordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().optional(),
    timestamp: z.string(),
    captureMethod: z.enum(['GPS', 'MANUAL', 'MAP_SELECT'])
  }).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Validate user authentication and authorization
    const authResult = await validateApiAccess(request, ['ASSESSOR']);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const { userId, userRole } = authResult;
    const body = await request.json();
    
    // Validate request data
    const validationResult = createIncidentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { assessmentId, assessmentData, affectedEntityId, assessorId, assessorName, gpsCoordinates } = validationResult.data;

    // Create incident from preliminary assessment data
    const incidentId = crypto.randomUUID();
    const currentDate = new Date();

    const incident: Incident = {
      id: incidentId,
      name: `${assessmentData.incidentType} - ${assessmentData.severity}`,
      type: assessmentData.incidentType,
      subType: assessmentData.incidentSubType as any, // TODO: Define proper IncidentSubType enum
      source: `Preliminary Assessment by ${assessorName}`,
      severity: assessmentData.severity,
      status: IncidentStatus.ACTIVE,
      date: currentDate,
      preliminaryAssessmentIds: [assessmentId],
      createdAt: currentDate,
      updatedAt: currentDate
    };

    // Save incident to database
    try {
      const savedIncident = await prisma.incident.create({
        data: {
          id: incident.id,
          name: incident.name,
          type: incident.type,
          subType: incident.subType,
          source: incident.source || undefined,
          severity: incident.severity,
          status: incident.status,
          date: incident.date,
          preliminaryAssessmentIds: incident.preliminaryAssessmentIds,
          createdAt: incident.createdAt,
          updatedAt: incident.updatedAt,
        },
      });

      console.log('Incident saved to database:', savedIncident.id);
    } catch (dbError) {
      console.error('Database save failed:', dbError);
      throw new Error('Failed to save incident to database');
    }
    
    // Send notification to coordinators
    try {
      const notificationResponse = await fetch('/api/v1/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'INCIDENT_CREATED',
          title: `New ${assessmentData.severity} ${assessmentData.incidentType} Incident`,
          message: `A preliminary assessment by ${assessorName} has triggered the creation of a new ${assessmentData.severity.toLowerCase()} ${assessmentData.incidentType.toLowerCase()} incident. Immediate review and response coordination required.`,
          targetRoles: ['COORDINATOR'],
          entityId: incident.id,
          priority: assessmentData.severity === 'CATASTROPHIC' || assessmentData.severity === 'SEVERE' ? 'HIGH' : 'NORMAL',
          metadata: {
            incidentType: assessmentData.incidentType,
            severity: assessmentData.severity,
            assessorName,
            affectedPopulation: assessmentData.affectedPopulationEstimate,
          },
        }),
      });
      
      if (!notificationResponse.ok) {
        console.warn('Failed to send coordinator notification');
      }
    } catch (error) {
      console.error('Error sending coordinator notification:', error);
    }
    
    // Queue background job for incident processing
    try {
      await IncidentQueue.add('process-incident', {
        incidentId: incident.id,
        assessmentId,
        priorityLevel: assessmentData.priorityLevel,
        severity: assessmentData.severity,
      }, {
        priority: assessmentData.priorityLevel === 'HIGH' ? 1 :
                  assessmentData.priorityLevel === 'NORMAL' ? 5 : 10,
        delay: assessmentData.priorityLevel === 'HIGH' ? 0 : 30000, // HIGH = immediate, others = 30s delay
      });

      console.log('Incident processing job queued:', incident.id);
    } catch (queueError) {
      console.error('Failed to queue incident processing:', queueError);
      // Continue - incident was saved, job can be retried
    }

    return NextResponse.json(
      { 
        success: true,
        incident: {
          id: incident.id,
          name: incident.name,
          type: incident.type,
          severity: incident.severity,
          status: incident.status,
          preliminaryAssessmentIds: incident.preliminaryAssessmentIds
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating incident from assessment:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to create incident from preliminary assessment'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'Use POST to create incidents from assessments'
    },
    { status: 405 }
  );
}