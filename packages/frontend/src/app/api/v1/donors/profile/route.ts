import { NextRequest, NextResponse } from 'next/server';
import { Donor } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock donor profile data - would be replaced with actual database calls
const mockDonorProfiles: Donor[] = [
  {
    id: '1',
    name: 'ActionAid Nigeria',
    organization: 'ActionAid Nigeria',
    email: 'coordinator@actionaid.org.ng',
    phone: '+234-812-345-6789',
    performanceScore: 95,
    commitments: [],
    achievements: [],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-08-20'),
  },
  {
    id: '2',
    name: 'Oxfam International',
    organization: 'Oxfam',
    email: 'nigeria@oxfam.org',
    phone: '+234-809-876-5432',
    performanceScore: 88,
    commitments: [],
    achievements: [],
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-08-18'),
  },
];

// GET /api/v1/donors/profile - Get current donor profile
export async function GET(request: NextRequest) {
  try {
    // For now, return the first donor profile for testing
    // In production, this would integrate with proper authentication
    const donorProfile = mockDonorProfiles[0];
    
    if (!donorProfile) {
      return NextResponse.json({
        success: false,
        error: 'Donor profile not found',
        message: 'No donor profile found for current user',
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: donorProfile,
      },
      message: 'Donor profile retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch donor profile:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch donor profile',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// PUT /api/v1/donors/profile - Update donor profile
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // For now, update the first donor profile for testing
    // In production, this would integrate with proper authentication
    const donorIndex = 0;
    
    if (donorIndex >= mockDonorProfiles.length) {
      return NextResponse.json({
        success: false,
        error: 'Donor profile not found',
        message: 'No donor profile found for current user',
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    const existingProfile = mockDonorProfiles[donorIndex];
    const updates: Partial<Donor> = {};

    // Validate and prepare updates
    if (body.name !== undefined) {
      if (!body.name || body.name.length > 100) {
        return NextResponse.json({
          success: false,
          error: 'Invalid name',
          message: 'Name is required and cannot exceed 100 characters',
          timestamp: new Date().toISOString(),
        }, { status: 400 });
      }
      updates.name = body.name;
    }

    if (body.organization !== undefined) {
      if (!body.organization || body.organization.length > 100) {
        return NextResponse.json({
          success: false,
          error: 'Invalid organization',
          message: 'Organization is required and cannot exceed 100 characters',
          timestamp: new Date().toISOString(),
        }, { status: 400 });
      }
      updates.organization = body.organization;
    }

    if (body.phone !== undefined) {
      if (body.phone && (body.phone.length < 10 || body.phone.length > 20)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid phone number',
          message: 'Phone number must be between 10 and 20 characters',
          timestamp: new Date().toISOString(),
        }, { status: 400 });
      }
      updates.phone = body.phone;
    }

    // Email updates would require additional verification in a real system
    if (body.email !== undefined && body.email !== existingProfile.email) {
      return NextResponse.json({
        success: false,
        error: 'Email updates not allowed',
        message: 'Email address cannot be changed through this endpoint',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Update profile
    const updatedProfile = {
      ...existingProfile,
      ...updates,
      updatedAt: new Date(),
    };

    mockDonorProfiles[donorIndex] = updatedProfile;

    return NextResponse.json({
      success: true,
      data: {
        profile: updatedProfile,
      },
      message: 'Donor profile updated successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to update donor profile:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body',
        message: 'Please check your request format',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update donor profile',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}