import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

interface ExportRequest {
  data: {
    response: any;
    assessment?: any;
    verificationData: any;
    timestamp: string;
    verifier: string;
  };
  format: 'pdf' | 'excel' | 'csv';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const responseId = params.id;
    const body: ExportRequest = await request.json();
    
    if (!body.data || !body.format) {
      return NextResponse.json(
        { error: 'Missing required fields: data, format' }, 
        { status: 400 }
      );
    }

    const { data, format } = body;
    
    // Generate export content based on format
    let content: string;
    let mimeType: string;
    let fileExtension: string;

    switch (format) {
      case 'csv':
        content = generateCSVReport(data);
        mimeType = 'text/csv';
        fileExtension = 'csv';
        break;
      case 'excel':
        // In a real implementation, you'd use a library like ExcelJS
        content = generateExcelReport(data);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExtension = 'xlsx';
        break;
      case 'pdf':
        // In a real implementation, you'd use a library like PDFKit or Puppeteer
        content = generatePDFReport(data);
        mimeType = 'application/pdf';
        fileExtension = 'pdf';
        break;
      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }

    // Create response with file
    const blob = new Blob([content], { type: mimeType });
    const buffer = Buffer.from(await blob.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="response-verification-${responseId}.${fileExtension}"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error exporting verification report:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Helper functions for generating different report formats
function generateCSVReport(data: any): string {
  const { response, assessment, verificationData, timestamp, verifier } = data;
  
  const csvRows = [
    ['Response Verification Report'],
    ['Generated', new Date(timestamp).toLocaleString()],
    ['Verified By', verifier],
    [''],
    ['Response Details'],
    ['Response ID', response.id],
    ['Response Type', response.responseType],
    ['Status', response.status],
    ['Planned Date', new Date(response.plannedDate).toLocaleString()],
    ['Delivered Date', response.deliveredDate ? new Date(response.deliveredDate).toLocaleString() : 'Not delivered'],
    ['Responder', response.responderName],
    ['Donor', response.donorName || 'N/A'],
    [''],
    ['Verification Status'],
    ['Photos Verified', verificationData.photosVerified ? 'Yes' : 'No'],
    ['Metrics Verified', verificationData.metricsVerified ? 'Yes' : 'No'],
    ['Accountability Verified', verificationData.accountabilityVerified ? 'Yes' : 'No'],
    [''],
    ['Verification Notes'],
    [verificationData.verifierNotes || 'No notes provided'],
  ];

  if (assessment) {
    csvRows.push(
      [''],
      ['Related Assessment'],
      ['Assessment ID', assessment.id],
      ['Assessment Type', assessment.type],
      ['Assessor', assessment.assessorName],
      ['Assessment Date', new Date(assessment.date).toLocaleString()]
    );
  }

  return csvRows.map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');
}

function generateExcelReport(data: any): string {
  // This is a simplified version. In production, use ExcelJS or similar library
  // For now, return CSV content with Excel MIME type
  return generateCSVReport(data);
}

function generatePDFReport(data: any): string {
  // This is a simplified version. In production, use PDFKit, Puppeteer, or similar
  const { response, assessment, verificationData, timestamp, verifier } = data;
  
  const pdfContent = `
RESPONSE VERIFICATION REPORT

Generated: ${new Date(timestamp).toLocaleString()}
Verified By: ${verifier}

=====================================
RESPONSE DETAILS
=====================================
Response ID: ${response.id}
Response Type: ${response.responseType}
Status: ${response.status}
Planned Date: ${new Date(response.plannedDate).toLocaleString()}
Delivered Date: ${response.deliveredDate ? new Date(response.deliveredDate).toLocaleString() : 'Not delivered'}
Responder: ${response.responderName}
Donor: ${response.donorName || 'N/A'}

=====================================
VERIFICATION STATUS
=====================================
Photos Verified: ${verificationData.photosVerified ? 'Yes' : 'No'}
Metrics Verified: ${verificationData.metricsVerified ? 'Yes' : 'No'}
Accountability Verified: ${verificationData.accountabilityVerified ? 'Yes' : 'No'}

=====================================
VERIFICATION NOTES
=====================================
${verificationData.verifierNotes || 'No notes provided'}

${assessment ? `
=====================================
RELATED ASSESSMENT
=====================================
Assessment ID: ${assessment.id}
Assessment Type: ${assessment.type}
Assessor: ${assessment.assessorName}
Assessment Date: ${new Date(assessment.date).toLocaleString()}
` : ''}

Report generated by DMS Response Verification System
`;

  return pdfContent;
}