import NextAuth, { User, Session } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { JWT } from "next-auth/jwt";
import { AdapterUser } from "next-auth/adapters";
import prisma from "../prisma";
import * as bcrypt from "bcryptjs";
import type { Role, User as PrismaUser } from "@prisma/client";

export const authOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    // GitHub provider for development
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
    // Credentials provider for multi-role authentication
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Find user with roles
          const userWithRoles = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            include: {
              roles: true,
              activeRole: true,
            },
          });

          if (!userWithRoles || !userWithRoles.isActive) {
            return null;
          }

          // For now, we'll create a simple password validation
          // In production, this should check against a hashed password
          const isValidPassword = credentials.password === "admin123"; // Temporary for development
          
          if (!isValidPassword) {
            return null;
          }

          // Cast userWithRoles to include the relations
          const userWithIncludedRoles = userWithRoles as typeof userWithRoles & {
            roles: Role[];
            activeRole: Role | null;
          };

          return {
            id: userWithIncludedRoles.id,
            name: userWithIncludedRoles.name,
            email: userWithIncludedRoles.email,
            image: userWithIncludedRoles.image,
            roles: userWithIncludedRoles.roles?.map((role: Role) => ({
              id: role.id,
              name: role.name,
              isActive: role.isActive
            })) || [],
            activeRole: userWithIncludedRoles.activeRole || (userWithIncludedRoles.roles?.[0] || null),
            activeRoleId: userWithIncludedRoles.activeRoleId,
            permissions: [], // Will be populated based on role
          } as any;
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    jwt: async ({ token, user }: { token: JWT; user?: User | AdapterUser }) => {
      // Initial sign in - fetch user data from database
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            roles: true,
            activeRole: true,
          },
        });

        if (dbUser) {
          // Cast dbUser to include the relations
          const dbUserWithIncludedRoles = dbUser as typeof dbUser & {
            roles: Role[];
            activeRole: Role | null;
          };

          token.id = dbUserWithIncludedRoles.id;
          token.roles = dbUserWithIncludedRoles.roles || [];
          token.activeRole = dbUserWithIncludedRoles.activeRole || (dbUserWithIncludedRoles.roles?.[0] || null);
          token.activeRoleId = dbUserWithIncludedRoles.activeRoleId;
          token.role = dbUserWithIncludedRoles.activeRole?.name || (dbUserWithIncludedRoles.roles?.[0]?.name || 'ASSESSOR');
          token.permissions = []; // Will be populated based on role
        }
      }
      return token;
    },
    session: async ({ session, token }: { session: Session; token: JWT }) => {
      if (token) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).roles = token.roles;
        (session.user as any).activeRole = token.activeRole;
        (session.user as any).activeRoleId = token.activeRoleId;
        (session.user as any).permissions = token.permissions;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};