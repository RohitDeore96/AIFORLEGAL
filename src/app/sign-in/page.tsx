import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

// Force this route to be dynamic. NextAuth v4 reads NEXTAUTH_URL at module
// load time, which fails during static prerendering when the env var is not
// available at build time. Marking dynamic skips prerender entirely.
export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
