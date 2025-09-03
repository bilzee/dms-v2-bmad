import { useSession } from 'next-auth/react';
import { User } from '@dms/shared';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export const useAuth = (): AuthState => {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return {
      user: null,
      isLoading: true,
      error: null,
    };
  }

  if (status === 'unauthenticated' || !session?.user) {
    return {
      user: null,
      isLoading: false,
      error: null,
    };
  }

  const user: User = {
    id: session.user.id,
    email: session.user.email || '',
    name: session.user.name || '',
    phone: undefined,
    organization: session.user.organization,
    roles: session.user.assignedRoles,
    activeRole: session.user.activeRole,
    permissions: session.user.permissions,
    lastSync: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    user,
    isLoading: false,
    error: null,
  };
};