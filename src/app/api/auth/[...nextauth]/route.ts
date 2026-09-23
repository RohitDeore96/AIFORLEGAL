/**
 * NextAuth route handler — mounts NextAuth at /api/auth/[...nextauth].
 */
import NextAuth from "next-auth";
import { authOptions } from "@/services/auth/next-auth-config";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
