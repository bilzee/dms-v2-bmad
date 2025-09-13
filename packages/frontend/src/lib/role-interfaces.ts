/**
 * Unified Role Interface Mapping
 * 
 * This file ensures identical interfaces regardless of authentication type
 * (superuser role-switched vs dedicated single-role users)
 */

export interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

export interface NavigationItem {
  icon: string;
  label: string;
  href: string;
  badge?: number;
  badgeVariant?: 'default' | 'secondary' | 'destructive';
  requiredPermissions?: string[];
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
  AlertTriangle, Heart, Award, CheckCircle, HandHeart, Droplet,
  Home, Utensils, Shield, Users, Zap, Trophy, Settings, Archive
} from "lucide-react";

export const ROLE_INTERFACES: Record<string, RoleInterface> = {
  COORDINATOR: {
    navigationSections: [
      {
        title: 'Assessment Management',
        items: [
          { 
            icon: 'ClipboardList', 
            label: 'All Assessments', 
            href: '/assessments', 
            badge: 0,
            requiredPermissions: ['assessments:read']
          },
          { 
            icon: 'AlertTriangle', 
            label: 'Emergency Reports', 
            href: '/assessments/new?type=PRELIMINARY', 
            badge: 0,
            requiredPermissions: ['assessments:create']
          },
          { 
            icon: 'Archive', 
            label: 'Assessment Status', 
            href: '/assessments/status', 
            badge: 0,
            requiredPermissions: ['assessments:read']
          },
          { 
            icon: 'Building', 
            label: 'Affected Entities', 
            href: '/entities', 
            badge: 0,
            requiredPermissions: ['entities:read']
          },
          { 
            icon: 'Archive', 
            label: 'Sync Queue', 
            href: '/queue', 
            badge: 0,
            requiredPermissions: ['queue:read']
          }
        ]
      },
      {
        title: 'Verification Dashboard',
        items: [
          { 
            icon: 'ClipboardList', 
            label: 'Assessment Queue', 
            href: '/verification/queue', 
            badge: 5,
            requiredPermissions: ['verification:read']
          },
          { 
            icon: 'BarChart3', 
            label: 'Response Queue', 
            href: '/verification/responses/queue', 
            badge: 3,
            requiredPermissions: ['verification:read']
          },
          { 
            icon: 'AlertTriangle', 
            label: 'Verification Dashboard', 
            href: '/verification/dashboard', 
            badge: 0,
            requiredPermissions: ['verification:read']
          }
        ]
      },
      {
        title: 'Review Management',
        items: [
          { 
            icon: 'ClipboardList', 
            label: 'Assessment Reviews', 
            href: '/verification/assessments', 
            badge: 2,
            requiredPermissions: ['verification:approve']
          },
          { 
            icon: 'BarChart3', 
            label: 'Response Reviews', 
            href: '/responses/status-review', 
            badge: 1,
            requiredPermissions: ['responses:review']
          },
          { 
            icon: 'AlertTriangle', 
            label: 'All Responses', 
            href: '/verification/responses', 
            badge: 0,
            requiredPermissions: ['responses:read']
          }
        ]
      },
      {
        title: 'Incident Management',
        items: [
          { 
            icon: 'AlertTriangle', 
            label: 'Incident Management', 
            href: '/coordinator/incidents', 
            badge: 4, 
            badgeVariant: 'destructive',
            requiredPermissions: ['incidents:manage']
          }
        ]
      },
      {
        title: 'Donor Coordination',
        items: [
          { 
            icon: 'HandHeart', 
            label: 'Donor Dashboard', 
            href: '/coordinator/donors', 
            badge: 2,
            requiredPermissions: ['donors:coordinate']
          },
          { 
            icon: 'Users', 
            label: 'Resource Planning', 
            href: '/coordinator/donors?tab=resources', 
            badge: 1,
            requiredPermissions: ['resources:plan']
          },
          { 
            icon: 'AlertTriangle', 
            label: 'Coordination Workspace', 
            href: '/coordinator/donors?tab=workspace', 
            badge: 3, 
            badgeVariant: 'destructive',
            requiredPermissions: ['donors:coordinate']
          }
        ]
      },
      {
        title: 'System Configuration',
        items: [
          { 
            icon: 'Zap', 
            label: 'Auto-Approval Config', 
            href: '/coordinator/auto-approval', 
            badge: 0,
            requiredPermissions: ['config:manage']
          },
          { 
            icon: 'BarChart3', 
            label: 'Priority Sync Config', 
            href: '/coordinator/priority-sync', 
            badge: 0,
            requiredPermissions: ['sync:configure']
          },
          { 
            icon: 'AlertTriangle', 
            label: 'Conflict Resolution', 
            href: '/coordinator/conflicts', 
            badge: 3, 
            badgeVariant: 'destructive',
            requiredPermissions: ['conflicts:resolve']
          }
        ]
      },
      {
        title: 'Monitoring Tools',
        items: [
          { 
            icon: 'BarChart3', 
            label: 'Situation Display', 
            href: '/monitoring', 
            badge: 0,
            requiredPermissions: ['monitoring:read']
          },
          { 
            icon: 'ClipboardList', 
            label: 'Interactive Map', 
            href: '/monitoring/map', 
            badge: 0,
            requiredPermissions: ['monitoring:read']
          }
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
        title: 'Contribution Tracking',
        items: [
          { 
            icon: 'BarChart3', 
            label: 'Donation Planning', 
            href: '/donor?tab=new-commitment', 
            badge: 0,
            requiredPermissions: ['donations:plan']
          },
          { 
            icon: 'ClipboardList', 
            label: 'Commitments', 
            href: '/donor?tab=commitments', 
            badge: 1,
            requiredPermissions: ['donations:commit']
          },
          { 
            icon: 'Archive', 
            label: 'Performance', 
            href: '/donor/performance', 
            badge: 0,
            requiredPermissions: ['donations:track']
          },
          { 
            icon: 'Award', 
            label: 'Achievements', 
            href: '/donor/achievements', 
            badge: 0,
            requiredPermissions: ['donations:track']
          },
          { 
            icon: 'Trophy', 
            label: 'Leaderboard', 
            href: '/donor/leaderboard', 
            badge: 0,
            requiredPermissions: ['donations:track']
          }
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
          { label: 'Plan New Donation', href: '/donor?tab=new-commitment' },
          { label: 'View Commitments', href: '/donor?tab=commitments', variant: 'outline' },
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
          { label: 'View Achievements', href: '/donor/achievements' },
          { label: 'Leaderboard', href: '/donor/leaderboard', variant: 'outline' }
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
          { label: 'Impact Report', href: '/donor/performance', variant: 'outline' }
        ],
        stats: { count: 85, label: '% score' }
      }
    ],
    permissions: [
      'donations:plan', 'donations:commit', 'donations:track', 'donations:view',
      'commitments:read', 'commitments:write',
      'achievements:read', 'performance:read'
    ]
  },

  ASSESSOR: {
    navigationSections: [
      {
        title: 'Assessment Types',
        items: [
          { 
            icon: 'Heart', 
            label: 'Health', 
            href: '/assessments/new?type=HEALTH', 
            badge: 3,
            requiredPermissions: ['assessments:create']
          },
          { 
            icon: 'Droplet', 
            label: 'WASH', 
            href: '/assessments/new?type=WASH', 
            badge: 1,
            requiredPermissions: ['assessments:create']
          },
          { 
            icon: 'Home', 
            label: 'Shelter', 
            href: '/assessments/new?type=SHELTER', 
            badge: 2,
            requiredPermissions: ['assessments:create']
          },
          { 
            icon: 'Utensils', 
            label: 'Food', 
            href: '/assessments/new?type=FOOD', 
            badge: 0,
            requiredPermissions: ['assessments:create']
          },
          { 
            icon: 'Shield', 
            label: 'Security', 
            href: '/assessments/new?type=SECURITY', 
            badge: 1,
            requiredPermissions: ['assessments:create']
          },
          { 
            icon: 'Users', 
            label: 'Population', 
            href: '/assessments/new?type=POPULATION', 
            badge: 4,
            requiredPermissions: ['assessments:create']
          }
        ]
      },
      {
        title: 'Assessment Management',
        items: [
          { 
            icon: 'ClipboardList', 
            label: 'All Assessments', 
            href: '/assessments', 
            badge: 0,
            requiredPermissions: ['assessments:read']
          },
          { 
            icon: 'AlertTriangle', 
            label: 'Emergency Reports', 
            href: '/assessments/new?type=PRELIMINARY', 
            badge: 0,
            requiredPermissions: ['assessments:create']
          },
          { 
            icon: 'Archive', 
            label: 'Assessment Status', 
            href: '/assessments/status', 
            badge: 0,
            requiredPermissions: ['assessments:read']
          },
          { 
            icon: 'Building', 
            label: 'Affected Entities', 
            href: '/entities', 
            badge: 0,
            requiredPermissions: ['entities:read']
          },
          { 
            icon: 'Archive', 
            label: 'Sync Queue', 
            href: '/queue', 
            badge: 0,
            requiredPermissions: ['queue:read']
          }
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
        title: 'Response Planning',
        items: [
          { 
            icon: 'BarChart3', 
            label: 'Plan Response', 
            href: '/responses/plan', 
            badge: 0,
            requiredPermissions: ['responses:plan']
          },
          { 
            icon: 'ClipboardList', 
            label: 'Status Review', 
            href: '/responses/status-review', 
            badge: 2,
            requiredPermissions: ['responses:review']
          }
        ]
      },
      {
        title: 'Delivery Management',
        items: [
          { 
            icon: 'Archive', 
            label: 'All Responses', 
            href: '/responses/status-review', 
            badge: 1,
            requiredPermissions: ['responses:read']
          },
          { 
            icon: 'ClipboardList', 
            label: 'Response Tracking', 
            href: '/responses/status-review', 
            badge: 0,
            requiredPermissions: ['responses:track']
          }
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
          { label: 'Track Deliveries', href: '/responses/status-review', variant: 'outline' },
          { label: 'Status Review', href: '/responses/status-review', variant: 'ghost' }
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
        title: 'Verification Management',
        items: [
          { 
            icon: 'CheckCircle', 
            label: 'Verification Queue', 
            href: '/verification/queue', 
            badge: 3,
            requiredPermissions: ['verification:review']
          },
          { 
            icon: 'ClipboardList', 
            label: 'Assessment Verification', 
            href: '/verification', 
            badge: 2,
            requiredPermissions: ['verification:approve']
          },
          { 
            icon: 'BarChart3', 
            label: 'Response Verification', 
            href: '/verification/responses', 
            badge: 1,
            requiredPermissions: ['responses:verify']
          },
          { 
            icon: 'Archive', 
            label: 'Verification Dashboard', 
            href: '/verification', 
            badge: 0,
            requiredPermissions: ['verification:read']
          }
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
          { label: 'Assessment Review', href: '/verification', variant: 'outline' },
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
          { label: 'Verification Dashboard', href: '/verification' },
          { label: 'Approval History', href: '/verification', variant: 'outline' }
        ],
        stats: { count: 15, label: 'verified today' }
      }
    ],
    permissions: [
      'verification:read', 'verification:review', 'verification:approve', 'responses:verify'
    ]
  },

  ADMIN: {
    navigationSections: [
      {
        title: 'System Administration',
        items: [
          { 
            icon: 'Settings', 
            label: 'User Management', 
            href: '/admin/users', 
            badge: 0,
            requiredPermissions: ['users:manage']
          },
          { 
            icon: 'Shield', 
            label: 'Role Management', 
            href: '/admin/roles', 
            badge: 0,
            requiredPermissions: ['roles:manage']
          },
          { 
            icon: 'BarChart3', 
            label: 'System Monitoring', 
            href: '/admin/monitoring', 
            badge: 0,
            requiredPermissions: ['system:monitor']
          },
          { 
            icon: 'Archive', 
            label: 'Audit Logs', 
            href: '/admin/audit', 
            badge: 0,
            requiredPermissions: ['audit:read']
          }
        ]
      },
      {
        title: 'System Configuration',
        items: [
          { 
            icon: 'Zap', 
            label: 'Auto-Approval Config', 
            href: '/coordinator/auto-approval', 
            badge: 0,
            requiredPermissions: ['config:manage']
          },
          { 
            icon: 'BarChart3', 
            label: 'Priority Sync Config', 
            href: '/coordinator/priority-sync', 
            badge: 0,
            requiredPermissions: ['sync:configure']
          },
          { 
            icon: 'AlertTriangle', 
            label: 'Conflict Resolution', 
            href: '/coordinator/conflicts', 
            badge: 3, 
            badgeVariant: 'destructive',
            requiredPermissions: ['conflicts:resolve']
          }
        ]
      },
      {
        title: 'Monitoring Tools',
        items: [
          { 
            icon: 'BarChart3', 
            label: 'Situation Display', 
            href: '/monitoring', 
            badge: 0,
            requiredPermissions: ['monitoring:read']
          },
          { 
            icon: 'ClipboardList', 
            label: 'Interactive Map', 
            href: '/monitoring/map', 
            badge: 0,
            requiredPermissions: ['monitoring:read']
          }
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