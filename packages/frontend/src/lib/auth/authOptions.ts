import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import prisma from "../prisma";
import bcrypt from "bcryptjs";

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
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: {
              roles: true,
              activeRole: true,
            },
          });

          if (!user || !user.isActive) {
            return null;
          }

          // For now, we'll create a simple password validation
          // In production, this should check against a hashed password
          const isValidPassword = credentials.password === "admin123"; // Temporary for development
          
          if (!isValidPassword) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            roles: user.roles.map(role => ({
              id: role.id,
              name: role.name,
              isActive: role.isActive
            })),
            activeRole: user.activeRole || user.roles[0] || null,
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
    jwt: async ({ token, user, account }) => {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.roles = user.roles || [];
        token.activeRole = user.activeRole || null;
        token.permissions = user.permissions || [];
      }

      // For GitHub OAuth, ensure user has roles
      if (account?.provider === 'github' && user) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
              roles: true,
              activeRole: true,
            },
          });

          if (dbUser) {
            token.roles = dbUser.roles;
            token.activeRole = dbUser.activeRole || dbUser.roles[0] || null;
          } else {
            // Assign default role for new GitHub users
            const defaultRole = await prisma.role.findUnique({
              where: { name: 'ASSESSOR' }
            });

            if (defaultRole) {
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  roles: {
                    connect: { id: defaultRole.id }
                  },
                  activeRoleId: defaultRole.id
                }
              });
              token.roles = [defaultRole];
              token.activeRole = defaultRole;
            }
          }
        } catch (error) {
          console.error('Error setting up user roles:', error);
        }
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = (token.activeRole as any)?.name || 'ASSESSOR';
        session.user.roles = token.roles as any[] || [];
        session.user.activeRole = token.activeRole as any;
        session.user.permissions = token.permissions as any[] || [];
      }

      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};