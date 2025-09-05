import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

interface RoleInterface {
  roleId: string;
  roleName: 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN';
  navigation: {
    primaryMenuItems: string[];
    secondaryMenuItems?: string[];
    quickActions?: Array<{
      id: string;
      label: string;
      icon: string;
      action: string;
      requiredPermissions: string[];
    }>;
    hiddenSections?: string[];
    customOrder?: string[];
  };
  dashboard: {
    layout: 'single-column' | 'two-column' | 'three-column' | 'grid';
    widgets: Array<{
      id: string;
      type: 'chart' | 'table' | 'metric' | 'list' | 'map' | 'activity';
      title: string;
      dataSource: string;
      refreshable: boolean;
      minimizable: boolean;
      requiredPermissions: string[];
      position?: { x: number; y: number; w: number; h: number };
      priority?: number;
    }>;
    defaultFilters?: Record<string, any>;
    refreshInterval?: number;
    pinnedWidgets?: string[];
    hiddenWidgets?: string[];
  };
  forms: {
    conditionalFields: Record<string, string[]>;
    defaultValues: Record<string, any>;
    validationRules: Record<string, any>;
    fieldVisibility: Record<string, boolean>;
    fieldOrder?: Record<string, string[]>;
    requiredFields?: Record<string, string[]>;
  };
  preferences: Record<string, any>;
}

