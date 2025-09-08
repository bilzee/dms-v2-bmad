// NextAuth v5 TypeScript declarations
import NextAuth, { DefaultSession } from "next-auth"
import { Role } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      roles: Role[]
      activeRole: Role | null
      permissions: string[]
    } & DefaultSession["user"]
  }
  
  interface User {
    id: string
    role: string
    roles: Role[]
    activeRole: Role | null
    permissions: string[]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    roles: Role[]
    activeRole: Role | null
    permissions: string[]
  }
}