import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Export format types
type ExportFormat = 'csv' | 'pdf' | 'json';

// Query parameters validation schema
const exportQuerySchema = z.object({
  format: z.enum(['csv', 'pdf', 'json']).default('csv'),
  period: z.enum(['30', '90', '365', 'all']).default('90'),
  includeHistory: z.enum(['true', 'false']).default('true'),
  includeAchievements: z.enum(['true', 'false']).default('true'),
  includeImpact: z.enum(['true', 'false']).default('true'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      format: searchParams.get('format') || 'csv',
      period: searchParams.get('period') || '90',
      includeHistory: searchParams.get('includeHistory') || 'true',
      includeAchievements: searchParams.get('includeAchievements') || 'true',
      includeImpact: searchParams.get('includeImpact') || 'true',
    };

    // Validate query parameters
    const validatedParams = exportQuerySchema.parse(queryParams);

    // Calculate date range for period filtering
    const periodDays = validatedParams.period === 'all' ? 365 : parseInt(validatedParams.period);
    const startDate = validatedParams.period === 'all' 
      ? new Date('1900-01-01') 
      : new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    // Fetch donor info
    const donor = await prisma.donor.findUnique({
      where: { id: session.user.id }
    });

    if (!donor) {
      return NextResponse.json(
        { success: false, message: 'Donor not found' },
        { status: 404 }
      );
    }

    // Fetch performance data
    const commitments = await prisma.donorCommitment.findMany({
      where: {
        donorId: session.user.id,
        createdAt: { gte: startDate }
      },
      include: {
        rapidResponse: {
          where: { verificationStatus: 'VERIFIED' }
        }
      }
    });

    // Calculate performance metrics
    const totalCommitments = commitments.length;
    const deliveredCommitments = commitments.filter(c => c.status === 'DELIVERED');
    const completedDeliveries = deliveredCommitments.length;

    const onTimeDeliveries = deliveredCommitments.filter(c => 
      c.deliveredDate && c.deliveredDate <= c.targetDate
    ).length;
    const onTimeDeliveryRate = totalCommitments > 0 ? (onTimeDeliveries / totalCommitments) * 100 : 0;

    const accurateDeliveries = deliveredCommitments.filter(c => 
      c.actualQuantity && Math.abs(c.actualQuantity - c.quantity) / c.quantity <= 0.1
    ).length;
    const quantityAccuracyRate = completedDeliveries > 0 ? (accurateDeliveries / completedDeliveries) * 100 : 0;

    const performanceScore = (onTimeDeliveryRate * 0.4) + (quantityAccuracyRate * 0.6);

    const beneficiariesHelped = deliveredCommitments.reduce((total, commitment) => {
      if (commitment.rapidResponse?.data) {
        const responseData = commitment.rapidResponse.data as any;
        if (responseData.personsServed) total += responseData.personsServed;
        if (responseData.householdsServed) total += responseData.householdsServed * 4;
      }
      return total;
    }, 0);

    // Fetch achievements if requested
    let achievements: any[] = [];
    if (validatedParams.includeAchievements === 'true') {
      const achievementRecords = await prisma.donorAchievement.findMany({
        where: {
          donorId: session.user.id,
          isUnlocked: true
        },
        orderBy: { unlockedAt: 'desc' }
      });
      
      achievements = achievementRecords.map(a => ({
        title: a.title,
        earnedAt: a.unlockedAt?.toISOString().split('T')[0],
        category: a.category,
        type: a.type,
      }));
    }

    const exportData = {
      donor: {
        id: donor.id,
        name: donor.name,
        organization: donor.organization,
        email: donor.email,
      },
      reportGenerated: new Date().toISOString(),
      reportPeriod: validatedParams.period,
      performanceMetrics: {
        onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 10) / 10,
        quantityAccuracyRate: Math.round(quantityAccuracyRate * 10) / 10,
        performanceScore: Math.round(performanceScore * 10) / 10,
        totalCommitments,
        completedDeliveries,
        beneficiariesHelped,
      },
      achievements,
      impactSummary: validatedParams.includeImpact === 'true' ? {
        totalBeneficiariesHelped: beneficiariesHelped,
        locationsServed: new Set(commitments.map(c => c.affectedEntityId).filter(Boolean)).size,
        responseTypesServed: Array.from(new Set(commitments.map(c => c.responseType))),
      } : {},
      commitmentDetails: commitments.map(c => ({
        id: c.id,
        responseType: c.responseType,
        quantity: c.quantity,
        unit: c.unit,
        status: c.status,
        targetDate: c.targetDate.toISOString().split('T')[0],
        deliveredDate: c.deliveredDate?.toISOString().split('T')[0],
        actualQuantity: c.actualQuantity,
        verified: c.rapidResponse?.verificationStatus === 'VERIFIED',
      })),
    };

    // Generate export content based on format
    switch (validatedParams.format) {
      case 'csv':
        const csvContent = generateCSVContent(exportData);
        return new Response(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="donor-performance-${validatedParams.period}days.csv"`,
          },
        });

      case 'json':
        return NextResponse.json(exportData, {
          headers: {
            'Content-Disposition': `attachment; filename="donor-performance-${validatedParams.period}days.json"`,
          },
        });

      case 'pdf':
        // For PDF generation, return a mock PDF response
        // In a real implementation, you would use a PDF generation library like jsPDF or Puppeteer
        const pdfMockContent = generatePDFMockContent(exportData);
        return new Response(pdfMockContent, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="donor-performance-${validatedParams.period}days.pdf"`,
          },
        });

      default:
        throw new Error('Unsupported export format');
    }

  } catch (error) {
    console.error('Error generating export:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to generate export',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to generate CSV content
function generateCSVContent(data: any): string {
  const csvRows: string[] = [];
  
  // Header
  csvRows.push('Donor Performance Report');
  csvRows.push(`Generated: ${data.reportGenerated}`);
  csvRows.push(`Period: ${data.reportPeriod} days`);
  csvRows.push('');

  // Donor Info
  csvRows.push('DONOR INFORMATION');
  csvRows.push(`Name,${data.donor.name}`);
  csvRows.push(`Organization,${data.donor.organization}`);
  csvRows.push(`Email,${data.donor.email}`);
  csvRows.push('');

  // Performance Metrics
  csvRows.push('PERFORMANCE METRICS');
  csvRows.push('Metric,Value');
  csvRows.push(`On-Time Delivery Rate,${data.performanceMetrics.onTimeDeliveryRate}%`);
  csvRows.push(`Quantity Accuracy Rate,${data.performanceMetrics.quantityAccuracyRate}%`);
  csvRows.push(`Performance Score,${data.performanceMetrics.performanceScore}`);
  csvRows.push(`Total Commitments,${data.performanceMetrics.totalCommitments}`);
  csvRows.push(`Completed Deliveries,${data.performanceMetrics.completedDeliveries}`);
  csvRows.push(`Beneficiaries Helped,${data.performanceMetrics.beneficiariesHelped}`);
  csvRows.push('');

  // Historical Data
  if (data.historicalData.length > 0) {
    csvRows.push('HISTORICAL PERFORMANCE');
    csvRows.push('Date,Performance Score,Deliveries,Beneficiaries');
    data.historicalData.forEach((entry: any) => {
      csvRows.push(`${entry.date},${entry.performanceScore},${entry.deliveries},${entry.beneficiaries}`);
    });
    csvRows.push('');
  }

  // Achievements
  if (data.achievements.length > 0) {
    csvRows.push('ACHIEVEMENTS');
    csvRows.push('Title,Date Earned,Category');
    data.achievements.forEach((achievement: any) => {
      csvRows.push(`${achievement.title},${achievement.earnedAt},${achievement.category}`);
    });
    csvRows.push('');
  }

  // Impact Summary
  if (Object.keys(data.impactSummary).length > 0) {
    csvRows.push('IMPACT SUMMARY');
    csvRows.push('Metric,Value');
    csvRows.push(`Total Beneficiaries Helped,${data.impactSummary.totalBeneficiariesHelped}`);
    csvRows.push(`Locations Served,${data.impactSummary.locationsServed}`);
    csvRows.push(`Coverage Area (km²),${data.impactSummary.coverageAreaKm2}`);
    csvRows.push(`Need Fulfillment Rate,${data.impactSummary.needFulfillmentRate}%`);
  }

  return csvRows.join('\n');
}

// Helper function to generate mock PDF content
function generatePDFMockContent(data: any): string {
  // This is a mock implementation. In a real scenario, you would use a PDF library
  // to generate actual PDF content. For this example, we return a text representation.
  return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
72 720 Td
(Donor Performance Report - ${data.donor.name}) Tj
0 -20 Td
(Performance Score: ${data.performanceMetrics.performanceScore}) Tj
0 -20 Td
(Beneficiaries Helped: ${data.performanceMetrics.beneficiariesHelped}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000104 00000 n 
0000000189 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
445
%%EOF`;
}