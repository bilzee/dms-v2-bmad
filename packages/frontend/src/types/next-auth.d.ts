import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      assignedRoles: UserRole[];
      activeRole: UserRole | null;
      permissions: Permission[];
      organization?: string;
    } & DefaultSession["user"]
  }

  interface User {
    id: string;
    organization?: string;
  }
}

interface UserRole {
  id: string;
  name: 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN';
  permissions: Permission[];
  isActive: boolean;
}

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}