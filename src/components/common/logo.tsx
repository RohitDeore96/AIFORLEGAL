import { Scale } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  withText = true,
  href = "/",
}: {
  className?: string;
  withText?: boolean;
  href?: string | null;
}) {
  const content = (
    <span className={cn("flex items-center gap-2 font-semibold", className)}>
      <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
        <Scale className="size-5" aria-hidden="true" />
      </span>
      {withText ? (
        <span className="text-base">
          Legal<span className="text-primary">Lens</span>
        </span>
      ) : null}
    </span>
  );
  if (href) {
    return (
      <Link href={href} className="inline-flex">
        {content}
      </Link>
    );
  }
  return content;
}
