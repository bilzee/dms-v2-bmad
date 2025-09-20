// Authentication utilities for API calls
export interface ApiAuthConfig {
  headers: Record<string, string>;
}

/**
 * Get authentication headers for API requests
 * This handles both NextAuth and mock authentication
 */
export function getApiAuthHeaders(): ApiAuthConfig {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Try to get mock user context from localStorage for development
  if (typeof window !== 'undefined') {
    try {
      const mockUserContext = localStorage.getItem('mock-user-context');
      if (mockUserContext) {
        const userContext = JSON.parse(mockUserContext);
        if (userContext.token) {
          headers['Authorization'] = `Bearer ${userContext.token}`;
          return { headers };
        }
      }

      // If no mock context, check if we have user info from the UI
      const userInfo = localStorage.getItem('user-info');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        // Create a token based on the user role
        const token = `mock-token-${user.activeRole?.name?.toLowerCase() || 'coordinator'}-${Date.now()}`;
        headers['Authorization'] = `Bearer ${token}`;
        return { headers };
      }

      // Default to coordinator token for development
      headers['Authorization'] = 'Bearer mock-token-coordinator-dev';
    } catch (error) {
      console.warn('Failed to get auth headers from localStorage, using default:', error);
      headers['Authorization'] = 'Bearer mock-token-coordinator-dev';
    }
  }

  return { headers };
}

/**
 * Add authentication headers to fetch options
 */
export function withAuth(options: RequestInit = {}): RequestInit {
  const { headers } = getApiAuthHeaders();
  
  // Merge headers, with existing options taking precedence
  const mergedHeaders = { ...headers };
  if (options.headers) {
    if (typeof options.headers === 'object') {
      Object.assign(mergedHeaders, options.headers);
    }
  }
  
  return {
    ...options,
    headers: mergedHeaders,
  };
}

/**
 * Make an authenticated fetch request
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  console.log('authFetch called with URL:', url);
  console.log('authFetch options:', options);
  const authOptions = withAuth(options);
  console.log('authFetch authOptions:', authOptions);
  const response = fetch(url, authOptions);
  console.log('authFetch response promise:', response);
  return response;
}