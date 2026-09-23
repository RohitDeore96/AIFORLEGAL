import Link from "next/link";
import { Logo } from "@/components/common/logo";

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Logo />
          <p className="text-xs text-muted-foreground max-w-md">
            LegalLens AI provides document-grounded legal information. It is not a substitute for advice from a qualified legal professional.
          </p>
        </div>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/#features" className="hover:text-foreground">
            Features
          </Link>
          <Link href="/#security" className="hover:text-foreground">
            Security
          </Link>
          <Link href="/sign-in" className="hover:text-foreground">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
