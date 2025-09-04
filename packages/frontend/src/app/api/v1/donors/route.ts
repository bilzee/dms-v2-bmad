import { NextRequest, NextResponse } from 'next/server';
import { 
  Donor, 
  DonorCommitment,
  DonorAchievement,
  ResponseType,
  DonorListResponse 
} from '@dms/shared';
import DatabaseService from '@/lib/services/DatabaseService';

// Mock data for development - would be replaced with actual database calls
const mockDonors: Donor[] = [
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
  {
    id: '3',
    name: 'Save the Children',
    organization: 'Save the Children International',
    email: 'nigeria@savethechildren.org',
    phone: '+234-803-234-5678',
    performanceScore: 92,
    commitments: [],
    achievements: [],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-08-25'),
  },
  {
    id: '4',
    name: 'UNICEF Nigeria',
    organization: 'United Nations Children\'s Fund',
    email: 'nigeria@unicef.org',
    phone: '+234-807-123-4567',
    performanceScore: 96,
    commitments: [],
    achievements: [],
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-08-22'),
  },
  {
    id: '5',
    name: 'World Food Programme',
    organization: 'WFP Nigeria',
    email: 'nigeria@wfp.org',
    phone: '+234-815-987-6543',
    performanceScore: 94,
    commitments: [],
    achievements: [],
    createdAt: new Date('2024-02-28'),
    updatedAt: new Date('2024-08-19'),
  }
];

const mockCommitments: DonorCommitment[] = [
  {
    id: 'c1',
    donorId: '1',
    donor: mockDonors[0],
    responseType: ResponseType.FOOD,
    quantity: 500,
    unit: 'kg',
    targetDate: new Date('2024-09-15'),
    status: 'PLANNED',
    createdAt: new Date('2024-08-20'),
    updatedAt: new Date('2024-08-20'),
  },
  {
    id: 'c2',
    donorId: '2',
    donor: mockDonors[1],
    responseType: ResponseType.WASH,
    quantity: 200,
    unit: 'units',
    targetDate: new Date('2024-09-10'),
    status: 'PLANNED',
    createdAt: new Date('2024-08-18'),
    updatedAt: new Date('2024-08-18'),
  },
  {
    id: 'c3',
    donorId: '3',
    donor: mockDonors[2],
    responseType: ResponseType.HEALTH,
    quantity: 100,
    unit: 'kits',
    targetDate: new Date('2024-09-20'),
    status: 'DELIVERED',
    createdAt: new Date('2024-08-10'),
    updatedAt: new Date('2024-08-25'),
  },
  {
    id: 'c4',
    donorId: '4',
    donor: mockDonors[3],
    responseType: ResponseType.SHELTER,
    quantity: 300,
    unit: 'tarpaulins',
    targetDate: new Date('2024-09-12'),
    status: 'PLANNED',
    createdAt: new Date('2024-08-22'),
    updatedAt: new Date('2024-08-22'),
  }
];

// Link commitments to donors for easier access - remove circular reference
mockDonors.forEach(donor => {
  donor.commitments = mockCommitments
    .filter(c => c.donorId === donor.id)
    .map(commitment => {
      // Remove circular reference - exclude donor property
      const { donor: _, ...commitmentWithoutDonor } = commitment;
      return commitmentWithoutDonor;
    });
});

// GET /api/v1/donors - List donors with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const searchTerm = searchParams.get('search') || '';
    const status = searchParams.get('status'); // active, inactive
    const organization = searchParams.get('organization');
    const resourceType = searchParams.get('resourceType') as ResponseType;

    // Get donors from database using DatabaseService
    let filteredDonors = await DatabaseService.getDonors();

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredDonors = filteredDonors.filter(donor =>
        (donor.name?.toLowerCase().includes(term)) ||
        (donor.organization?.toLowerCase().includes(term)) ||
        (donor.email?.toLowerCase().includes(term))
      );
    }

    // Status filter (active donors have recent commitments)
    if (status === 'active') {
      filteredDonors = filteredDonors.filter(donor => 
        donor.commitments?.some(c => c.status === 'PLANNED')
      );
    } else if (status === 'inactive') {
      filteredDonors = filteredDonors.filter(donor => 
        !donor.commitments?.some(c => c.status === 'PLANNED')
      );
    }

    // Organization filter
    if (organization) {
      const org = organization.toLowerCase();
      filteredDonors = filteredDonors.filter(donor =>
        donor.organization?.toLowerCase().includes(org)
      );
    }

    // Resource type filter
    if (resourceType) {
      filteredDonors = filteredDonors.filter(donor =>
        donor.commitments?.some(c => c.responseType === resourceType)
      );
    }

    // Apply sorting
    filteredDonors.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'organization':
          aValue = a.organization;
          bValue = b.organization;
          break;
        case 'performanceScore':
          aValue = a.performanceScore;
          bValue = b.performanceScore;
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const totalCount = filteredDonors.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedDonors = filteredDonors.slice(startIndex, endIndex);

    // Calculate stats
    const totalCommitments = mockCommitments.length;
    const pendingCommitments = mockCommitments.filter(c => c.status === 'PLANNED').length;
    const activeDonors = mockDonors.filter(d => 
      d.commitments.some(c => c.status === 'PLANNED')
    ).length;
    
    const byResourceType = Object.values(ResponseType).reduce((acc, type) => {
      acc[type] = mockCommitments.filter(c => c.responseType === type).length;
      return acc;
    }, {} as Record<ResponseType, number>);

    const response: DonorListResponse = {
      success: true,
      data: {
        donors: paginatedDonors,
        totalCount,
        pagination: {
          page,
          pageSize,
          totalPages,
          totalCount,
        },
        stats: {
          totalDonors: mockDonors.length,
          activeDonors,
          totalCommitments,
          pendingCommitments,
          byResourceType,
        },
      },
      message: `Found ${totalCount} donors`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch donors:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch donors',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// POST /api/v1/donors - Create new donor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.organization || !body.email) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        message: 'Name, organization, and email are required',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Check if donor already exists (by email)
    const existingDonor = mockDonors.find(d => d.email === body.email);
    if (existingDonor) {
      return NextResponse.json({
        success: false,
        error: 'Donor already exists',
        message: `A donor with email ${body.email} already exists`,
        timestamp: new Date().toISOString(),
      }, { status: 409 });
    }

    // In a real implementation, this would:
    // 1. Validate email format
    // 2. Save to database
    // 3. Send welcome notification
    // 4. Create audit trail entry

    const newDonor: Donor = {
      id: Date.now().toString(), // Mock ID generation
      name: body.name,
      organization: body.organization,
      email: body.email,
      phone: body.phone,
      performanceScore: 50, // Starting score
      commitments: [],
      achievements: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to mock data
    mockDonors.push(newDonor);

    return NextResponse.json({
      success: true,
      data: {
        donor: newDonor,
      },
      message: 'Donor created successfully',
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create donor:', error);
    
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
      error: 'Failed to create donor',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}