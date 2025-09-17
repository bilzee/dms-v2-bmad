import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";

export const authConfig = {
  // Add Prisma adapter
  adapter: PrismaAdapter(prisma),
  
  providers: [
    // GitHub provider for development
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
    // Credentials provider for multi-role authentication  
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Development test users for all roles
        const testUsers = [
          // Original test users
          {
            email: "admin@test.com",
            password: "admin123",
            id: "admin-user-id",
            name: "Test Admin",
            role: "ADMIN"
          },
          {
            email: "assessor@test.com", 
            password: "assessor123",
            id: "assessor-user-id",
            name: "Test Assessor",
            role: "ASSESSOR"
          },
          {
            email: "responder@test.com",
            password: "responder123", 
            id: "responder-user-id",
            name: "Test Responder",
            role: "RESPONDER"
          },
          {
            email: "coordinator@test.com",
            password: "coordinator123",
            id: "coordinator-user-id", 
            name: "Test Coordinator",
            role: "COORDINATOR"
          },
          {
            email: "verifier@test.com",
            password: "verifier123",
            id: "verifier-user-id",
            name: "Test Verifier", 
            role: "VERIFIER"
          },
          {
            email: "donor@test.com",
            password: "donor123",
            id: "donor-user-id",
            name: "Test Donor",
            role: "DONOR"
          },
          {
            email: "superuser@test.com", 
            password: "superuser123",
            id: "superuser-user-id",
            name: "Super User (Multi-Role)",
            role: "ADMIN", // Primary role
            allRoles: ["ADMIN", "COORDINATOR", "ASSESSOR", "RESPONDER", "VERIFIER", "DONOR"]
          },
          // Alternative test users with -alt suffix (created in database)
          {
            email: "admin-alt@test.com",
            password: "admin123",
            id: "admin-user-id-alt",
            name: "Test Admin (Alt)",
            role: "ADMIN"
          },
          {
            email: "assessor-alt@test.com", 
            password: "assessor123",
            id: "assessor-user-id-alt",
            name: "Test Assessor (Alt)",
            role: "ASSESSOR"
          },
          {
            email: "responder-alt@test.com",
            password: "responder123", 
            id: "responder-user-id-alt",
            name: "Test Responder (Alt)",
            role: "RESPONDER"
          },
          {
            email: "coordinator-alt@test.com",
            password: "coordinator123",
            id: "coordinator-user-id-alt", 
            name: "Test Coordinator (Alt)",
            role: "COORDINATOR"
          },
          {
            email: "verifier-alt@test.com",
            password: "verifier123",
            id: "verifier-user-id-alt",
            name: "Test Verifier (Alt)", 
            role: "VERIFIER"
          },
          {
            email: "donor-alt@test.com",
            password: "donor123",
            id: "donor-user-id-alt",
            name: "Test Donor (Alt)",
            role: "DONOR"
          },
          {
            email: "superuser-alt@test.com", 
            password: "superuser123",
            id: "superuser-user-id-alt",
            name: "Super User (Multi-Role) (Alt)",
            role: "ADMIN", // Primary role
            allRoles: ["ADMIN", "COORDINATOR", "ASSESSOR", "RESPONDER", "VERIFIER", "DONOR"]
          }
        ];

        const testUser = testUsers.find(user => 
          credentials.email === user.email && credentials.password === user.password
        );

        // Generate role-based default permissions
        const generateRolePermissions = (role: string): string[] => {
          const basePermissions = ['profile:read', 'profile:update'];
          
          switch (role) {
            case 'ADMIN':
              return [
                ...basePermissions,
                'users:manage', 'roles:manage', 'system:monitor', 'audit:read',
                'assessments:read', 'assessments:create', 'assessments:update', 'assessments:delete',
                'responses:read', 'responses:create', 'responses:update', 'responses:delete',
                'entities:read', 'entities:create', 'entities:update', 'entities:delete',
                'verification:read', 'verification:approve', 'verification:reject',
                'config:manage', 'monitoring:read', 'incidents:manage',
                'donors:coordinate', 'resources:plan', 'conflicts:resolve',
                'sync:configure', 'queue:read'
              ];
            
            case 'COORDINATOR':
              return [
                ...basePermissions,
                'assessments:read', 'assessments:update',
                'responses:read', 'responses:review',
                'entities:read', 'entities:update',
                'verification:read', 'verification:approve',
                'config:manage', 'monitoring:read', 'incidents:manage',
                'donors:coordinate', 'resources:plan', 'conflicts:resolve',
                'sync:configure'
              ];
            
            case 'ASSESSOR':
              return [
                ...basePermissions,
                'assessments:read', 'assessments:create', 'assessments:update',
                'entities:read', 'entities:create',
                'queue:read'
              ];
            
            case 'RESPONDER':
              return [
                ...basePermissions,
                'responses:read', 'responses:create', 'responses:update',
                'responses:plan', 'responses:track', 'responses:review'
              ];
            
            case 'VERIFIER':
              return [
                ...basePermissions,
                'verification:read', 'verification:review', 'verification:approve',
                'assessments:read', 'responses:read'
              ];
            
            case 'DONOR':
              return [
                ...basePermissions,
                'donations:plan', 'donations:commit', 'donations:track'
              ];
            
            default:
              return basePermissions;
          }
        };

        if (testUser) {
          // Check if user has multiple roles (for superuser)
          const userRoles = (testUser as any).allRoles || [testUser.role];
          
          // Generate permissions for primary role
          const rolePermissions = generateRolePermissions(testUser.role);
          
          return {
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            role: testUser.role,
            roles: userRoles.map((roleName: string) => ({ 
              id: `${roleName.toLowerCase()}-role`, 
              name: roleName, 
              isActive: roleName === testUser.role,
              createdAt: new Date(),
              updatedAt: new Date()
            })),
            activeRole: { 
              id: `${testUser.role.toLowerCase()}-role`, 
              name: testUser.role, 
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            permissions: rolePermissions, // Use generated permissions instead of empty array
            allRoles: userRoles
          };
        }

        return null;
      }
    })
  ],
  callbacks: {
    // Add signIn callback for database synchronization
    async signIn({ user, account, profile }) {
      console.log('SignIn callback triggered:', { 
        userId: user.id, 
        email: user.email, 
        accountType: account?.type 
      });

      // For credentials provider, ensure test users exist in database
      if (account?.type === "credentials") {
        await ensureTestUserExists(user);
      }
      
      return true;
    },
    
    jwt({ token, user, trigger, session }) {
      // Handle session updates for role switching
      if (trigger === "update" && session?.user) {
        // When role switching, merge the new role data into token
        if (session.user.activeRole) {
          token.activeRole = session.user.activeRole;
          token.role = session.user.activeRole.name;
        }
        if (session.user.roles) {
          token.roles = session.user.roles;
        }
        if (session.user.permissions) {
          token.permissions = session.user.permissions;
        }
        if (session.user.allRoles) {
          token.allRoles = session.user.allRoles;
        }
        return token;
      }
      
      // Persist role information in JWT for new logins
      if (user) {
        token.id = user.id;
        token.roles = (user as any).roles || [];
        token.activeRole = (user as any).activeRole || null;
        token.permissions = (user as any).permissions || [];
        token.allRoles = (user as any).allRoles || [];
      }
      return token;
    },
    async session({ session, token }) {
      // Ensure consistent session structure for all roles
      if (token && session.user) {
        session.user.id = token.id as string;
        
        // CRITICAL: NO DATABASE QUERIES IN SESSION CALLBACK 
        // (Edge Runtime incompatible with Prisma Client)
        
        // Use token data only - database sync happens elsewhere
        session.user.roles = token.roles as any[] || [];
        session.user.activeRole = token.activeRole as any;
        session.user.role = (token.activeRole as any)?.name || token.role || 'ASSESSOR';
        session.user.permissions = token.permissions as any[] || [];
        session.user.allRoles = token.allRoles as string[] || [];
      }
      return session;
    },
    // Post-login redirection - always return to home page or callback URL
    async redirect({ url, baseUrl }) {
      // If there's a callback URL in the signin URL, use it
      if (url.includes('/auth/signin') && url.includes('callbackUrl=')) {
        const urlParams = new URL(url);
        const callbackUrl = urlParams.searchParams.get('callbackUrl');
        if (callbackUrl && callbackUrl.startsWith('/')) {
          return `${baseUrl}${callbackUrl}`;
        }
      }
      
      // Default: redirect to home page after login
      if (url.includes('/auth/signin')) {
        return baseUrl;
      }
      
      // For other redirects, use default behavior
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 24 * 60 * 60, // 24 hours
  },
} satisfies NextAuthConfig;

