import { useMemo, useCallback } from 'react';
import { useRoleContext } from '@/components/providers/RoleContextProvider';
import { getRoleInterface } from '@/lib/role-interfaces';
import { useSession } from 'next-auth/react';

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
  const { data: session } = useSession();
  
  // Use same role resolution as feature cards for consistency
  const currentRole = activeRole?.name || session?.user?.role || session?.user?.activeRole?.name || 'ASSESSOR';

  // Get navigation from unified role interface system
  const roleInterface = getRoleInterface(currentRole);
  const baseNavigationSections: NavigationSection[] = useMemo(() => 
    roleInterface?.navigationSections || [], [currentRole]);

  const getFilteredNavigation = useCallback((): NavigationSection[] => {
    // Remove legacy filtering - let ROLE_INTERFACES handle all role-specific logic
    return baseNavigationSections
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
  }, [baseNavigationSections, hasPermission]);

  const navigationSections = useMemo(() => getFilteredNavigation(), [getFilteredNavigation]);

  const isAuthorizedForRoute = useCallback((route: string): boolean => {
    const matchingItem = baseNavigationSections
      .flatMap(section => section.items)
      .find(item => item.href === route);
    
    if (!matchingItem) return true;
    
    const sectionForItem = baseNavigationSections.find(section => 
      section.items.some(item => item.href === route)
    );
    
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
    
    return section.items.some(item => {
      if (!item.requiredPermissions) return true;
      return item.requiredPermissions.every(permission => {
        const [resource, action] = permission.split(':');
        return hasPermission(resource, action);
      });
    });
  }, [baseNavigationSections, hasPermission]);

  return {
    navigationSections,
    currentRole,
    isAuthorizedForRoute,
    getFilteredNavigation,
    hasAccessToSection,
  };
};