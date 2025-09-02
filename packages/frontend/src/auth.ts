import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "./lib/prisma"
import GitHub from "next-auth/providers/github"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          roles: true,
          activeRole: true,
        },
      });

      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          role: dbUser?.activeRole?.name || dbUser?.roles[0]?.name || 'ASSESSOR',
          assignedRoles: dbUser?.roles || [],
          activeRole: dbUser?.activeRole || dbUser?.roles[0] || null,
          permissions: [],
          organization: user.organization,
        },
      };
    },
  },
})