// Helper function to ensure test users exist in database
async function ensureTestUserExists(authUser: any) {
  const testUsers = [
    {
      id: "admin-user-id",
      name: "Test Admin",
      email: "admin@test.com",
      roles: ["ADMIN"]
    },
    {
      id: "coordinator-user-id", 
      name: "Test Coordinator",
      email: "coordinator@test.com",
      roles: ["COORDINATOR"]
    },
    {
      id: "assessor-user-id",
      name: "Test Assessor", 
      email: "assessor@test.com",
      roles: ["ASSESSOR"]
    },
    {
      id: "responder-user-id",
      name: "Test Responder",
      email: "responder@test.com", 
      roles: ["RESPONDER"]
    },
    {
      id: "verifier-user-id",
      name: "Test Verifier",
      email: "verifier@test.com",
      roles: ["VERIFIER"]
    },
    {
      id: "donor-user-id",
      name: "Test Donor",
      email: "donor@test.com",
      roles: ["DONOR"]
    },
    {
      id: "superuser-user-id",
      name: "Super User (Multi-Role)", 
      email: "superuser@test.com",
      roles: ["ADMIN", "COORDINATOR", "ASSESSOR", "RESPONDER", "VERIFIER", "DONOR"]
    }
  ];

  const testUser = testUsers.find(tu => tu.email === authUser.email);
  
  if (testUser) {
    console.log('Ensuring test user exists in database:', testUser.email);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: testUser.id }
    });
    
    if (!existingUser) {
      console.log('Creating test user in database:', testUser.email);
      
      // Create user in transaction
      await prisma.$transaction(async (tx) => {
        // Create user
        const createdUser = await tx.user.create({
          data: {
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            isActive: true
          }
        });

        // Create or connect to roles with consistent IDs that match frontend expectations
        const userRoles = [];
        for (const roleName of testUser.roles) {
          const roleId = `${roleName.toLowerCase()}-role`; // Consistent with auth.config.ts
          
          // Try to find existing role first
          let role = await tx.role.findUnique({
            where: { id: roleId }
          });
          
          if (!role) {
            // Create role if it doesn't exist
            role = await tx.role.create({
              data: {
                id: roleId,
                name: roleName,
                isActive: true,
                permissions: {
                  create: [] // Empty permissions for now - can be populated later
                }
              }
            });
            console.log(`Created new role: ${roleName}`);
          } else {
            console.log(`Found existing role: ${roleName}`);
          }
          
          // Connect user to role
          await tx.role.update({
            where: { id: roleId },
            data: {
              users: {
                connect: { id: createdUser.id }
              }
            }
          });
          
          userRoles.push(role);
        }
        
        // Set first role as active
        if (userRoles.length > 0) {
          await tx.user.update({
            where: { id: createdUser.id },
            data: { activeRoleId: userRoles[0].id }
          });
        }
      });
      
      console.log(`✅ Test user created in database: ${testUser.email}`);
    } else {
      console.log('Test user already exists in database:', testUser.email);
    }
  }
}