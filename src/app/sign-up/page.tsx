import { Suspense } from "react";
import { SignUpForm } from "./sign-up-form";

// Force this route to be dynamic. NextAuth v4 reads NEXTAUTH_URL at module
// load time, which fails during static prerendering when the env var is not
// available at build time.
export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}
