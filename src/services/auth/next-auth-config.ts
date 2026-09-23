/**
 * NextAuth v4 config with Prisma adapter + Credentials provider.
 *
 * In production: replace Credentials with Google/GitHub OAuth (more secure
 * than passwords). Credentials is included so the app works end-to-end
 * without third-party OAuth setup.
 */
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// Prisma adapter expects a slightly different client shape; we use the
// direct approach instead because our schema is custom.
export const authOptions: NextAuthOptions = {
  // @ts-expect-error — adapter typing mismatch with our custom prisma client
  // is acceptable; we don't rely on adapter for accounts since we use Credentials.
  adapter: undefined,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();

        const user = await db.user.findUnique({ where: { email } });
        // Sign-up flow: if no user, create one (DEMO ONLY — in production, separate sign-up).
        // For security, gate this behind an env flag.
        if (!user) {
          if (env.NODE_ENV === "production" && !process.env.ALLOW_SIGNUP_VIA_SIGNIN) {
            return null;
          }
          const passwordHash = await bcrypt.hash(credentials.password, 12);
          const created = await db.user.create({
            data: {
              email,
              name: email.split("@")[0],
              passwordHash,
            },
          });
          return { id: created.id, email: created.email, name: created.name };
        }

        if (!user.passwordHash) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
  secret: env.NEXTAUTH_SECRET,
};

/** Augment NextAuth types — declares `user.id` on Session["user"]. */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
