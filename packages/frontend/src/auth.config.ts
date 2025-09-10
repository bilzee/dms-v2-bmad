import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";

export const authConfig = {
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

        // For development purposes, allow a simple test user
        if (credentials.email === "admin@test.com" && credentials.password === "admin123") {
          return {
            id: "test-user-id",
            name: "Test Admin",
            email: "admin@test.com",
            role: "ADMIN",
            roles: [{ 
              id: "admin-role", 
              name: "ADMIN", 
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            }],
            activeRole: { 
              id: "admin-role", 
              name: "ADMIN", 
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            permissions: [],
          };
        }

        return null;
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      // Persist role information in JWT
      if (user) {
        token.id = user.id;
        token.roles = (user as any).roles || [];
        token.activeRole = (user as any).activeRole || null;
        token.permissions = (user as any).permissions || [];
      }
      return token;
    },
    session({ session, token }) {
      // Pass role info to session for middleware and components
      if (token) {
        session.user.id = token.id as string;
        session.user.roles = token.roles as any[] || [];
        session.user.activeRole = token.activeRole as any;
        session.user.role = (token.activeRole as any)?.name || 'ASSESSOR';
        session.user.permissions = token.permissions as any[] || [];
      }
      return session;
    },
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