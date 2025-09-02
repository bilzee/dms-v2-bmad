import { useMemo, useCallback } from 'react';
import { useRoleContext } from '@/components/providers/RoleContextProvider';

interface NavigationItem {
  icon: any;
  label: string;
  href: string;
  badge: number;
  badgeVariant?: 'default' | 'secondary' | 'destructive';
  requiredPermissions?: string[];
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
  roleRestriction?: string[];
}

interface UseRoleNavigationReturn {
  navigationSections: NavigationSection[];
  currentRole: string;
  isAuthorizedForRoute: (route: string) => boolean;
  getFilteredNavigation: () => NavigationSection[];
  hasAccessToSection: (sectionTitle: string) => boolean;
}

export const useRoleNavigation = (): UseRoleNavigationReturn => {
  const { activeRole, permissions, hasPermission } = useRoleContext();
  
  const currentRole = activeRole?.name || 'ASSESSOR';

  const baseNavigationSections: NavigationSection[] = useMemo(() => [
    {
      title: 'Assessment Types',
      roleRestriction: ['ASSESSOR'],
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
      roleRestriction: ['ASSESSOR', 'COORDINATOR'],
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
      roleRestriction: ['COORDINATOR'],
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
      roleRestriction: ['COORDINATOR'],
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
      roleRestriction: ['COORDINATOR'],
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
      roleRestriction: ['COORDINATOR'],
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
      roleRestriction: ['COORDINATOR', 'ADMIN'],
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
      roleRestriction: ['COORDINATOR', 'ADMIN'],
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
    },
    {
      title: 'Response Planning',
      roleRestriction: ['RESPONDER'],
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
      roleRestriction: ['RESPONDER'],
      items: [
        { 
          icon: 'Archive', 
          label: 'All Responses', 
          href: '/responses', 
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
    },
    {
      title: 'Contribution Tracking',
      roleRestriction: ['DONOR'],
      items: [
        { 
          icon: 'BarChart3', 
          label: 'Donation Planning', 
          href: '/donor/planning', 
          badge: 0,
          requiredPermissions: ['donations:plan']
        },
        { 
          icon: 'ClipboardList', 
          label: 'Commitments', 
          href: '/donor/commitments', 
          badge: 1,
          requiredPermissions: ['donations:commit']
        },
        { 
          icon: 'Archive', 
          label: 'Performance', 
          href: '/donor/performance', 
          badge: 0,
          requiredPermissions: ['donations:track']
        }
      ]
    },
    {
      title: 'System Administration',
      roleRestriction: ['ADMIN'],
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
    }
  ], []);

  const getFilteredNavigation = useCallback((): NavigationSection[] => {
    return baseNavigationSections
      .filter(section => 
        !section.roleRestriction || 
        section.roleRestriction.includes(currentRole)
      )
      .map(section => ({
        ...section,
        items: section.items.filter(item => {
          if (!item.requiredPermissions) return true;
          return item.requiredPermissions.every(permission => {
            const [resource, action] = permission.split(':');
            return hasPermission(resource, action);
          });
        })
      }))
      .filter(section => section.items.length > 0);
  }, [baseNavigationSections, currentRole, hasPermission]);

  const navigationSections = useMemo(() => getFilteredNavigation(), [getFilteredNavigation]);

  const isAuthorizedForRoute = useCallback((route: string): boolean => {
    const matchingItem = baseNavigationSections
      .flatMap(section => section.items)
      .find(item => item.href === route);
    
    if (!matchingItem) return true;
    
    const sectionForItem = baseNavigationSections.find(section => 
      section.items.some(item => item.href === route)
    );
    
    if (sectionForItem?.roleRestriction && 
        !sectionForItem.roleRestriction.includes(currentRole)) {
      return false;
    }
    
    if (matchingItem.requiredPermissions) {
      return matchingItem.requiredPermissions.every(permission => {
        const [resource, action] = permission.split(':');
        return hasPermission(resource, action);
      });
    }
    
    return true;
  }, [baseNavigationSections, currentRole, hasPermission]);

  const hasAccessToSection = useCallback((sectionTitle: string): boolean => {
    const section = baseNavigationSections.find(s => s.title === sectionTitle);
    if (!section) return false;
    
    if (section.roleRestriction && !section.roleRestriction.includes(currentRole)) {
      return false;
    }
    
    return section.items.some(item => {
      if (!item.requiredPermissions) return true;
      return item.requiredPermissions.every(permission => {
        const [resource, action] = permission.split(':');
        return hasPermission(resource, action);
      });
    });
  }, [baseNavigationSections, currentRole, hasPermission]);

  return {
    navigationSections,
    currentRole,
    isAuthorizedForRoute,
    getFilteredNavigation,
    hasAccessToSection,
  };
};