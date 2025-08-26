import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { UserRoleType, ResponseType } from '@dms/shared';

interface DeliveryItem {
  itemType: ResponseType;
  plannedQuantity: number;
  actualQuantity: number;
  unit: string;
  variance: number;
  verified: boolean;
}

interface VarianceFlag {
  type: 'QUANTITY' | 'BENEFICIARY' | 'TIMING' | 'LOCATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  threshold: number;
  actual: number;
}

interface ResponseVerificationMetrics {
  responseId: string;
  plannedItems: DeliveryItem[];
  actualItems: DeliveryItem[];
  plannedBeneficiaries: number;
  actualBeneficiaries: number;
  deliveryCompleteness: number;
  varianceFlags: VarianceFlag[];
  verificationNotes: string;
  photosVerified: boolean;
  locationVerified: boolean;
  timestampVerified: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - session required' },
        { status: 401 }
      );
    }

    if (session.user.role !== UserRoleType.COORDINATOR) {
      return NextResponse.json(
        { success: false, error: 'Access denied - coordinator role required' },
        { status: 403 }
      );
    }

    const responseId = params.id;
    const body = await request.json();

    // Get the response with assessment data
    const response = await prisma.rapidResponse.findUnique({
      where: { id: responseId },
      include: {
        assessment: {
          select: {
            id: true,
            type: true,
            data: true
          }
        },
        deliveryEvidence: {
          select: {
            id: true,
            metadata: true,
            createdAt: true
          }
        }
      }
    });

    if (!response) {
      return NextResponse.json(
        { success: false, error: 'Response not found' },
        { status: 404 }
      );
    }

    // Extract planned vs actual metrics from request body
    const metrics: ResponseVerificationMetrics = body.metrics;

    // Validate delivery metrics
    const validationResults = {
      deliveryCompleteness: 0,
      varianceFlags: [] as VarianceFlag[],
      overallScore: 0,
      recommendations: [] as string[]
    };

    // Calculate delivery completeness
    let totalPlannedValue = 0;
    let totalActualValue = 0;

    metrics.plannedItems.forEach((planned, index) => {
      const actual = metrics.actualItems[index];
      if (actual) {
        totalPlannedValue += planned.plannedQuantity;
        totalActualValue += actual.actualQuantity;

        // Check quantity variance
        const variance = Math.abs((actual.actualQuantity - planned.plannedQuantity) / planned.plannedQuantity * 100);
        
        if (variance > 20) {
          validationResults.varianceFlags.push({
            type: 'QUANTITY',
            severity: variance > 50 ? 'HIGH' : 'MEDIUM',
            description: `${planned.itemType} delivery variance: ${variance.toFixed(1)}%`,
            threshold: planned.plannedQuantity,
            actual: actual.actualQuantity
          });
        }
      }
    });

    validationResults.deliveryCompleteness = totalPlannedValue > 0 
      ? (totalActualValue / totalPlannedValue) * 100 
      : 0;

    // Check beneficiary variance
    const beneficiaryVariance = Math.abs(
      (metrics.actualBeneficiaries - metrics.plannedBeneficiaries) / metrics.plannedBeneficiaries * 100
    );

    if (beneficiaryVariance > 15) {
      validationResults.varianceFlags.push({
        type: 'BENEFICIARY',
        severity: beneficiaryVariance > 30 ? 'HIGH' : 'MEDIUM',
        description: `Beneficiary count variance: ${beneficiaryVariance.toFixed(1)}%`,
        threshold: metrics.plannedBeneficiaries,
        actual: metrics.actualBeneficiaries
      });
    }

    // Check timing variance
    if (response.deliveredDate && response.plannedDate) {
      const plannedTime = new Date(response.plannedDate).getTime();
      const actualTime = new Date(response.deliveredDate).getTime();
      const timeDiff = Math.abs(actualTime - plannedTime) / (1000 * 60 * 60 * 24); // days

      if (timeDiff > 1) {
        validationResults.varianceFlags.push({
          type: 'TIMING',
          severity: timeDiff > 7 ? 'HIGH' : timeDiff > 3 ? 'MEDIUM' : 'LOW',
          description: `Delivery timing variance: ${timeDiff.toFixed(1)} days`,
          threshold: 0,
          actual: timeDiff
        });
      }
    }

    // Check photo metadata for location and timestamp verification
    const photoMetadata = response.deliveryEvidence.map(photo => photo.metadata as any);
    let locationAccuracySum = 0;
    let validTimestamps = 0;

    photoMetadata.forEach(metadata => {
      if (metadata?.gps?.accuracy) {
        locationAccuracySum += metadata.gps.accuracy;
      }
      if (metadata?.timestamp) {
        validTimestamps++;
      }
    });

    const avgLocationAccuracy = photoMetadata.length > 0 
      ? locationAccuracySum / photoMetadata.length 
      : 0;

    if (avgLocationAccuracy > 50) { // meters
      validationResults.varianceFlags.push({
        type: 'LOCATION',
        severity: avgLocationAccuracy > 200 ? 'HIGH' : 'MEDIUM',
        description: `GPS accuracy concern: ${avgLocationAccuracy.toFixed(0)}m average`,
        threshold: 50,
        actual: avgLocationAccuracy
      });
    }

    // Calculate overall verification score
    let score = 100;
    validationResults.varianceFlags.forEach(flag => {
      switch (flag.severity) {
        case 'HIGH': score -= 20; break;
        case 'MEDIUM': score -= 10; break;
        case 'LOW': score -= 5; break;
      }
    });

    validationResults.overallScore = Math.max(0, score);

    // Generate recommendations
    if (validationResults.deliveryCompleteness < 80) {
      validationResults.recommendations.push('Consider follow-up delivery to complete planned response');
    }
    if (beneficiaryVariance > 20) {
      validationResults.recommendations.push('Verify beneficiary count accuracy with field team');
    }
    if (avgLocationAccuracy > 100) {
      validationResults.recommendations.push('Request additional photos with better GPS accuracy');
    }
    if (validationResults.varianceFlags.some(f => f.severity === 'HIGH')) {
      validationResults.recommendations.push('Requires coordinator review before approval');
    }

    // Store validation results
    const validationRecord = await prisma.verification.create({
      data: {
        status: 'PENDING',
        verifierNotes: `Automated metrics validation - Score: ${validationResults.overallScore}/100`,
        coordinatorId: session.user.id,
        responseId: responseId,
        data: {
          metrics,
          validation: validationResults,
          automatedValidation: true,
          timestamp: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        validationId: validationRecord.id,
        deliveryCompleteness: validationResults.deliveryCompleteness,
        overallScore: validationResults.overallScore,
        varianceFlags: validationResults.varianceFlags,
        recommendations: validationResults.recommendations,
        photosAnalyzed: photoMetadata.length,
        locationAccuracy: avgLocationAccuracy,
        timestampValidation: {
          total: photoMetadata.length,
          valid: validTimestamps,
          percentage: photoMetadata.length > 0 ? (validTimestamps / photoMetadata.length) * 100 : 0
        }
      }
    });

  } catch (error) {
    console.error('Error validating response metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate response metrics' },
      { status: 500 }
    );
  }
}