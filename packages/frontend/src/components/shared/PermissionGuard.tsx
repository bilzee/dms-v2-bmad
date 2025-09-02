'use client'

import { ReactNode } from 'react';
import { useRoleContext } from '@/components/providers/RoleContextProvider';
import { useRoleInterface } from '@/hooks/useRoleInterface';

interface PermissionGuardProps {
  children: ReactNode;
  requiredPermissions?: string[];
  allowedRoles?: Array<'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN'>;
  requireAll?: boolean;
  fallback?: ReactNode;
  featureId?: string;
  showFallbackMessage?: boolean;
}

interface FieldGuardProps {
  children: ReactNode;
  formType: string;
  fieldName: string;
  fallback?: ReactNode;
}

interface WidgetGuardProps {
  children: ReactNode;
  widgetId: string;
  fallback?: ReactNode;
}

interface QuickActionGuardProps {
  children: ReactNode;
  actionId: string;
  fallback?: ReactNode;
}

interface RoleInterfaceGuardProps {
  children: ReactNode;
  interfaceElement: 'navigation' | 'dashboard' | 'form' | 'widget' | 'quickAction';
  elementId?: string;
  formType?: string;
  fieldName?: string;
  fallback?: ReactNode;
}

export function PermissionGuard({ 
  children, 
  requiredPermissions = [],
  allowedRoles = [],
  requireAll = true,
  fallback = null,
  featureId,
  showFallbackMessage = false
}: PermissionGuardProps) {
  const { activeRole, hasPermission } = useRoleContext();
  const { currentInterface } = useRoleInterface();

  // Check role access
  if (allowedRoles.length > 0 && activeRole) {
    if (!allowedRoles.includes(activeRole.name)) {
      return showFallbackMessage ? (
        <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg border">
          This feature is not available for your current role.
        </div>
      ) : <>{fallback}</>;
    }
  }

  // Check permissions
  if (requiredPermissions.length > 0) {
    const hasAccess = requireAll
      ? requiredPermissions.every(permission => {
          const [resource, action] = permission.split(':');
          return hasPermission(resource, action);
        })
      : requiredPermissions.some(permission => {
          const [resource, action] = permission.split(':');
          return hasPermission(resource, action);
        });

    if (!hasAccess) {
      return showFallbackMessage ? (
        <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg border">
          You don&apos;t have permission to access this feature.
        </div>
      ) : <>{fallback}</>;
    }
  }

  // Check feature visibility in role interface
  if (featureId && currentInterface) {
    const isFeatureHidden = currentInterface.dashboard.hiddenWidgets?.includes(featureId) ||
                           currentInterface.navigation.hiddenSections?.includes(featureId);
    
    if (isFeatureHidden) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

export function FieldGuard({ children, formType, fieldName, fallback = null }: FieldGuardProps) {
  const { isFieldVisible } = useRoleInterface();
  
  if (!isFieldVisible(formType, fieldName)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

export function WidgetGuard({ children, widgetId, fallback = null }: WidgetGuardProps) {
  const { hasWidgetAccess } = useRoleInterface();
  
  if (!hasWidgetAccess(widgetId)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

export function QuickActionGuard({ children, actionId, fallback = null }: QuickActionGuardProps) {
  const { canPerformQuickAction } = useRoleInterface();
  
  if (!canPerformQuickAction(actionId)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

export function RoleInterfaceGuard({
  children,
  interfaceElement,
  elementId,
  formType,
  fieldName,
  fallback = null
}: RoleInterfaceGuardProps) {
  const { currentInterface, hasWidgetAccess, canPerformQuickAction, isFieldVisible } = useRoleInterface();
  
  if (!currentInterface) {
    return <>{fallback}</>;
  }

  switch (interfaceElement) {
    case 'navigation':
      if (elementId && currentInterface.navigation.hiddenSections?.includes(elementId)) {
        return <>{fallback}</>;
      }
      break;

    case 'dashboard':
      if (elementId && currentInterface.dashboard.hiddenWidgets?.includes(elementId)) {
        return <>{fallback}</>;
      }
      break;

    case 'widget':
      if (elementId && !hasWidgetAccess(elementId)) {
        return <>{fallback}</>;
      }
      break;

    case 'quickAction':
      if (elementId && !canPerformQuickAction(elementId)) {
        return <>{fallback}</>;
      }
      break;

    case 'form':
      if (formType && fieldName && !isFieldVisible(formType, fieldName)) {
        return <>{fallback}</>;
      }
      break;

    default:
      break;
  }

  return <>{children}</>;
}

interface ConditionalRenderProps {
  condition: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ConditionalRender({ condition, children, fallback = null }: ConditionalRenderProps) {
  return condition ? <>{children}</> : <>{fallback}</>;
}

interface LoadingGuardProps {
  children: ReactNode;
  isLoading: boolean;
  fallback?: ReactNode;
}

export function LoadingGuard({ children, isLoading, fallback }: LoadingGuardProps) {
  if (isLoading) {
    return fallback ? <>{fallback}</> : (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }
  
  return <>{children}</>;
}

export function ErrorGuard({ 
  children, 
  error, 
  fallback,
  showRetry = false,
  onRetry
}: {
  children: ReactNode;
  error: string | null;
  fallback?: ReactNode;
  showRetry?: boolean;
  onRetry?: () => void;
}) {
  if (error) {
    return fallback ? <>{fallback}</> : (
      <div className="p-4 text-center text-red-600 bg-red-50 rounded-lg border border-red-200">
        <p className="mb-2">Error: {error}</p>
        {showRetry && onRetry && (
          <button 
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }
  
  return <>{children}</>;
}