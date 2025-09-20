'use client';

import { useEffect } from 'react';

export function MockAuthInitializer() {
  useEffect(() => {
    // Initialize mock user context for development
    const mockUserContext = {
      userId: 'superuser-user-id-alt',
      email: 'superuser-alt@test.com',
      name: 'Super User (Multi-Role) (Alt)',
      activeRole: {
        id: 'coordinator-role',
        name: 'COORDINATOR',
        isActive: true
      },
      roles: [
        {
          id: 'admin-role',
          name: 'ADMIN',
          isActive: false
        },
        {
          id: 'coordinator-role',
          name: 'COORDINATOR',
          isActive: true
        },
        {
          id: 'assessor-role',
          name: 'ASSESSOR',
          isActive: false
        },
        {
          id: 'responder-role',
          name: 'RESPONDER',
          isActive: false
        },
        {
          id: 'verifier-role',
          name: 'VERIFIER',
          isActive: false
        },
        {
          id: 'donor-role',
          name: 'DONOR',
          isActive: false
        }
      ],
      token: 'mock-token-superuser-coordinator-dev'
    };

    // Store in localStorage for auth utilities to use
    localStorage.setItem('mock-user-context', JSON.stringify(mockUserContext));
    localStorage.setItem('user-info', JSON.stringify({
      id: mockUserContext.userId,
      email: mockUserContext.email,
      name: mockUserContext.name,
      activeRole: mockUserContext.activeRole,
      role: mockUserContext.activeRole.name
    }));

    console.log('Mock user context initialized for development');
  }, []);

  return null;
}