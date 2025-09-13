/**
 * Unified Role Interface Mapping
 * 
 * This file ensures identical interfaces regardless of authentication type
 * (superuser role-switched vs dedicated single-role users)
 */

export interface NavigationSection {
  name: string;
  items: NavigationItem[];
}

export interface NavigationItem {
  name: string;
  url: string;
  description?: string;
}

export interface FeatureCard {
  title: string;
  description: string;
  icon: any; // React component type
  actions: FeatureAction[];
  stats: { count: number; label: string };
  bgColor: string;
  borderColor: string;
  iconColor: string;
}

export interface FeatureAction {
  label: string;
  href: string;
  variant?: 'default' | 'outline' | 'ghost';
}

export interface RoleInterface {
  navigationSections: NavigationSection[];
  featureCards: FeatureCard[];
  permissions: string[];
}

// Import icons from the same place as page.tsx
import {
  ClipboardList, BarChart3, Building, UserCheck, Activity, 
  AlertTriangle, Heart, Award, CheckCircle
} from "lucide-react";

export const ROLE_INTERFACES: Record<string, RoleInterface> = {
  COORDINATOR: {
    navigationSections: [
      {
        name: 'Assessment Management',
        items: [
          { name: 'View All Assessments', url: '/assessments' },
          { name: 'Create New Assessment', url: '/assessments/new' },
          { name: 'Assessment Approvals', url: '/coordinator/assessments/review' }
        ]
      },
      {
        name: 'Verification Dashboard', 
        items: [
          { name: 'Verification Dashboard', url: '/coordinator/dashboard' },
          { name: 'Donor Coordination', url: '/coordinator/donors' },
          { name: 'System Monitoring', url: '/coordinator/monitoring' }
        ]
      },
      {
        name: 'Response Management',
        items: [
          { name: 'Plan New Response', url: '/responses/plan' },
          { name: 'Track Deliveries', url: '/responses/tracking' },
          { name: 'Response Approvals', url: '/coordinator/responses/review' }
        ]
      },
      {
        name: 'Incident Management',
        items: [
          { name: 'Manage Incidents', url: '/coordinator/incidents' },
          { name: 'Active Incidents', url: '/coordinator/incidents/active' }
        ]
      },
      {
        name: 'Donor Coordination',
        items: [
          { name: 'Donor Management', url: '/coordinator/donors' },
          { name: 'Resource Requests', url: '/coordinator/donors/requests' }
        ]
      },
      {
        name: 'System Configuration',
        items: [
          { name: 'Auto-Approval Config', url: '/coordinator/auto-approval' },
          { name: 'Priority Sync Config', url: '/queue' },
          { name: 'Conflict Resolution', url: '/coordinator/conflicts' }
        ]
      },
      {
        name: 'Monitoring Tools',
        items: [
          { name: 'Situation Display', url: '/monitoring' },
          { name: 'Interactive Map', url: '/monitoring/map' },
          { name: 'Performance Dashboard', url: '/coordinator/monitoring' }
        ]
      }
    ],
    featureCards: [
      {
        title: 'Assessments',
        description: 'Create and manage rapid assessments for disaster situations',
        icon: ClipboardList,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600',
        actions: [
          { label: 'View All Assessments', href: '/assessments' },
          { label: 'Create New Assessment', href: '/assessments/new', variant: 'outline' },
          { label: 'View Status Dashboard', href: '/assessments/status', variant: 'ghost' }
        ],
        stats: { count: 12, label: 'active' }
      },
      {
        title: 'Response Management',
        description: 'Plan responses and track delivery progress',
        icon: BarChart3,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        iconColor: 'text-green-600',
        actions: [
          { label: 'Plan New Response', href: '/responses/plan' },
          { label: 'Track Deliveries', href: '/responses/tracking', variant: 'outline' },
          { label: 'Planned to Actual', href: '/responses/conversion', variant: 'ghost' }
        ],
        stats: { count: 3, label: 'planned' }
      },
      {
        title: 'Entity Management',
        description: 'Manage affected entities, camps, and communities',
        icon: Building,
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        iconColor: 'text-orange-600',
        actions: [
          { label: 'View All Entities', href: '/entities' }
        ],
        stats: { count: 28, label: 'locations' }
      },
      {
        title: 'Coordinator Tools',
        description: 'Verification dashboard and approval management',
        icon: UserCheck,
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        iconColor: 'text-purple-600',
        actions: [
          { label: 'Verification Dashboard', href: '/coordinator/dashboard' },
          { label: 'Donor Coordination', href: '/coordinator/donors', variant: 'outline' },
          { label: 'System Monitoring', href: '/coordinator/monitoring', variant: 'outline' },
          { label: 'Assessment Approvals', href: '/coordinator/assessments/review', variant: 'ghost' },
          { label: 'Response Approvals', href: '/coordinator/responses/review', variant: 'ghost' }
        ],
        stats: { count: 8, label: 'pending review' }
      },
      {
        title: 'Monitoring Tools',
        description: 'Real-time monitoring and geographic visualization',
        icon: Activity,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600',
        actions: [
          { label: 'Situation Display', href: '/monitoring' },
          { label: 'Interactive Map', href: '/monitoring/map', variant: 'outline' }
        ],
        stats: { count: 4, label: 'active alerts' }
      },
      {
        title: 'Incident Management',
        description: 'Manage and track disaster incidents and responses',
        icon: AlertTriangle,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-600',
        actions: [
          { label: 'Manage Incidents', href: '/coordinator/incidents' }
        ],
        stats: { count: 0, label: 'active incidents' }
      },
      {
        title: 'System Configuration',
        description: 'Configure system settings and automation rules',
        icon: UserCheck,
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        iconColor: 'text-gray-600',
        actions: [
          { label: 'Auto-Approval Config', href: '/coordinator/auto-approval' },
          { label: 'Priority Sync Config', href: '/queue', variant: 'outline' },
          { label: 'Conflict Resolution', href: '/coordinator/conflicts', variant: 'ghost' }
        ],
        stats: { count: 3, label: 'configurations' }
      }
    ],
    permissions: [
      'assessments:read', 'assessments:write', 'assessments:approve',
      'responses:read', 'responses:write', 'responses:approve', 
      'entities:read', 'entities:write',
      'verification:read', 'verification:approve',
      'monitoring:read', 'incidents:manage', 'config:manage',
      'donations:view', 'users:manage'
    ]
  },

  DONOR: {
    navigationSections: [
      {
        name: 'Donation Management',
        items: [
          { name: 'My Commitments', url: '/donor/commitments' },
          { name: 'Performance Dashboard', url: '/donor/performance' },
          { name: 'Achievement Tracker', url: '/donor/achievements' }
        ]
      },
      {
        name: 'Resource Coordination',
        items: [
          { name: 'Available Requests', url: '/donor/requests' },
          { name: 'Active Deliveries', url: '/donor/deliveries' },
          { name: 'Planning Tools', url: '/donor/planning' }
        ]
      }
    ],
    featureCards: [
      {
        title: 'Donation Planning',
        description: 'Plan and manage your donation contributions',
        icon: Heart,
        bgColor: 'bg-pink-50',
        borderColor: 'border-pink-200',
        iconColor: 'text-pink-600',
        actions: [
          { label: 'Plan New Donation', href: '/donor/planning' },
          { label: 'View Commitments', href: '/donor/commitments', variant: 'outline' },
          { label: 'Track Performance', href: '/donor/performance', variant: 'ghost' }
        ],
        stats: { count: 2, label: 'active commitments' }
      },
      {
        title: 'Contribution Tracking',
        description: 'Monitor your donation impact and achievements',
        icon: Award,
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        iconColor: 'text-yellow-600',
        actions: [
          { label: 'View Achievements', href: '/dashboard/donor/achievements' },
          { label: 'Leaderboard', href: '/dashboard/donor/leaderboard', variant: 'outline' }
        ],
        stats: { count: 5, label: 'achievements unlocked' }
      },
      {
        title: 'Performance Metrics',
        description: 'Track your donation delivery performance and impact',
        icon: BarChart3,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600',
        actions: [
          { label: 'Performance Dashboard', href: '/donor/performance' },
          { label: 'Impact Report', href: '/donor/impact', variant: 'outline' }
        ],
        stats: { count: 85, label: '% score' }
      }
    ],
    permissions: [
      'donations:plan', 'donations:track', 'donations:view',
      'commitments:read', 'commitments:write',
      'achievements:read', 'performance:read'
    ]
  },

  ASSESSOR: {
    navigationSections: [
      {
        name: 'Assessment Management',
        items: [
          { name: 'My Assessments', url: '/assessments' },
          { name: 'Create Assessment', url: '/assessments/new' },
          { name: 'Draft Assessments', url: '/assessments/drafts' }
        ]
      },
      {
        name: 'Field Operations',
        items: [
          { name: 'Entity Management', url: '/entities' },
          { name: 'Quick Actions', url: '/assessments/quick' }
        ]
      }
    ],
    featureCards: [
      {
        title: 'Assessments',
        description: 'Create and manage rapid assessments for disaster situations',
        icon: ClipboardList,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600',
        actions: [
          { label: 'View All Assessments', href: '/assessments' },
          { label: 'Create New Assessment', href: '/assessments/new', variant: 'outline' },
          { label: 'View Status Dashboard', href: '/assessments/status', variant: 'ghost' }
        ],
        stats: { count: 12, label: 'active' }
      },
      {
        title: 'Entity Management',
        description: 'Manage affected entities, camps, and communities',
        icon: Building,
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        iconColor: 'text-orange-600',
        actions: [
          { label: 'View All Entities', href: '/entities' }
        ],
        stats: { count: 28, label: 'locations' }
      }
    ],
    permissions: [
      'assessments:read', 'assessments:write',
      'entities:read', 'entities:write'
    ]
  },

  RESPONDER: {
    navigationSections: [
      {
        name: 'Response Operations',
        items: [
          { name: 'My Responses', url: '/responses' },
          { name: 'Plan Response', url: '/responses/plan' },
          { name: 'Track Deliveries', url: '/responses/tracking' }
        ]
      }
    ],
    featureCards: [
      {
        title: 'Response Management',
        description: 'Plan responses and track delivery progress',
        icon: BarChart3,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        iconColor: 'text-green-600',
        actions: [
          { label: 'Plan New Response', href: '/responses/plan' },
          { label: 'Track Deliveries', href: '/responses/tracking', variant: 'outline' },
          { label: 'Planned to Actual', href: '/responses/conversion', variant: 'ghost' }
        ],
        stats: { count: 3, label: 'planned' }
      }
    ],
    permissions: [
      'responses:read', 'responses:write'
    ]
  },

  VERIFIER: {
    navigationSections: [
      {
        name: 'Verification Management',
        items: [
          { name: 'Verification Queue', url: '/verification/queue' },
          { name: 'Assessment Review', url: '/verification/assessments' },
          { name: 'Response Review', url: '/verification/responses' }
        ]
      },
      {
        name: 'Verification Dashboard',
        items: [
          { name: 'Dashboard', url: '/verification/dashboard' },
          { name: 'Approval History', url: '/verification/history' }
        ]
      }
    ],
    featureCards: [
      {
        title: 'Verification Management',
        description: 'Review and verify assessments and responses',
        icon: CheckCircle,
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-200',
        iconColor: 'text-teal-600',
        actions: [
          { label: 'Verification Queue', href: '/verification/queue' },
          { label: 'Assessment Review', href: '/verification/assessments', variant: 'outline' },
          { label: 'Response Review', href: '/verification/responses', variant: 'ghost' }
        ],
        stats: { count: 6, label: 'pending verification' }
      },
      {
        title: 'Verification Dashboard',
        description: 'Verification metrics and approval tracking',
        icon: BarChart3,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        iconColor: 'text-green-600',
        actions: [
          { label: 'Verification Dashboard', href: '/verification/dashboard' },
          { label: 'Approval History', href: '/verification/history', variant: 'outline' }
        ],
        stats: { count: 15, label: 'verified today' }
      }
    ],
    permissions: [
      'verification:read', 'verification:approve'
    ]
  },

  ADMIN: {
    navigationSections: [
      {
        name: 'System Administration',
        items: [
          { name: 'User Management', url: '/admin/users' },
          { name: 'Role Management', url: '/admin/roles' },
          { name: 'System Configuration', url: '/admin/config' }
        ]
      },
      {
        name: 'Monitoring & Analytics',
        items: [
          { name: 'System Monitoring', url: '/admin/monitoring' },
          { name: 'Analytics Dashboard', url: '/admin/analytics' }
        ]
      }
    ],
    featureCards: [
      {
        title: 'User Management',
        description: 'Manage system users and access control',
        icon: UserCheck,
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        iconColor: 'text-purple-600',
        actions: [
          { label: 'Manage Users', href: '/admin/users' },
          { label: 'Role Assignment', href: '/admin/roles', variant: 'outline' }
        ],
        stats: { count: 45, label: 'active users' }
      },
      {
        title: 'System Monitoring',
        description: 'Monitor system performance and health',
        icon: Activity,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600',
        actions: [
          { label: 'System Dashboard', href: '/admin/monitoring' },
          { label: 'Performance Metrics', href: '/admin/analytics', variant: 'outline' }
        ],
        stats: { count: 99, label: '% uptime' }
      }
    ],
    permissions: [
      'admin:read', 'admin:write', 'users:manage', 'roles:manage',
      'system:configure', 'monitoring:admin'
    ]
  }
};

/**
 * Get role interface for a specific role
 * This ensures identical functionality regardless of authentication type
 */
export function getRoleInterface(roleName: string): RoleInterface | null {
  return ROLE_INTERFACES[roleName] || null;
}

/**
 * Check if a user has access to a specific feature based on role interface
 * This replaces the previous permission-based filtering that was inconsistent
 */
export function hasFeatureAccess(roleName: string, featureTitle: string): boolean {
  const roleInterface = getRoleInterface(roleName);
  if (!roleInterface) return false;
  
  return roleInterface.featureCards.some(card => card.title === featureTitle);
}