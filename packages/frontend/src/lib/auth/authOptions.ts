import NextAuth, { NextAuthOptions, User, Session } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { JWT } from "next-auth/jwt";
import { AdapterUser } from "next-auth/adapters";
import prisma from "../prisma";
import bcrypt from "bcryptjs";
import type { Role, User as PrismaUser } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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
            where: { email: credentials.email },
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

          return {
            id: userWithRoles.id,
            name: userWithRoles.name,
            email: userWithRoles.email,
            image: userWithRoles.image,
            roles: userWithRoles.roles?.map((role: Role) => ({
              id: role.id,
              name: role.name,
              isActive: role.isActive
            })) || [],
            activeRole: userWithRoles.activeRole || (userWithRoles.roles && userWithRoles.roles[0]) || null,
            permissions: [], // Will be populated based on role
          };
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
          token.id = dbUser.id;
          token.roles = dbUser.roles || [];
          token.activeRole = dbUser.activeRole || (dbUser.roles?.[0] || null);
          token.role = dbUser.activeRole?.name || dbUser.roles?.[0]?.name || 'ASSESSOR';
          token.permissions = []; // Will be populated based on role
        }
      }
      return token;
    },
    session: async ({ session, token }: { session: Session; token: JWT }) => {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.roles = token.roles;
        session.user.activeRole = token.activeRole;
        session.user.permissions = token.permissions;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};