function getDefaultRoleInterface(roleId: string): RoleInterface {
  const roleName = roleId.split('_')[0] as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN';
  
  const baseInterface: RoleInterface = {
    roleId,
    roleName,
    navigation: {
      primaryMenuItems: [],
      quickActions: [],
      hiddenSections: [],
    },
    dashboard: {
      layout: 'two-column',
      widgets: [],
      refreshInterval: 30000,
      pinnedWidgets: [],
      hiddenWidgets: [],
    },
    forms: {
      conditionalFields: {},
      defaultValues: {},
      validationRules: {},
      fieldVisibility: {},
    },
    preferences: {},
  };

  switch (roleName) {
    case 'ASSESSOR':
      return {
        ...baseInterface,
        navigation: {
          primaryMenuItems: ['Assessment Types', 'Assessment Management'],
          quickActions: [
            { id: 'new-health-assessment', label: 'New Health Assessment', icon: 'Heart', action: '/assessments/new?type=HEALTH', requiredPermissions: ['assessments:create'] },
            { id: 'emergency-report', label: 'Emergency Report', icon: 'AlertTriangle', action: '/assessments/new?type=PRELIMINARY', requiredPermissions: ['assessments:create'] },
          ],
        },
        dashboard: {
          layout: 'three-column',
          widgets: [
            { id: 'active-assessments', type: 'metric', title: 'Active Assessments', dataSource: '/api/v1/assessments/active/count', refreshable: true, minimizable: false, requiredPermissions: ['assessments:read'], priority: 1 },
            { id: 'emergency-reports', type: 'metric', title: 'Emergency Reports', dataSource: '/api/v1/assessments/emergency/count', refreshable: true, minimizable: false, requiredPermissions: ['assessments:read'], priority: 2 },
            { id: 'entities-assessed', type: 'metric', title: 'Entities Assessed', dataSource: '/api/v1/entities/assessed/count', refreshable: true, minimizable: false, requiredPermissions: ['entities:read'], priority: 3 },
          ],
          refreshInterval: 15000,
        },
        forms: {
          conditionalFields: {
            'assessment': ['location', 'severity', 'notes'],
            'entity': ['coordinates', 'population', 'vulnerabilities'],
          },
          defaultValues: {
            'assessment.type': 'HEALTH',
            'assessment.priority': 'MEDIUM',
          },
          validationRules: {
            'assessment.severity': { min: 1, max: 5 },
            'entity.population': { min: 0 },
          },
          fieldVisibility: {
            'assessment.internal-notes': false,
            'entity.gps-coordinates': true,
          },
          fieldOrder: {
            'assessment': ['type', 'location', 'severity', 'description', 'notes'],
            'entity': ['name', 'coordinates', 'population', 'vulnerabilities'],
          },
          requiredFields: {
            'assessment': ['type', 'location', 'severity'],
            'entity': ['name', 'coordinates'],
          },
        },
      };

    case 'COORDINATOR':
      return {
        ...baseInterface,
        navigation: {
          primaryMenuItems: ['Verification Dashboard', 'Review Management', 'Incident Management', 'Donor Coordination', 'System Configuration', 'Monitoring Tools'],
          quickActions: [
            { id: 'verify-assessment', label: 'Verify Assessment', icon: 'CheckCircle', action: '/verification/queue', requiredPermissions: ['verification:read'] },
            { id: 'incident-response', label: 'Incident Response', icon: 'AlertTriangle', action: '/coordinator/incidents', requiredPermissions: ['incidents:manage'] },
          ],
        },
        dashboard: {
          layout: 'grid',
          widgets: [
            { id: 'verification-queue', type: 'metric', title: 'Verification Queue', dataSource: '/api/v1/verification/queue/count', refreshable: true, minimizable: false, requiredPermissions: ['verification:read'], priority: 1 },
            { id: 'active-incidents', type: 'metric', title: 'Active Incidents', dataSource: '/api/v1/incidents/active/count', refreshable: true, minimizable: false, requiredPermissions: ['incidents:manage'], priority: 2 },
            { id: 'donor-commitments', type: 'metric', title: 'Donor Commitments', dataSource: '/api/v1/donors/commitments/count', refreshable: true, minimizable: false, requiredPermissions: ['donors:coordinate'], priority: 3 },
            { id: 'system-conflicts', type: 'metric', title: 'System Conflicts', dataSource: '/api/v1/system/conflicts/count', refreshable: true, minimizable: false, requiredPermissions: ['conflicts:resolve'], priority: 4 },
          ],
          refreshInterval: 10000,
        },
        forms: {
          conditionalFields: {
            'verification': ['approval-notes', 'rejection-reason', 'priority-override'],
            'incident': ['severity', 'affected-areas', 'resource-requirements'],
          },
          defaultValues: {
            'verification.status': 'PENDING',
            'incident.priority': 'HIGH',
          },
          validationRules: {
            'verification.priority-override': { min: 1, max: 5 },
            'incident.severity': { min: 1, max: 5 },
          },
          fieldVisibility: {
            'verification.internal-comments': true,
            'incident.budget-estimates': true,
          },
          fieldOrder: {
            'verification': ['status', 'approval-notes', 'priority-override', 'rejection-reason'],
            'incident': ['title', 'severity', 'affected-areas', 'description', 'resource-requirements'],
          },
          requiredFields: {
            'verification': ['status'],
            'incident': ['title', 'severity', 'affected-areas'],
          },
        },
      };

    case 'RESPONDER':
      return {
        ...baseInterface,
        navigation: {
          primaryMenuItems: ['Response Planning', 'Delivery Management'],
          quickActions: [
            { id: 'plan-response', label: 'Plan Response', icon: 'FileText', action: '/responses/plan', requiredPermissions: ['responses:plan'] },
            { id: 'track-delivery', label: 'Track Delivery', icon: 'Truck', action: '/responses/status-review', requiredPermissions: ['responses:track'] },
          ],
        },
        dashboard: {
          layout: 'three-column',
          widgets: [
            { id: 'response-plans', type: 'metric', title: 'Response Plans', dataSource: '/api/v1/responses/plans/count', refreshable: true, minimizable: false, requiredPermissions: ['responses:read'], priority: 1 },
            { id: 'in-transit', type: 'metric', title: 'In Transit', dataSource: '/api/v1/responses/transit/count', refreshable: true, minimizable: false, requiredPermissions: ['responses:track'], priority: 2 },
            { id: 'completed-deliveries', type: 'metric', title: 'Completed Deliveries', dataSource: '/api/v1/responses/completed/count', refreshable: true, minimizable: false, requiredPermissions: ['responses:read'], priority: 3 },
          ],
          refreshInterval: 20000,
        },
        forms: {
          conditionalFields: {
            'response': ['delivery-method', 'timeline', 'resource-allocation'],
            'delivery': ['route', 'vehicle-type', 'contact-person'],
          },
          defaultValues: {
            'response.type': 'STANDARD',
            'delivery.priority': 'NORMAL',
          },
          validationRules: {
            'response.timeline': { min: 1 },
            'delivery.capacity': { min: 0 },
          },
          fieldVisibility: {
            'response.cost-estimates': false,
            'delivery.driver-notes': true,
          },
          fieldOrder: {
            'response': ['type', 'delivery-method', 'timeline', 'resource-allocation', 'notes'],
            'delivery': ['route', 'vehicle-type', 'contact-person', 'timeline'],
          },
          requiredFields: {
            'response': ['type', 'delivery-method', 'timeline'],
            'delivery': ['route', 'contact-person'],
          },
        },
      };

    case 'DONOR':
      return {
        ...baseInterface,
        navigation: {
          primaryMenuItems: ['Contribution Tracking'],
          quickActions: [
            { id: 'make-commitment', label: 'Make Commitment', icon: 'Plus', action: '/donor/commitments/new', requiredPermissions: ['donations:commit'] },
            { id: 'view-impact', label: 'View Impact', icon: 'BarChart3', action: '/donor/performance', requiredPermissions: ['donations:track'] },
          ],
        },
        dashboard: {
          layout: 'three-column',
          widgets: [
            { id: 'active-commitments', type: 'metric', title: 'Active Commitments', dataSource: '/api/v1/donations/active/count', refreshable: true, minimizable: false, requiredPermissions: ['donations:track'], priority: 1 },
            { id: 'delivery-progress', type: 'metric', title: 'Delivery Progress', dataSource: '/api/v1/donations/progress', refreshable: true, minimizable: false, requiredPermissions: ['donations:track'], priority: 2 },
            { id: 'impact-metrics', type: 'metric', title: 'Impact Metrics', dataSource: '/api/v1/donations/impact', refreshable: true, minimizable: false, requiredPermissions: ['donations:track'], priority: 3 },
          ],
          refreshInterval: 60000,
        },
        forms: {
          conditionalFields: {
            'commitment': ['amount', 'delivery-timeframe', 'conditions'],
          },
          defaultValues: {
            'commitment.type': 'MONETARY',
            'commitment.currency': 'USD',
          },
          validationRules: {
            'commitment.amount': { min: 0 },
            'commitment.delivery-timeframe': { min: 1 },
          },
          fieldVisibility: {
            'commitment.internal-tracking': false,
            'commitment.public-recognition': true,
          },
          fieldOrder: {
            'commitment': ['type', 'amount', 'currency', 'delivery-timeframe', 'conditions'],
          },
          requiredFields: {
            'commitment': ['type', 'amount', 'delivery-timeframe'],
          },
        },
      };

    case 'ADMIN':
      return {
        ...baseInterface,
        navigation: {
          primaryMenuItems: ['System Administration'],
          quickActions: [
            { id: 'user-management', label: 'User Management', icon: 'Users', action: '/admin/users', requiredPermissions: ['users:manage'] },
            { id: 'system-monitoring', label: 'System Monitoring', icon: 'Activity', action: '/admin/monitoring', requiredPermissions: ['system:monitor'] },
          ],
        },
        dashboard: {
          layout: 'grid',
          widgets: [
            { id: 'active-users', type: 'metric', title: 'Active Users', dataSource: '/api/v1/admin/users/active/count', refreshable: true, minimizable: false, requiredPermissions: ['users:view'], priority: 1 },
            { id: 'system-health', type: 'metric', title: 'System Health', dataSource: '/api/v1/admin/system/health', refreshable: true, minimizable: false, requiredPermissions: ['system:monitor'], priority: 2 },
            { id: 'security-events', type: 'metric', title: 'Security Events', dataSource: '/api/v1/admin/security/events/count', refreshable: true, minimizable: false, requiredPermissions: ['audit:read'], priority: 4 },
          ],
          refreshInterval: 5000,
        },
        forms: {
          conditionalFields: {
            'user': ['roles', 'permissions', 'status', 'notes'],
            'system': ['configuration', 'maintenance-mode', 'backup-schedule'],
          },
          defaultValues: {
            'user.status': 'ACTIVE',
            'system.maintenance-mode': false,
          },
          validationRules: {
            'user.email': { required: true },
            'system.backup-schedule': { min: 1 },
          },
          fieldVisibility: {
            'user.internal-notes': true,
            'system.debug-mode': true,
          },
          fieldOrder: {
            'user': ['email', 'name', 'roles', 'permissions', 'status', 'notes'],
            'system': ['configuration', 'maintenance-mode', 'backup-schedule'],
          },
          requiredFields: {
            'user': ['email', 'name', 'roles'],
            'system': ['configuration'],
          },
        },
      };

    default:
      return baseInterface;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { roleId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { roleId } = params;
    
    if (!roleId) {
      return NextResponse.json(
        { error: 'Role ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this role
    const userRoles = session.user.roles || [];
    const hasRoleAccess = userRoles.some((role: any) => 
      role.id === roleId || role.name === roleId.split('_')[0]
    );

    if (!hasRoleAccess) {
      return NextResponse.json(
        { error: 'Access denied for this role' },
        { status: 403 }
      );
    }

    // Get role interface configuration
    // In a real implementation, this would fetch from database
    // For now, return default configuration
    const roleInterface = getDefaultRoleInterface(roleId);

    // Add any stored user preferences
    // In production, fetch from user_role_preferences table
    const userPreferences = {}; // await getUserRolePreferences(session.user.id, roleId);
    
    const finalInterface = {
      ...roleInterface,
      preferences: {
        ...roleInterface.preferences,
        ...userPreferences,
      },
    };

    return NextResponse.json(finalInterface);
  } catch (error) {
    console.error('Error fetching role interface:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { roleId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { roleId } = params;
    const body = await request.json();

    if (!roleId) {
      return NextResponse.json(
        { error: 'Role ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this role
    const userRoles = session.user.roles || [];
    const hasRoleAccess = userRoles.some((role: any) => 
      role.id === roleId || role.name === roleId.split('_')[0]
    );

    if (!hasRoleAccess) {
      return NextResponse.json(
        { error: 'Access denied for this role' },
        { status: 403 }
      );
    }

    // Validate the interface configuration
    const requiredFields = ['navigation', 'dashboard', 'forms'];
    const missingFields = requiredFields.filter(field => !(field in body));
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // In production, save to database
    // await updateUserRoleInterface(session.user.id, roleId, body);

    return NextResponse.json({ 
      success: true, 
      message: 'Role interface updated successfully',
      roleId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating role interface:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}