/**
 * Auth helpers — server-side only.
 */
import { getServerSession } from "next-auth/next";
import { authOptions } from "./next-auth-config";
import type { Session } from "next-auth";

export async function getSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) {
    const { Errors } = await import("@/lib/errors");
    throw Errors.unauthorized();
  }
  return session.user.id;
}
