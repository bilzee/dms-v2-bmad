/**
 * Unified Role Interface Mapping
 * 
 * Comprehensive role-based access control system with specialized,
 * non-overlapping access patterns for maximum efficiency and clear responsibility boundaries.
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
  badgeKey?: string; // Key for dynamic badge lookup
  badgeVariant?: 'default' | 'secondary' | 'destructive';
  requiredPermissions?: string[];
  description?: string;
}

export interface FeatureCard {
  title: string;
  description: string;
  icon: any; // React component type
  actions: FeatureAction[];
  stats: { 
    count: number; 
    label: string;
    countKey?: string; // Key for dynamic count lookup
    fallback?: number; // Fallback value when API unavailable
  };
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
  Home, Utensils, Shield, Users, Zap, Trophy, Settings, Archive, FileSearch
} from "lucide-react";

export const ROLE_INTERFACES: Record<string, RoleInterface> = {
  ASSESSOR: {
    navigationSections: [
      {
        title: 'Assessment Creation',
        items: [
          { 
            icon: 'Heart', 
            label: 'Health Assessment', 
            href: '/assessments/new?type=HEALTH', 
            badge: 3,
            badgeKey: 'pendingHealthAssessments',
            requiredPermissions: ['assessments:create'],
            description: 'Create health facility and medical needs assessments'
          },
          { 
            icon: 'Droplet', 
            label: 'WASH Assessment', 
            href: '/assessments/new?type=WASH', 
            badge: 1,
            badgeKey: 'pendingWashAssessments',
            requiredPermissions: ['assessments:create'],
            description: 'Water, sanitation, and hygiene assessments'
          },
          { 
            icon: 'Home', 
            label: 'Shelter Assessment', 
            href: '/assessments/new?type=SHELTER', 
            badge: 2,
            badgeKey: 'pendingShelterAssessments',
            requiredPermissions: ['assessments:create'],
            description: 'Shelter and accommodation facility assessments'
          },
          { 
            icon: 'Utensils', 
            label: 'Food Assessment', 
            href: '/assessments/new?type=FOOD', 
            badge: 0,
            badgeKey: 'pendingFoodAssessments',
            requiredPermissions: ['assessments:create'],
            description: 'Food security and nutrition assessments'
          },
          { 
            icon: 'Shield', 
            label: 'Security Assessment', 
            href: '/assessments/new?type=SECURITY', 
            badge: 1,
            badgeKey: 'pendingSecurityAssessments',
            requiredPermissions: ['assessments:create'],
            description: 'Security and protection assessments'
          },
          { 
            icon: 'Users', 
            label: 'Population Assessment', 
            href: '/assessments/new?type=POPULATION', 
            badge: 4,
            badgeKey: 'pendingPopulationAssessments',
            requiredPermissions: ['assessments:create'],
            description: 'Population demographics and vulnerability assessments'
          },
          { 
            icon: 'AlertTriangle', 
            label: 'Emergency Report', 
            href: '/assessments/new?type=PRELIMINARY', 
            requiredPermissions: ['assessments:create'],
            description: 'Quick emergency situation reports'
          }
        ]
      },
      {
        title: 'My Work',
        items: [
          { 
            icon: 'ClipboardList', 
            label: 'My Assessments', 
            href: '/assessments?filter=mine', 
            requiredPermissions: ['assessments:read'],
            description: 'Personal assessment tracking and management'
          },
          { 
            icon: 'Archive', 
            label: 'All Assessments', 
            href: '/assessments', 
            requiredPermissions: ['assessments:read'],
            description: 'View all assessments'
          },
          { 
            icon: 'Building', 
            label: 'Entities', 
            href: '/entities', 
            requiredPermissions: ['entities:read'],
            description: 'Entity management'
          }
        ]
      },
      {
        title: 'Field Operations',
        items: [
          { 
            icon: 'Zap', 
            label: 'Queue Status', 
            href: '/queue', 
            badge: 2,
            badgeKey: 'queueItems',
            requiredPermissions: ['queue:read'],
            description: 'Field connectivity and sync monitoring'
          },
          { 
            icon: 'CheckCircle', 
            label: 'Assessment Review', 
            href: '/verification/assessments', 
            badge: 5,
            badgeKey: 'assessmentQueue',
            requiredPermissions: ['verification:read'],
            description: 'Assessment verification and review'
          }
        ]
      }
    ],
    featureCards: [
      {
        title: 'My Assessments',
        description: 'Track and manage your field assessments',
        icon: 'ClipboardList',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600',
        actions: [
          { label: 'View My Assessments', href: '/assessments?filter=mine' },
          { label: 'Create New Assessment', href: '/assessments/new', variant: 'outline' },
          { label: 'View All Assessments', href: '/assessments', variant: 'ghost' }
        ],
        stats: { count: 8, label: 'active assessments', countKey: 'myAssessments', fallback: 8 }
      },
      {
        title: 'Field Operations',
        description: 'Queue management and assessment workflows',
        icon: 'Zap',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        iconColor: 'text-green-600',
        actions: [
          { label: 'Queue Status', href: '/queue' },
          { label: 'Assessment Review', href: '/verification/assessments', variant: 'outline' },
          { label: 'View Entities', href: '/entities', variant: 'ghost' }
        ],
        stats: { count: 7, label: 'pending items', countKey: 'queueItems', fallback: 7 }
      }
    ],
    permissions: [
      'assessments:read', 'assessments:write', 'assessments:create',
      'entities:read', 'entities:write',
      'queue:read'
    ]
  },

  COORDINATOR: {
    navigationSections: [
      {
        title: 'Coordination Hub',
        items: [
          { 
            icon: 'AlertTriangle', 
            label: 'Incident Management', 
            href: '/coordinator/incidents', 
            badge: 2,
            badgeKey: 'activeIncidents',
            badgeVariant: 'destructive',
            requiredPermissions: ['incidents:manage'],
            description: 'Central incident management and coordination'
          },
          { 
            icon: 'Building', 
            label: 'Resource Coordination', 
            href: '/coordinator/resources', 
            requiredPermissions: ['resources:coordinate'],
            description: 'Resource allocation and planning'
          },
          { 
            icon: 'HandHeart', 
            label: 'Donor Coordination', 
            href: '/coordinator/donors', 
            badge: 4,
            badgeKey: 'pendingDonorActivities',
            requiredPermissions: ['donors:coordinate'],
            description: 'Donor activity coordination and management'
          },
          { 
            icon: 'Settings', 
            label: 'Auto-Approval Rules', 
            href: '/coordinator/auto-approval', 
            requiredPermissions: ['config:manage'],
            description: 'Automated approval configuration'
          }
        ]
      },
      {
        title: 'Verification Oversight',
        items: [
          { 
            icon: 'CheckCircle', 
            label: 'Approval Dashboard', 
            href: '/coordinator/approvals', 
            requiredPermissions: ['verification:oversee'],
            description: 'High-level approval tracking'
          },
          { 
            icon: 'BarChart3', 
            label: 'Verification Metrics', 
            href: '/coordinator/verification-stats', 
            requiredPermissions: ['verification:oversee'],
            description: 'System-wide verification performance'
          }
        ]
      },
      {
        title: 'Monitoring',
        items: [
          { 
            icon: 'Activity', 
            label: 'Situation Display', 
            href: '/monitoring', 
            requiredPermissions: ['monitoring:read'],
            description: 'Real-time operational monitoring'
          },
          { 
            icon: 'MapPin', 
            label: 'Interactive Map', 
            href: '/monitoring/map', 
            requiredPermissions: ['monitoring:read'],
            description: 'Geographic visualization of entities, assessments, and responses'
          },
          { 
            icon: 'BarChart3', 
            label: 'Analytics Dashboard', 
            href: '/analytics-dashboard', 
            requiredPermissions: ['monitoring:read'],
            description: 'Advanced analytics interface'
          },
          { 
            icon: 'Search', 
            label: 'Drill-Down Analysis', 
            href: '/monitoring/drill-down', 
            requiredPermissions: ['monitoring:read'],
            description: 'Detailed data analysis and investigation'
          },
          { 
            icon: 'Monitor', 
            label: 'Coordinator Dashboard', 
            href: '/coordinator/monitoring', 
            requiredPermissions: ['monitoring:read'],
            description: 'Coordinator-specific monitoring view'
          }
        ]
      },
      {
        title: 'System Health',
        items: [
          { 
            icon: 'Archive', 
            label: 'Queue Overview', 
            href: '/coordinator/queue-overview', 
            requiredPermissions: ['queue:oversee'],
            description: 'System-wide queue monitoring'
          },
          { 
            icon: 'Zap', 
            label: 'Sync Status', 
            href: '/coordinator/sync-status', 
            requiredPermissions: ['sync:monitor'],
            description: 'Synchronization health monitoring'
          },
          { 
            icon: 'AlertTriangle', 
            label: 'System Alerts', 
            href: '/coordinator/alerts', 
            badge: 1,
            badgeKey: 'systemAlerts',
            badgeVariant: 'destructive',
            requiredPermissions: ['system:alerts'],
            description: 'System alerts and notifications'
          },
          { 
            icon: 'BarChart3', 
            label: 'Performance Summary', 
            href: '/coordinator/performance', 
            requiredPermissions: ['system:monitor'],
            description: 'Operational performance overview'
          }
        ]
      }
    ],
    featureCards: [
      {
        title: 'Incident Coordination',
        description: 'Central incident management and coordination',
        icon: 'AlertTriangle',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-600',
        actions: [
          { label: 'Manage Incidents', href: '/coordinator/incidents' },
          { label: 'Resource Coordination', href: '/coordinator/resources', variant: 'outline' },
          { label: 'Donor Coordination', href: '/coordinator/donors', variant: 'ghost' }
        ],
        stats: { count: 2, label: 'active incidents', countKey: 'activeIncidents', fallback: 2 }
      },
      {
        title: 'Monitoring & Analytics',
        description: 'Real-time monitoring and data analysis',
        icon: 'Activity',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-200',
        iconColor: 'text-teal-600',
        actions: [
          { label: 'Situation Display', href: '/monitoring' },
          { label: 'Interactive Map', href: '/monitoring/map', variant: 'outline' },
          { label: 'Analytics Dashboard', href: '/analytics-dashboard', variant: 'ghost' }
        ],
        stats: { count: 94, label: '% monitoring score', countKey: 'monitoringScore', fallback: 94 }
      },
      {
        title: 'Resource Management',
        description: 'Resource allocation and coordination oversight',
        icon: 'Building',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        iconColor: 'text-purple-600',
        actions: [
          { label: 'Resource Coordination', href: '/coordinator/resources' },
          { label: 'Resource Planning', href: '/coordinator/resource-planning', variant: 'outline' }
        ],
        stats: { count: 85, label: '% utilization', countKey: 'resourceUtilization', fallback: 85 }
      },
      {
        title: 'System Health',
        description: 'Operational system monitoring and health',
        icon: 'Activity',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600',
        actions: [
          { label: 'System Health', href: '/coordinator/performance' },
          { label: 'Queue Overview', href: '/coordinator/queue-overview', variant: 'outline' },
          { label: 'System Alerts', href: '/coordinator/alerts', variant: 'ghost' }
        ],
        stats: { count: 98, label: '% system health', countKey: 'systemHealth', fallback: 98 }
      }
    ],
    permissions: [
      'incidents:manage', 'resources:coordinate', 'donors:coordinate',
      'verification:oversee', 'monitoring:read', 'queue:oversee',
      'sync:monitor', 'system:alerts', 'system:monitor'
    ]
  },

  RESPONDER: {
    navigationSections: [
      {
        title: 'Response Operations',
        items: [
          { 
            icon: 'BarChart3', 
            label: 'Plan Response', 
            href: '/responses', 
            requiredPermissions: ['responses:plan'],
            description: 'Response planning interface'
          },
          { 
            icon: 'ClipboardList', 
            label: 'My Responses', 
            href: '/responses', 
            requiredPermissions: ['responses:read'],
            description: 'Personal response tracking'
          },
          { 
            icon: 'Truck', 
            label: 'Delivery Tracking', 
            href: '/responses/tracking', 
            requiredPermissions: ['responses:track'],
            description: 'Track delivery progress'
          }
        ]
      },
      {
        title: 'Workflow Management',
        items: [
          { 
            icon: 'ClipboardList', 
            label: 'Processing Queue', 
            href: '/queue', 
            badge: 2,
            badgeKey: 'queueItems',
            requiredPermissions: ['queue:read'],
            description: 'Processing and sync queue'
          },
          { 
            icon: 'CheckCircle', 
            label: 'Response Verification', 
            href: '/verification/responses', 
            badge: 3,
            badgeKey: 'responseQueue',
            requiredPermissions: ['verification:read'],
            description: 'Response verification queue'
          }
        ]
      },
      {
        title: 'Situational Awareness',
        items: [
          { 
            icon: 'ClipboardList', 
            label: 'Assessment Overview', 
            href: '/assessments', 
            requiredPermissions: ['assessments:read'],
            description: 'Summary view of relevant assessments'
          },
          { 
            icon: 'AlertTriangle', 
            label: 'Current Incidents', 
            href: '/incidents', 
            badge: 2,
            badgeKey: 'activeIncidents',
            requiredPermissions: ['incidents:read'],
            description: 'Active incident monitoring'
          }
        ]
      }
    ],
    featureCards: [
      {
        title: 'Response Operations',
        description: 'Plan and execute response operations',
        icon: 'BarChart3',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        iconColor: 'text-green-600',
        actions: [
          { label: 'Plan New Response', href: '/responses' },
          { label: 'Track My Responses', href: '/responses', variant: 'outline' },
          { label: 'Delivery Tracking', href: '/responses/tracking', variant: 'ghost' }
        ],
        stats: { count: 5, label: 'my active responses', countKey: 'myActiveResponses', fallback: 5 }
      },
      {
        title: 'Workflow Management',
        description: 'Processing queues and verification workflows',
        icon: 'ClipboardList',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600',
        actions: [
          { label: 'Processing Queue', href: '/queue' },
          { label: 'Response Verification', href: '/verification/responses', variant: 'outline' }
        ],
        stats: { count: 5, label: 'pending items', countKey: 'queueItems', fallback: 5 }
      },
      {
        title: 'Situational Awareness',
        description: 'Incident monitoring and assessment overview',
        icon: 'Activity',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        iconColor: 'text-purple-600',
        actions: [
          { label: 'Assessment Overview', href: '/assessments' },
          { label: 'Current Incidents', href: '/incidents', variant: 'outline' }
        ],
        stats: { count: 2, label: 'active incidents', countKey: 'activeIncidents', fallback: 2 }
      }
    ],
    permissions: [
      'responses:read', 'responses:write', 'responses:plan', 'responses:track',
      'incidents:read', 'assessments:read', 'monitoring:read', 'resources:read'
    ]
  },

  VERIFIER: {
    navigationSections: [
      {
        title: 'Verification Tasks',
        items: [
          { 
            icon: 'CheckCircle', 
            label: 'Assessment Verification', 
            href: '/verification/assessments', 
            badge: 5,
            badgeKey: 'assessmentQueue',
            requiredPermissions: ['verification:review'],
            description: 'Review and verify field assessments'
          },
          { 
            icon: 'BarChart3', 
            label: 'Response Verification', 
            href: '/verification/responses', 
            badge: 3,
            badgeKey: 'responseQueue',
            requiredPermissions: ['verification:review'],
            description: 'Review and verify response deliveries'
          },
          { 
            icon: 'ClipboardList', 
            label: 'Processing Queue', 
            href: '/queue', 
            badge: 2,
            badgeKey: 'queueItems',
            requiredPermissions: ['verification:review'],
            description: 'Processing and sync queue management'
          }
        ]
      },
      {
        title: 'Quality Control',
        items: [
          { 
            icon: 'FileSearch', 
            label: 'Quality Review', 
            href: '/verification/quality', 
            badge: 4,
            badgeKey: 'qualityQueue',
            requiredPermissions: ['verification:review'],
            description: 'Data quality and completeness review'
          },
          { 
            icon: 'Award', 
            label: 'Verification Reports', 
            href: '/verification/reports', 
            badge: 2,
            badgeKey: 'verificationReports',
            requiredPermissions: ['verification:review'],
            description: 'Review verification history and reports'
          }
        ]
      }
    ],
    featureCards: [],
    permissions: [
      'verification:read', 'verification:review', 'verification:approve', 'responses:verify'
    ]
  },

  ADMIN: {
    navigationSections: [
      {
        title: 'System Overview',
        items: [
          { 
            icon: 'BarChart3', 
            label: 'System Monitoring', 
            href: '/monitoring', 
            requiredPermissions: ['system:monitor'],
            description: 'System monitoring and analytics'
          },
          { 
            icon: 'MapPin', 
            label: 'Interactive Map', 
            href: '/monitoring/map', 
            requiredPermissions: ['monitoring:read'],
            description: 'Geographic system overview'
          }
        ]
      },
      {
        title: 'Data Management',
        items: [
          { 
            icon: 'ClipboardList', 
            label: 'All Assessments', 
            href: '/assessments', 
            requiredPermissions: ['assessments:read'],
            description: 'System-wide assessment management'
          },
          { 
            icon: 'BarChart3', 
            label: 'All Responses', 
            href: '/responses', 
            requiredPermissions: ['responses:read'],
            description: 'System-wide response management'
          },
          { 
            icon: 'MapPin', 
            label: 'Entity Management', 
            href: '/entities', 
            requiredPermissions: ['entities:manage'],
            description: 'Complete entity management'
          },
          { 
            icon: 'AlertTriangle', 
            label: 'Incident Management', 
            href: '/incidents', 
            requiredPermissions: ['incidents:manage'],
            description: 'System-wide incident management'
          }
        ]
      },
      {
        title: 'System Administration',
        items: [
          { 
            icon: 'ClipboardList', 
            label: 'Processing Queue', 
            href: '/queue', 
            requiredPermissions: ['queue:manage'],
            description: 'System queue management'
          }
        ]
      }
    ],
    featureCards: [
      {
        title: 'System Overview',
        description: 'Complete system monitoring and analytics',
        icon: 'BarChart3',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        iconColor: 'text-purple-600',
        actions: [
          { label: 'System Monitoring', href: '/monitoring' },
          { label: 'Interactive Map', href: '/monitoring/map', variant: 'outline' }
        ],
        stats: { count: 156, label: 'active users', countKey: 'activeUsers', fallback: 156 }
      },
      {
        title: 'Data Management',
        description: 'System-wide data administration',
        icon: 'Database',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        iconColor: 'text-gray-600',
        actions: [
          { label: 'All Assessments', href: '/assessments' },
          { label: 'All Responses', href: '/responses', variant: 'outline' },
          { label: 'Entity Management', href: '/entities', variant: 'ghost' }
        ],
        stats: { count: 23, label: 'active entities', countKey: 'activeEntities', fallback: 23 }
      },
      {
        title: 'System Administration',
        description: 'Queue management and system operations',
        icon: 'Settings',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600',
        actions: [
          { label: 'Processing Queue', href: '/queue' },
          { label: 'Incident Management', href: '/incidents', variant: 'outline' }
        ],
        stats: { count: 99.8, label: '% uptime', countKey: 'systemUptime', fallback: 99.8 }
      }
    ],
    permissions: [
      'users:manage', 'roles:manage', 'permissions:manage',
      'system:configure', 'config:manage', 'sync:configure',
      'system:monitor', 'audit:read', 'security:monitor', 'system:maintain'
    ]
  },

  DONOR: {
    navigationSections: [
      {
        title: 'My Contributions',
        items: [
          { 
            icon: 'BarChart3', 
            label: 'Donor Dashboard', 
            href: '/donor', 
            requiredPermissions: ['donations:plan'],
            description: 'Donation planning and commitment management'
          }
        ]
      }
    ],
    featureCards: [
      {
        title: 'Donation Management',
        description: 'Plan, track and manage donation commitments',
        icon: 'Heart',
        bgColor: 'bg-pink-50',
        borderColor: 'border-pink-200',
        iconColor: 'text-pink-600',
        actions: [
          { label: 'Donor Dashboard', href: '/donor' }
        ],
        stats: { count: 4, label: 'active commitments', countKey: 'activeCommitments', fallback: 4 }
      }
    ],
    permissions: [
      'donations:plan', 'donations:commit', 'donations:track',
      'impact:view', 'needs:view', 'opportunities:view',
      'achievements:read', 'performance:read', 'community:read'
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