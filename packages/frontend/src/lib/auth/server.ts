import NextAuth from "next-auth";
import { authOptions } from "./authOptions";

// Create NextAuth instance for server-side usage
const nextAuth = NextAuth(authOptions);

// Export the auth function for server-side session checking
export const auth = nextAuth.auth;
export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;