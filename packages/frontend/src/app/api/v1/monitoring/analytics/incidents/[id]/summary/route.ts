import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const incidentId = params.id;

    if (!incidentId) {
      return NextResponse.json({
        success: false,
        data: null,
        errors: ['Incident ID is required'],
        message: 'Invalid request parameters',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    const incident = await DatabaseService.getIncidentById(incidentId);
    
    if (!incident) {
      return NextResponse.json({
        success: false,
        data: null,
        errors: ['Incident not found'],
        message: `Incident with ID ${incidentId} does not exist`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    const currentDate = new Date();
    const declarationDate = new Date(incident.date);
    const timeDiff = currentDate.getTime() - declarationDate.getTime();
    
    const days = Math.floor(timeDiff / (1000 * 3600 * 24));
    const hours = Math.floor((timeDiff % (1000 * 3600 * 24)) / (1000 * 3600));
    
    let durationFormatted = '';
    if (days > 0) {
      durationFormatted = `${days} day${days !== 1 ? 's' : ''}`;
      if (hours > 0) {
        durationFormatted += `, ${hours} hour${hours !== 1 ? 's' : ''}`;
      }
    } else if (hours > 0) {
      durationFormatted = `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      durationFormatted = 'Less than 1 hour';
    }

    // Get real population and assessment data with error handling
    let populationData: any[] = [];
    let affectedEntities: any[] = [];
    
    try {
      populationData = await DatabaseService.getPopulationDataByIncident(incidentId) || [];
      affectedEntities = await DatabaseService.getAffectedEntitiesByIncident(incidentId) || [];
    } catch (dbError) {
      console.warn('Database query failed, using empty data:', dbError);
      // Continue with empty arrays - graceful degradation
    }

    // Calculate real population impact from assessments with safe defaults
    const populationImpact = {
      livesLost: Array.isArray(populationData) ? populationData.reduce((sum: number, p: any) => sum + (p.casualties?.deaths || 0), 0) : 0,
      injured: Array.isArray(populationData) ? populationData.reduce((sum: number, p: any) => sum + (p.casualties?.injuries || 0), 0) : 0,
      displaced: Array.isArray(populationData) ? populationData.reduce((sum: number, p: any) => sum + (p.demographics?.displacedPersons || 0), 0) : 0,
      housesAffected: Array.isArray(populationData) ? populationData.reduce((sum: number, p: any) => sum + (p.infrastructure?.housesAffected || 0), 0) : 0,
    };

    // Calculate real aggregate data with safe defaults
    const aggregates = {
      affectedEntities: Array.isArray(affectedEntities) ? affectedEntities.length : 0,
      totalAffectedPopulation: Array.isArray(populationData) ? populationData.reduce((sum: number, p: any) => 
        sum + (p.demographics?.totalPopulation || 0), 0
      ) : 0,
      totalAffectedHouseholds: Array.isArray(populationData) ? populationData.reduce((sum: number, p: any) => 
        sum + (p.demographics?.households || 0), 0
      ) : 0,
    };

    const summary = {
      incident: {
        id: incident.id,
        title: incident.name,
        status: incident.status,
        declarationDate: declarationDate.toISOString(),
        currentDate: currentDate.toISOString(),
        duration: {
          days,
          hours,
          formatted: durationFormatted,
        },
      },
      populationImpact,
      aggregates,
    };

    return NextResponse.json({
      success: true,
      data: { summary },
      message: `Successfully retrieved incident summary for ${incident.name}`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch incident summary:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch incident summary'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}