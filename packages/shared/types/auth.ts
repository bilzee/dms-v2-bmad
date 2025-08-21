// Authentication types
export interface AuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    activeRole: string;
  };
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  organization?: string;
}